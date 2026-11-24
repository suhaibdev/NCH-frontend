import { useEffect } from "react";
import { createPortal } from "react-dom";

import { formatPaise, formatState } from "../../utils/gst";
import { formatAddress, formatDateOnly, formatTimestamp, unitLabel } from "../../utils/estimates";

/*
 * Printable estimate built ONLY from the saved snapshot (lines, prices,
 * customer details as stored on the estimate). Text only, no GST or HSN.
 * Rendered into <body> while printing, like the payout print.
 */
const EstimatePrint = ({ estimate, summary, onDone }) => {
  useEffect(() => {
    document.body.classList.add("est-printing");

    const finish = () => {
      document.body.classList.remove("est-printing");
      onDone();
    };

    window.addEventListener("afterprint", finish, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("est-printing");
    };
  }, [onDone]);

  const customer = estimate.customerSnapshot || {};
  const address = formatAddress(customer.billingAddress);
  const state = formatState(customer.stateCode);

  return createPortal(
    <div id="estimate-print-root">
      <div className="est-print-header">
        <strong>NEW CALCUTTA HANDLOOM</strong>
        <span>ESTIMATE</span>
      </div>

      {estimate.status === "cancelled" && (
        <p className="est-print-cancelled">
          CANCELLED on {formatTimestamp(estimate.cancelledAt)}
          {estimate.cancelReason ? ` - ${estimate.cancelReason}` : ""}
        </p>
      )}

      <div className="est-print-meta">
        <div>
          <p>
            <strong>To: {customer.billingName || customer.name || "-"}</strong>
          </p>
          {address && <p>{address}</p>}
          {state && <p>State: {state}</p>}
          {customer.contactNumber && <p>Phone: {customer.contactNumber}</p>}
        </div>
        <div>
          <p>
            <strong>Estimate No: {estimate.estimateNumber}</strong>
          </p>
          <p>Date: {formatDateOnly(estimate.estimateDate)}</p>
        </div>
      </div>

      <table className="est-print-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product</th>
            <th>Unit</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {estimate.lines.map((line, index) => (
            <tr key={line._id || String(line.item)}>
              <td>{index + 1}</td>
              <td>{line.productName}</td>
              <td>{unitLabel(line.unit)}</td>
              <td className="num">{line.quantity}</td>
              <td className="num">{formatPaise(line.pricePaise)}</td>
              <td className="num">{formatPaise(line.lineTotalPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="est-print-totals">
        <p>
          <span>Total</span>
          <span>{formatPaise(estimate.totalPaise)}</span>
        </p>
        <p>
          <span>Paid to date</span>
          <span>{formatPaise(summary.paidPaise)}</span>
        </p>
        <p>
          <span>Balance</span>
          <span>{formatPaise(summary.outstandingPaise)}</span>
        </p>
      </div>

      {estimate.notes && (
        <div className="est-print-notes">
          <strong>Notes:</strong> {estimate.notes}
        </div>
      )}
    </div>,
    document.body
  );
};

export default EstimatePrint;
