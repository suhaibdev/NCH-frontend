import React, { useState } from "react";

import api from "../../config/axios";
import { formatPaise, rupeesToPaise } from "../../utils/gst";
import {
  PAYMENT_METHODS,
  formatDateOnly,
  formatTimestamp,
  getBusinessToday,
  paymentMethodLabel,
} from "../../utils/estimates";

import "../Estimates/Estimates.css";

const emptyPayment = () => ({
  amount: "",
  paymentDate: getBusinessToday(),
  method: "cash",
  reference: "",
  notes: "",
});

/*
 * Payments section shared by Estimate and Invoice detail pages: record a
 * payment, list payments (voided ones stay listed) and void a payment.
 * The backend is authoritative for every rule; each successful call returns
 * the full document detail, which is handed to `onUpdated`.
 *
 * Props:
 *   apiBase     e.g. "/estimates/<id>" or "/invoices/<id>"
 *   documentDate the document's date (payments cannot be dated before it)
 *   isActive    payments and voids only on active documents
 *   payments, summary  from the detail response
 *   description text under the "Payments" heading
 *   disabled    parent is busy (e.g. cancelling)
 *   onUpdated(data, message)
 */
const DocumentPayments = ({
  apiBase,
  documentDate,
  isActive,
  payments,
  summary,
  description,
  disabled = false,
  onUpdated,
}) => {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [paymentError, setPaymentError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const busy = disabled || isRecording || isVoiding;

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    setPaymentError("");

    const amountPaise = rupeesToPaise(paymentForm.amount);
    if (!amountPaise) {
      setPaymentError("Enter an amount greater than zero with up to 2 decimals.");
      return;
    }
    if (amountPaise > summary.outstandingPaise) {
      setPaymentError(
        `Payment cannot exceed the outstanding balance of ${formatPaise(summary.outstandingPaise)}.`
      );
      return;
    }

    try {
      setIsRecording(true);
      const response = await api.post(`${apiBase}/payments`, {
        ...paymentForm,
        amount: paymentForm.amount.trim(),
        reference: paymentForm.reference.trim(),
        notes: paymentForm.notes.trim(),
      });
      onUpdated(
        response.data,
        `Payment of ${formatPaise(amountPaise)} recorded. Outstanding: ${formatPaise(
          response.data.summary?.outstandingPaise
        )}.`
      );
      setShowPayment(false);
      setPaymentForm(emptyPayment());
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Unable to record payment.");
    } finally {
      setIsRecording(false);
    }
  };

  const handleVoid = async (event, paymentId) => {
    event.preventDefault();
    if (!voidReason.trim()) {
      setVoidError("Enter a reason for voiding the payment.");
      return;
    }
    try {
      setIsVoiding(true);
      setVoidError("");
      const response = await api.post(`${apiBase}/payments/${paymentId}/void`, {
        reason: voidReason.trim(),
      });
      onUpdated(response.data);
      setVoidingId(null);
      setVoidReason("");
    } catch (err) {
      setVoidError(err.response?.data?.message || "Unable to void payment.");
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <section className="est-card">
      <div className="est-card-header">
        <div>
          <h2>Payments</h2>
          <p>{description}</p>
        </div>
        {isActive && summary.outstandingPaise > 0 && !showPayment && (
          <button
            type="button"
            className="ep-btn ep-btn-primary"
            onClick={() => {
              setShowPayment(true);
              setPaymentError("");
            }}
            disabled={busy}
          >
            Record Payment
          </button>
        )}
      </div>

      {voidError && (
        <div className="est-inline-panel">
          <div className="est-message error">{voidError}</div>
        </div>
      )}

      {showPayment && isActive && (
        <form className="est-inline-panel" onSubmit={handleRecordPayment} noValidate>
          <div className="est-payment-grid">
            <div className="est-field">
              <label htmlFor="doc-pay-amount">Amount (₹)</label>
              <input
                id="doc-pay-amount"
                type="text"
                inputMode="decimal"
                className="ep-input"
                placeholder={`Up to ${formatPaise(summary.outstandingPaise)}`}
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    amount: event.target.value.replace(/[^\d.]/g, ""),
                  }))
                }
                disabled={isRecording}
              />
            </div>
            <div className="est-field">
              <label htmlFor="doc-pay-date">Payment Date</label>
              <input
                id="doc-pay-date"
                type="date"
                className="ep-input"
                min={String(documentDate || "").slice(0, 10)}
                max={getBusinessToday()}
                value={paymentForm.paymentDate}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))
                }
                disabled={isRecording}
              />
            </div>
            <div className="est-field">
              <label htmlFor="doc-pay-method">Method</label>
              <select
                id="doc-pay-method"
                className="ep-input"
                value={paymentForm.method}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, method: event.target.value }))
                }
                disabled={isRecording}
              >
                {PAYMENT_METHODS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="est-field">
              <label htmlFor="doc-pay-reference">Reference</label>
              <input
                id="doc-pay-reference"
                type="text"
                className="ep-input"
                maxLength={150}
                placeholder="UTR, cheque no. (optional)"
                value={paymentForm.reference}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, reference: event.target.value }))
                }
                disabled={isRecording}
              />
            </div>
            <div className="est-field">
              <label htmlFor="doc-pay-notes">Notes</label>
              <input
                id="doc-pay-notes"
                type="text"
                className="ep-input"
                maxLength={500}
                value={paymentForm.notes}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                disabled={isRecording}
              />
            </div>
          </div>
          {paymentError && <div className="est-message error">{paymentError}</div>}
          <div className="est-form-actions">
            <button type="submit" className="ep-btn ep-btn-primary" disabled={isRecording}>
              {isRecording ? "Recording..." : "Save Payment"}
            </button>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={() => setShowPayment(false)}
              disabled={isRecording}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {payments.length === 0 ? (
        <div className="est-state">No payments recorded.</div>
      ) : (
        <div className="est-table-wrapper">
          <table className="ep-table est-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id} className={payment.voided ? "est-voided" : undefined}>
                  <td className="est-cell-main">{formatDateOnly(payment.paymentDate)}</td>
                  <td className="num est-money est-cell-side">
                    {formatPaise(payment.amountPaise)}
                  </td>
                  <td data-label="Method">{paymentMethodLabel(payment.method)}</td>
                  <td data-label="Reference">
                    {payment.reference || "-"}
                    {payment.notes ? <div className="est-muted">{payment.notes}</div> : null}
                  </td>
                  <td data-label="Status">
                    {payment.voided
                      ? `Voided ${formatTimestamp(payment.voidedAt)}: ${payment.voidReason || "-"}`
                      : "Valid"}
                  </td>
                  <td className="est-cell-full">
                    {!payment.voided && isActive && voidingId !== payment._id && (
                      <button
                        type="button"
                        className="ep-btn ep-btn-delete"
                        onClick={() => {
                          setVoidingId(payment._id);
                          setVoidReason("");
                          setVoidError("");
                        }}
                        disabled={busy}
                      >
                        Void
                      </button>
                    )}
                    {voidingId === payment._id && (
                      <form
                        className="est-void-form"
                        onSubmit={(event) => handleVoid(event, payment._id)}
                      >
                        <input
                          type="text"
                          className="ep-input"
                          placeholder="Reason for voiding"
                          aria-label="Reason for voiding"
                          maxLength={250}
                          value={voidReason}
                          onChange={(event) => setVoidReason(event.target.value)}
                          disabled={isVoiding}
                        />
                        <button type="submit" className="ep-btn ep-btn-delete" disabled={isVoiding}>
                          {isVoiding ? "Voiding..." : "Confirm Void"}
                        </button>
                        <button
                          type="button"
                          className="ep-btn ep-btn-secondary"
                          onClick={() => setVoidingId(null)}
                          disabled={isVoiding}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default DocumentPayments;
