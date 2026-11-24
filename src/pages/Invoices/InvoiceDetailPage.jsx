import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise, formatState } from "../../utils/gst";
import {
  formatAddress,
  formatDateOnly,
  formatTimestamp,
  isCanceledRequest,
  unitLabel,
} from "../../utils/estimates";
import { TAX_TYPE_LABELS } from "../../utils/invoiceTax";
import { CHALLAN_STATUS_LABELS, DISPATCH_LABELS } from "../../utils/challans";
import DocumentPayments from "../Sales/DocumentPayments";
import InvoicePrint from "./InvoicePrint";
import InvoiceTaxBreakdown from "./InvoiceTaxBreakdown";

import "../AdminCommon.css";
import "../Estimates/Estimates.css";
import "./Invoices.css";
import "../Challans/Challans.css";

const STATUS_LABELS = { active: "Active", reversed: "Reversed" };

const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [state, setState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);

  const [message, setMessage] = useState(location.state?.message || "");
  const [actionError, setActionError] = useState("");

  const [showReverse, setShowReverse] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);

  const [dispatch, setDispatch] = useState(null);
  const [dispatchState, setDispatchState] = useState("loading");
  const [dispatchError, setDispatchError] = useState("");
  const [dispatchReload, setDispatchReload] = useState(0);

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
        const response = await api.get(`/invoices/${invoiceId}`, { signal: controller.signal });
        setDetail(response.data);
        setState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setState("notFound");
          return;
        }
        setLoadError(err.response?.data?.message || "Unable to load invoice.");
        setState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [invoiceId, reload]);

  useEffect(() => {
    const controller = new AbortController();

    const loadDispatch = async () => {
      try {
        setDispatchState("loading");
        setDispatchError("");
        const response = await api.get(`/challans/invoice-dispatch/${invoiceId}`, {
          signal: controller.signal,
        });
        setDispatch(response.data);
        setDispatchState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        setDispatchError(err.response?.data?.message || "Unable to load dispatch details.");
        setDispatchState("error");
      }
    };

    loadDispatch();
    return () => controller.abort();
  }, [invoiceId, dispatchReload]);

  const applyResponse = (data, text) => {
    setDetail({ invoice: data.invoice, payments: data.payments, summary: data.summary });
    setMessage(text || data.message || "");
    setActionError("");
  };

  const handleReverse = async (event) => {
    event.preventDefault();
    if (!reverseReason.trim()) {
      setActionError("Enter a reason for reversing.");
      return;
    }
    try {
      setIsReversing(true);
      setActionError("");
      setMessage("");
      const response = await api.post(`/invoices/${invoiceId}/reverse`, {
        reason: reverseReason.trim(),
      });
      applyResponse(response.data);
      setShowReverse(false);
      setReverseReason("");
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to reverse invoice.");
    } finally {
      setIsReversing(false);
    }
  };

  /* ---------- page-level states ---------- */

  if (state === "loading") {
    return <div className="ep-container est-page est-state">Loading invoice...</div>;
  }

  if (state === "notFound" || state === "error") {
    return (
      <div className={`ep-container est-page est-state${state === "error" ? " error" : ""}`}>
        <p>{state === "notFound" ? "Invoice not found." : loadError}</p>
        <div className="est-state-actions">
          <Link to="/admin/invoices" className="ep-btn ep-btn-secondary">
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

  const { invoice, payments, summary } = detail;
  const isActive = invoice.status === "active";
  const hasChallans = (invoice.activeChallanCount || 0) > 0;
  const canEdit = isActive && summary.paymentCount === 0 && !hasChallans;
  const dispatchStatus = invoice.dispatchStatus || "none";
  const customer = invoice.customerSnapshot || {};
  const seller = invoice.seller || {};

  const details = [
    ["Invoice Date", formatDateOnly(invoice.invoiceDate)],
    ["Place of Supply", formatState(invoice.placeOfSupplyStateCode)],
    ["Tax", TAX_TYPE_LABELS[invoice.taxType]],
    ["Notes", invoice.notes],
  ];
  if (invoice.sourceEstimate) {
    details.push(["Converted From", invoice.sourceEstimateNumber]);
  }
  if (invoice.status === "reversed") {
    details.push(
      ["Reversed On", formatTimestamp(invoice.reversedAt)],
      ["Reverse Reason", invoice.reverseReason]
    );
  }

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <Link to="/admin/invoices" className="est-back-link">
            Back
          </Link>
          <h1>
            {invoice.invoiceNumber}
            <span className={`est-status ${invoice.status}`}>
              {STATUS_LABELS[invoice.status] || invoice.status}
            </span>
            {isActive && (
              <span className={`est-status ${dispatchStatus}`}>
                {DISPATCH_LABELS[dispatchStatus]}
              </span>
            )}
          </h1>
          <p>
            <Link to={`/admin/customers/${invoice.customer}`}>{customer.name}</Link> ·{" "}
            {TAX_TYPE_LABELS[invoice.taxType]}
            {invoice.sourceEstimate && (
              <>
                {" "}
                · from{" "}
                <Link to={`/admin/estimates/${invoice.sourceEstimate}`}>
                  {invoice.sourceEstimateNumber}
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
          {canEdit && (
            <Link to={`/admin/invoices/${invoice._id}/edit`} className="ep-btn ep-btn-edit">
              Edit
            </Link>
          )}
          {isActive && (
            <button
              type="button"
              className="ep-btn ep-btn-delete"
              onClick={() => {
                setShowReverse((value) => !value);
                setActionError("");
              }}
              disabled={isReversing || hasChallans}
              title={hasChallans ? "Cancel the delivery challans first." : undefined}
            >
              Reverse
            </button>
          )}
        </div>
      </div>

      {message && <div className="est-message success">{message}</div>}
      {actionError && <div className="est-message error">{actionError}</div>}
      {isActive && hasChallans && (
        <div className="inv-banner">
          This invoice has active delivery challans, so it cannot be edited or reversed. Cancel the
          challans first.
        </div>
      )}
      {isActive && !hasChallans && !canEdit && (
        <div className="inv-banner">
          This invoice has payments, so it can no longer be edited. To correct it, void the payments
          and reverse it.
        </div>
      )}

      {showReverse && isActive && (
        <section className="est-card">
          <form className="est-inline-panel" onSubmit={handleReverse}>
            <p className="est-muted">
              Reversing returns all stock on this invoice. The invoice number stays on record as
              reversed. Recorded payments must be voided first.
            </p>
            <div className="est-field">
              <label htmlFor="inv-reverse-reason">Reason</label>
              <input
                id="inv-reverse-reason"
                type="text"
                className="ep-input"
                maxLength={250}
                value={reverseReason}
                onChange={(event) => setReverseReason(event.target.value)}
                disabled={isReversing}
              />
            </div>
            <div className="est-form-actions">
              <button type="submit" className="ep-btn ep-btn-delete" disabled={isReversing}>
                {isReversing ? "Reversing..." : "Confirm Reverse"}
              </button>
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                onClick={() => setShowReverse(false)}
                disabled={isReversing}
              >
                Keep Invoice
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
            <h2>Parties</h2>
          </div>
        </div>
        <div className="est-card-body inv-parties">
          <div>
            <h3>Seller</h3>
            <p>
              <strong>{seller.legalName || "-"}</strong>
            </p>
            <p>
              {[seller.addressLine1, seller.addressLine2, seller.city, seller.pincode]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p>GSTIN: {seller.gstin || "-"}</p>
            <p>State: {formatState(seller.stateCode) || "-"}</p>
          </div>
          <div>
            <h3>Bill To</h3>
            <p>
              <strong>{customer.billingName || customer.name}</strong>
            </p>
            <p>{formatAddress(customer.billingAddress) || "-"}</p>
            <p>GSTIN: {customer.gstin || "Unregistered"}</p>
            <p>State: {formatState(customer.stateCode) || "-"}</p>
            {customer.shippingSameAsBilling === false && (
              <p>
                Ship To: {formatAddress(customer.shippingAddress)}
                {customer.shippingAddress?.stateCode
                  ? `, ${formatState(customer.shippingAddress.stateCode)}`
                  : ""}
              </p>
            )}
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
            <p>Price, HSN and GST rate are saved on the invoice.</p>
          </div>
        </div>
        <div className="est-table-wrapper">
          <table className="ep-table est-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>HSN</th>
                <th className="num">GST %</th>
                <th className="num">Qty</th>
                <th className="num">Price</th>
                <th>Batch Ref</th>
                <th className="num">Taxable</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line._id || String(line.item)}>
                  <td className="est-cell-main">
                    <strong>{line.productName}</strong>
                    <div className="est-muted">{unitLabel(line.unit)}</div>
                  </td>
                  <td data-label="HSN">{line.hsnCode}</td>
                  <td className="num" data-label="GST">
                    {line.gstRatePercent}%
                  </td>
                  <td className="num" data-label="Qty">
                    {line.quantity}
                  </td>
                  <td className="num est-money" data-label="Price">
                    {formatPaise(line.pricePaise)}
                  </td>
                  <td data-label="Batch">{line.batchReference || "-"}</td>
                  <td className="num est-money est-cell-side">{formatPaise(line.taxablePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="est-card-body">
          <InvoiceTaxBreakdown
            tax={invoice}
            taxType={invoice.taxType}
            totalInWords={invoice.totalInWords}
          />
        </div>
      </section>

      <section className="est-card">
        <div className="est-card-header">
          <div>
            <h2>Dispatch</h2>
            <p>Delivery challans for this invoice. They do not change stock or payments.</p>
          </div>
          {isActive && dispatchState === "success" && dispatch.canCreate && (
            <Link
              to={`/admin/challans/new?invoice=${invoice._id}`}
              className="ep-btn ep-btn-primary"
            >
              Create Challan
            </Link>
          )}
        </div>

        {dispatchState === "loading" ? (
          <div className="est-state">Loading dispatch details...</div>
        ) : dispatchState === "error" ? (
          <div className="est-state error">
            <p>{dispatchError}</p>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={() => setDispatchReload((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="est-table-wrapper">
              <table className="ep-table est-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit</th>
                    <th className="num">Ordered</th>
                    <th className="num">Dispatched</th>
                    <th className="num">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatch.lines.map((line) => (
                    <tr key={line.invoiceLine}>
                      <td className="est-cell-main">
                        <strong>{line.productName}</strong>
                      </td>
                      <td data-label="Unit">{unitLabel(line.unit)}</td>
                      <td className="num" data-label="Ordered">
                        {line.orderedQuantity}
                      </td>
                      <td className="num" data-label="Dispatched">
                        {line.dispatchedQuantity}
                      </td>
                      <td className="num" data-label="Remaining">
                        {line.remainingQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dispatch.challans.length === 0 ? (
              <div className="est-state">No challans yet.</div>
            ) : (
              <div className="est-table-wrapper">
                <table className="ep-table est-table">
                  <thead>
                    <tr>
                      <th>Challan No.</th>
                      <th>Date</th>
                      <th className="num">Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatch.challans.map((challan) => (
                      <tr
                        key={challan._id}
                        className="est-row"
                        tabIndex={0}
                        onClick={() => navigate(`/admin/challans/${challan._id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate(`/admin/challans/${challan._id}`);
                          }
                        }}
                        aria-label={`Open challan ${challan.challanNumber}`}
                      >
                        <td className="est-cell-main">
                          <strong>{challan.challanNumber}</strong>
                        </td>
                        <td data-label="Date">{formatDateOnly(challan.challanDate)}</td>
                        <td className="num" data-label="Quantity">
                          {challan.totalQuantity}
                        </td>
                        <td className="est-cell-side">
                          <span className={`est-status ${challan.status}`}>
                            {CHALLAN_STATUS_LABELS[challan.status] || challan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <DocumentPayments
        apiBase={`/invoices/${invoiceId}`}
        documentDate={invoice.invoiceDate}
        isActive={isActive}
        payments={payments}
        summary={summary}
        description="Invoice payments only, kept separate from estimates. Voided payments stay listed."
        disabled={isReversing}
        onUpdated={applyResponse}
      />

      {printing && <InvoicePrint invoice={invoice} summary={summary} onDone={finishPrinting} />}
    </div>
  );
};

export default InvoiceDetailPage;
