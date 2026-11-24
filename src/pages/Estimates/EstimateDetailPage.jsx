import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise, formatState, rupeesToPaise } from "../../utils/gst";
import {
  PAYMENT_METHODS,
  STATUS_LABELS,
  formatAddress,
  formatDateOnly,
  formatTimestamp,
  getBusinessToday,
  isCanceledRequest,
  paymentMethodLabel,
  unitLabel,
} from "../../utils/estimates";
import EstimatePrint from "./EstimatePrint";

import "../AdminCommon.css";
import "./Estimates.css";

const emptyPayment = () => ({
  amount: "",
  paymentDate: getBusinessToday(),
  method: "cash",
  reference: "",
  notes: "",
});

const EstimateDetailPage = () => {
  const { estimateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [state, setState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);

  const [message, setMessage] = useState(location.state?.message || "");
  const [actionError, setActionError] = useState("");

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [paymentError, setPaymentError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const [printing, setPrinting] = useState(false);
  const finishPrinting = useCallback(() => setPrinting(false), []);

  /* Drop the one-time router message so a refresh does not repeat it. */
  useEffect(() => {
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setState("loading");
        setLoadError("");
        const response = await api.get(`/estimates/${estimateId}`, { signal: controller.signal });
        setDetail(response.data);
        setState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setState("notFound");
          return;
        }
        setLoadError(err.response?.data?.message || "Unable to load estimate.");
        setState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [estimateId, reload]);

  const applyResponse = (data, text) => {
    setDetail({ estimate: data.estimate, payments: data.payments, summary: data.summary });
    setMessage(text || data.message || "");
    setActionError("");
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    if (!cancelReason.trim()) {
      setActionError("Enter a reason for cancelling.");
      return;
    }
    try {
      setIsCancelling(true);
      setActionError("");
      setMessage("");
      const response = await api.post(`/estimates/${estimateId}/cancel`, {
        reason: cancelReason.trim(),
      });
      applyResponse(response.data);
      setShowCancel(false);
      setCancelReason("");
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to cancel estimate.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    setPaymentError("");

    const amountPaise = rupeesToPaise(paymentForm.amount);
    if (!amountPaise) {
      setPaymentError("Enter an amount greater than zero with up to 2 decimals.");
      return;
    }
    if (amountPaise > detail.summary.outstandingPaise) {
      setPaymentError(
        `Payment cannot exceed the outstanding balance of ${formatPaise(detail.summary.outstandingPaise)}.`
      );
      return;
    }

    try {
      setIsRecording(true);
      setMessage("");
      const response = await api.post(`/estimates/${estimateId}/payments`, {
        ...paymentForm,
        amount: paymentForm.amount.trim(),
        reference: paymentForm.reference.trim(),
        notes: paymentForm.notes.trim(),
      });
      applyResponse(
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
      setActionError("Enter a reason for voiding the payment.");
      return;
    }
    try {
      setIsVoiding(true);
      setActionError("");
      setMessage("");
      const response = await api.post(`/estimates/${estimateId}/payments/${paymentId}/void`, {
        reason: voidReason.trim(),
      });
      applyResponse(response.data);
      setVoidingId(null);
      setVoidReason("");
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to void payment.");
    } finally {
      setIsVoiding(false);
    }
  };

  /* ---------- page-level states ---------- */

  if (state === "loading") {
    return <div className="ep-container est-page est-state">Loading estimate...</div>;
  }

  if (state === "notFound" || state === "error") {
    return (
      <div className={`ep-container est-page est-state${state === "error" ? " error" : ""}`}>
        <p>{state === "notFound" ? "Estimate not found." : loadError}</p>
        <div className="est-state-actions">
          <Link to="/admin/estimates" className="ep-btn ep-btn-secondary">
            Back
          </Link>
          {state === "error" && (
            <button
              type="button"
              className="ep-btn ep-btn-primary"
              onClick={() => setReload((value) => value + 1)}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const { estimate, payments, summary } = detail;
  const isActive = estimate.status === "active";
  const customer = estimate.customerSnapshot || {};
  const busy = isCancelling || isRecording || isVoiding;

  const details = [
    ["Customer", customer.billingName || customer.name],
    ["Estimate Date", formatDateOnly(estimate.estimateDate)],
    ["Billing Address", formatAddress(customer.billingAddress)],
    ["State", formatState(customer.stateCode)],
    ["Contact Number", customer.contactNumber],
    ["Notes", estimate.notes],
  ];
  if (estimate.status === "cancelled") {
    details.push(
      ["Cancelled On", formatTimestamp(estimate.cancelledAt)],
      ["Cancel Reason", estimate.cancelReason]
    );
  }

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <Link to="/admin/estimates" className="est-back-link">
            Back
          </Link>
          <h1>
            {estimate.estimateNumber}
            <span className={`est-status ${estimate.status}`}>
              {STATUS_LABELS[estimate.status] || estimate.status}
            </span>
          </h1>
          <p>
            <Link to={`/admin/customers/${estimate.customer}`}>{customer.name}</Link> · No GST
          </p>
        </div>

        <div className="est-header-actions">
          <button
            type="button"
            className="ep-btn ep-btn-secondary"
            onClick={() => {
              // Remount the print view so Print always works, even if a
              // browser never fired "afterprint" for the previous attempt.
              setPrinting(false);
              window.requestAnimationFrame(() => setPrinting(true));
            }}
          >
            Print
          </button>
          {isActive && (
            <>
              <Link to={`/admin/estimates/${estimate._id}/edit`} className="ep-btn ep-btn-edit">
                Edit
              </Link>
              <button
                type="button"
                className="ep-btn ep-btn-delete"
                onClick={() => {
                  setShowCancel((value) => !value);
                  setActionError("");
                }}
                disabled={busy}
              >
                Cancel Estimate
              </button>
            </>
          )}
        </div>
      </div>

      {message && <div className="est-message success">{message}</div>}
      {actionError && <div className="est-message error">{actionError}</div>}

      {showCancel && isActive && (
        <section className="est-card">
          <form className="est-inline-panel" onSubmit={handleCancel}>
            <p className="est-muted">
              Cancelling returns all stock on this estimate. Recorded payments must be voided first.
            </p>
            <div className="est-field">
              <label htmlFor="est-cancel-reason">Reason</label>
              <input
                id="est-cancel-reason"
                type="text"
                className="ep-input"
                maxLength={250}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                disabled={isCancelling}
              />
            </div>
            <div className="est-form-actions">
              <button type="submit" className="ep-btn ep-btn-delete" disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                onClick={() => setShowCancel(false)}
                disabled={isCancelling}
              >
                Keep Estimate
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="est-summary">
        <div>
          <span>Total</span>
          <strong className="est-money">{formatPaise(summary.totalPaise)}</strong>
        </div>
        <div>
          <span>Paid</span>
          <strong className="est-money">{formatPaise(summary.paidPaise)}</strong>
        </div>
        <div>
          <span>Outstanding</span>
          <strong className="est-money">{formatPaise(summary.outstandingPaise)}</strong>
        </div>
      </div>

      <section className="est-card">
        <div className="est-card-header">
          <div>
            <h2>Details</h2>
          </div>
        </div>
        <div className="est-card-body">
          <dl className="est-details">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="est-card">
        <div className="est-card-header">
          <div>
            <h2>Lines</h2>
            <p>Prices are saved on the estimate and do not change with customer prices.</p>
          </div>
        </div>
        <div className="est-table-wrapper">
          <table className="ep-table est-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th className="num">Qty</th>
                <th className="num">Price</th>
                <th className="num">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {estimate.lines.map((line) => (
                <tr key={line._id || String(line.item)}>
                  <td className="est-cell-main">
                    <strong>{line.productName}</strong>
                  </td>
                  <td data-label="Unit">{unitLabel(line.unit)}</td>
                  <td className="num" data-label="Qty">
                    {line.quantity}
                  </td>
                  <td className="num est-money" data-label="Price">
                    {formatPaise(line.pricePaise)}
                  </td>
                  <td className="num est-money est-cell-side">
                    {formatPaise(line.lineTotalPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="est-total-bar">
          <span>Total</span>
          <span className="est-money">{formatPaise(estimate.totalPaise)}</span>
        </div>
      </section>

      <section className="est-card">
        <div className="est-card-header">
          <div>
            <h2>Payments</h2>
            <p>Estimate payments only. Voided payments stay listed for history.</p>
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

        {showPayment && isActive && (
          <form className="est-inline-panel" onSubmit={handleRecordPayment} noValidate>
            <div className="est-payment-grid">
              <div className="est-field">
                <label htmlFor="est-pay-amount">Amount (₹)</label>
                <input
                  id="est-pay-amount"
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
                <label htmlFor="est-pay-date">Payment Date</label>
                <input
                  id="est-pay-date"
                  type="date"
                  className="ep-input"
                  min={String(estimate.estimateDate).slice(0, 10)}
                  max={getBusinessToday()}
                  value={paymentForm.paymentDate}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))
                  }
                  disabled={isRecording}
                />
              </div>
              <div className="est-field">
                <label htmlFor="est-pay-method">Method</label>
                <select
                  id="est-pay-method"
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
                <label htmlFor="est-pay-reference">Reference</label>
                <input
                  id="est-pay-reference"
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
                <label htmlFor="est-pay-notes">Notes</label>
                <input
                  id="est-pay-notes"
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
                            setActionError("");
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
                          <button
                            type="submit"
                            className="ep-btn ep-btn-delete"
                            disabled={isVoiding}
                          >
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

      {printing && <EstimatePrint estimate={estimate} summary={summary} onDone={finishPrinting} />}
    </div>
  );
};

export default EstimateDetailPage;
