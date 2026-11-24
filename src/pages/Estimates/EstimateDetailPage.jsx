import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise, formatState } from "../../utils/gst";
import {
  STATUS_LABELS,
  formatAddress,
  formatDateOnly,
  formatTimestamp,
  isCanceledRequest,
  unitLabel,
} from "../../utils/estimates";
import DocumentPayments from "../Sales/DocumentPayments";
import EstimateConversionPanel from "./EstimateConversionPanel";
import EstimatePrint from "./EstimatePrint";

import "../AdminCommon.css";
import "./Estimates.css";

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

  const [showConvert, setShowConvert] = useState(false);

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
  const isConverted = estimate.status === "converted";
  const customer = estimate.customerSnapshot || {};

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
  if (isConverted) {
    details.push(
      ["Converted To", estimate.convertedInvoiceNumber],
      ["Converted On", formatTimestamp(estimate.convertedAt)]
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
            {isConverted && (
              <>
                {" "}
                ·{" "}
                <Link to={`/admin/invoices/${estimate.convertedInvoice}`}>
                  {estimate.convertedInvoiceNumber}
                </Link>
              </>
            )}
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
              <button
                type="button"
                className="ep-btn ep-btn-primary"
                onClick={() => {
                  setShowConvert((value) => !value);
                  setShowCancel(false);
                  setActionError("");
                }}
                disabled={isCancelling}
              >
                Convert to Invoice
              </button>
              <Link to={`/admin/estimates/${estimate._id}/edit`} className="ep-btn ep-btn-edit">
                Edit
              </Link>
              <button
                type="button"
                className="ep-btn ep-btn-delete"
                onClick={() => {
                  setShowCancel((value) => !value);
                  setShowConvert(false);
                  setActionError("");
                }}
                disabled={isCancelling}
              >
                Cancel Estimate
              </button>
            </>
          )}
        </div>
      </div>

      {message && <div className="est-message success">{message}</div>}
      {actionError && <div className="est-message error">{actionError}</div>}

      {isConverted && (
        <div className="est-converted-note">
          Converted to{" "}
          <Link to={`/admin/invoices/${estimate.convertedInvoice}`}>
            {estimate.convertedInvoiceNumber}
          </Link>{" "}
          on {formatTimestamp(estimate.convertedAt)}. This estimate is now read-only; its amount and
          payments belong to the invoice.
        </div>
      )}

      {showConvert && isActive && (
        <EstimateConversionPanel estimateId={estimateId} onClose={() => setShowConvert(false)} />
      )}

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
          <span>{isConverted ? "Moved to Invoice" : "Paid"}</span>
          <strong className="est-money">
            {formatPaise(isConverted ? summary.transferredPaise || 0 : summary.paidPaise)}
          </strong>
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

      <DocumentPayments
        apiBase={`/estimates/${estimateId}`}
        documentDate={estimate.estimateDate}
        isActive={isActive}
        payments={payments}
        summary={summary}
        description={
          isConverted
            ? `These payments moved to ${estimate.convertedInvoiceNumber} and are now part of the invoice ledger. They stay here for history.`
            : "Estimate payments only. Voided payments stay listed for history."
        }
        disabled={isCancelling}
        onUpdated={applyResponse}
      />

      {printing && <EstimatePrint estimate={estimate} summary={summary} onDone={finishPrinting} />}
    </div>
  );
};

export default EstimateDetailPage;
