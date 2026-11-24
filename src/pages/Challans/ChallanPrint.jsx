import { useEffect } from "react";
import { createPortal } from "react-dom";

import { formatState } from "../../utils/gst";
import { formatAddress, formatDateOnly, formatTimestamp, unitLabel } from "../../utils/estimates";
import { sumQuantities } from "../../utils/challans";

/*
 * Printable delivery challan built ONLY from the saved challan snapshot.
 * Text only: no prices, no GST, no GSTIN. Rendered into <body> while
 * printing, like the invoice print.
 */
const ChallanPrint = ({ challan, onDone }) => {
  useEffect(() => {
    document.body.classList.add("ch-printing");

    const finish = () => {
      document.body.classList.remove("ch-printing");
      onDone();
    };

    window.addEventListener("afterprint", finish, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("ch-printing");
    };
  }, [onDone]);

  const seller = challan.seller || {};
  const customer = challan.customerSnapshot || {};
  const shipTo = customer.shipTo || {};
  const transport = challan.transport || {};
  const hasTransport = Boolean(
    transport.transporterName || transport.vehicleNumber || transport.lrNumber || transport.lrDate
  );

  return createPortal(
    <div id="challan-print-root">
      <p className="ch-print-title">DELIVERY CHALLAN</p>

      {challan.status === "cancelled" && (
        <p className="ch-print-banner">
          CANCELLED on {formatTimestamp(challan.cancelledAt)}
          {challan.cancelReason ? ` - ${challan.cancelReason}` : ""}
        </p>
      )}

      <div className="ch-print-grid">
        <div>
          <p>
            <strong className="ch-print-name">{seller.legalName}</strong>
          </p>
          {seller.tradeName && <p>{seller.tradeName}</p>}
          <p>{[seller.addressLine1, seller.addressLine2].filter(Boolean).join(", ")}</p>
          <p>{[seller.city, seller.pincode].filter(Boolean).join(" - ")}</p>
          {(seller.phone || seller.email) && (
            <p>{[seller.phone, seller.email].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div>
          <p>
            <strong>Challan No: {challan.challanNumber}</strong>
          </p>
          <p>Date: {formatDateOnly(challan.challanDate)}</p>
          <p>
            Invoice: {challan.invoiceNumber} ({formatDateOnly(challan.invoiceDate)})
          </p>
        </div>
      </div>

      <div className="ch-print-grid">
        <div>
          <p className="ch-print-label">Deliver To</p>
          <p>
            <strong>{customer.billingName || customer.name}</strong>
          </p>
          {formatAddress(shipTo) && <p>{formatAddress(shipTo)}</p>}
          {formatState(shipTo.stateCode) && <p>State: {formatState(shipTo.stateCode)}</p>}
          {customer.contactNumber && <p>Phone: {customer.contactNumber}</p>}
        </div>
        {hasTransport && (
          <div>
            <p className="ch-print-label">Transport</p>
            {transport.transporterName && <p>Transporter: {transport.transporterName}</p>}
            {transport.vehicleNumber && <p>Vehicle No: {transport.vehicleNumber}</p>}
            {transport.lrNumber && <p>LR No: {transport.lrNumber}</p>}
            {transport.lrDate && <p>LR Date: {formatDateOnly(transport.lrDate)}</p>}
          </div>
        )}
      </div>

      <table className="ch-print-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product</th>
            <th>Unit</th>
            <th className="num">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {challan.lines.map((line, index) => (
            <tr key={line._id || String(line.invoiceLine)}>
              <td>{index + 1}</td>
              <td>{line.productName}</td>
              <td>{unitLabel(line.unit)}</td>
              <td className="num">{line.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ch-print-total">Total quantity: {sumQuantities(challan.lines)}</p>

      {challan.notes && (
        <div className="ch-print-notes">
          <strong>Notes:</strong> {challan.notes}
        </div>
      )}

      <div className="ch-print-receipt">
        <p>Received the above goods in good condition.</p>
      </div>

      <div className="ch-print-signatures">
        <div>
          <p>Received by (name and signature)</p>
          <p>Date:</p>
        </div>
        <div>
          <p>For {seller.legalName}</p>
          <p>{seller.signatoryLabel || "Authorised Signatory"}</p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChallanPrint;
