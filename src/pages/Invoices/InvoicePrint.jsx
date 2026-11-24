import { useEffect } from "react";
import { createPortal } from "react-dom";

import { formatPaise, formatState } from "../../utils/gst";
import { formatAddress, formatDateOnly, formatTimestamp, unitLabel } from "../../utils/estimates";
import { formatSignedPaise } from "../../utils/invoiceTax";

/*
 * Printable GST tax invoice built ONLY from the saved invoice snapshot
 * (seller, buyer, lines, tax summary, totals). Text only.
 * Rendered into <body> while printing, like the estimate print.
 */
const InvoicePrint = ({ invoice, summary, onDone }) => {
  useEffect(() => {
    document.body.classList.add("inv-printing");

    const finish = () => {
      document.body.classList.remove("inv-printing");
      onDone();
    };

    window.addEventListener("afterprint", finish, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("inv-printing");
    };
  }, [onDone]);

  const seller = invoice.seller || {};
  const customer = invoice.customerSnapshot || {};
  const isIntra = invoice.taxType === "intra";
  const hsnByRate = invoice.lines.reduce((map, line) => {
    const set = map.get(line.gstRatePercent) || new Set();
    set.add(line.hsnCode);
    map.set(line.gstRatePercent, set);
    return map;
  }, new Map());

  return createPortal(
    <div id="invoice-print-root">
      <p className="inv-print-title">TAX INVOICE</p>

      {invoice.status === "reversed" && (
        <p className="inv-print-banner">
          REVERSED on {formatTimestamp(invoice.reversedAt)}
          {invoice.reverseReason ? ` - ${invoice.reverseReason}` : ""}
        </p>
      )}

      <div className="inv-print-grid">
        <div>
          <p>
            <strong className="inv-print-name">{seller.legalName}</strong>
          </p>
          {seller.tradeName && <p>{seller.tradeName}</p>}
          <p>{[seller.addressLine1, seller.addressLine2].filter(Boolean).join(", ")}</p>
          <p>{[seller.city, seller.pincode].filter(Boolean).join(" - ")}</p>
          <p>
            State: {seller.stateName} ({seller.stateCode})
          </p>
          <p>GSTIN: {seller.gstin}</p>
          {seller.pan && <p>PAN: {seller.pan}</p>}
          {(seller.phone || seller.email) && (
            <p>{[seller.phone, seller.email].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div>
          <p>
            <strong>Invoice No: {invoice.invoiceNumber}</strong>
          </p>
          <p>Date: {formatDateOnly(invoice.invoiceDate)}</p>
          <p>Place of Supply: {formatState(invoice.placeOfSupplyStateCode)}</p>
        </div>
      </div>

      <div className="inv-print-grid">
        <div>
          <p className="inv-print-label">Bill To</p>
          <p>
            <strong>{customer.billingName || customer.name}</strong>
          </p>
          {formatAddress(customer.billingAddress) && (
            <p>{formatAddress(customer.billingAddress)}</p>
          )}
          <p>GSTIN: {customer.gstin || "Unregistered"}</p>
          <p>State: {formatState(customer.stateCode)}</p>
          {customer.contactNumber && <p>Phone: {customer.contactNumber}</p>}
        </div>
        <div>
          <p className="inv-print-label">Ship To</p>
          {customer.shippingSameAsBilling === false ? (
            <>
              <p>{formatAddress(customer.shippingAddress)}</p>
              {customer.shippingAddress?.stateCode && (
                <p>State: {formatState(customer.shippingAddress.stateCode)}</p>
              )}
            </>
          ) : (
            <p>Same as billing address</p>
          )}
        </div>
      </div>

      <table className="inv-print-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Description</th>
            <th>HSN</th>
            <th className="num">Qty</th>
            <th>Unit</th>
            <th className="num">Rate</th>
            <th className="num">GST %</th>
            <th className="num">Taxable Value</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={line._id || String(line.item)}>
              <td>{index + 1}</td>
              <td>
                {line.productName}
                {line.batchReference ? ` (Batch ${line.batchReference})` : ""}
              </td>
              <td>{line.hsnCode}</td>
              <td className="num">{line.quantity}</td>
              <td>{unitLabel(line.unit)}</td>
              <td className="num">{formatPaise(line.pricePaise)}</td>
              <td className="num">{line.gstRatePercent}%</td>
              <td className="num">{formatPaise(line.taxablePaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="inv-print-table inv-print-summary">
        <thead>
          <tr>
            <th>GST Rate</th>
            <th>HSN</th>
            <th className="num">Taxable</th>
            {isIntra ? (
              <>
                <th className="num">CGST</th>
                <th className="num">SGST</th>
              </>
            ) : (
              <th className="num">IGST</th>
            )}
            <th className="num">Tax</th>
          </tr>
        </thead>
        <tbody>
          {invoice.taxSummary.map((row) => (
            <tr key={row.gstRatePercent}>
              <td>
                {isIntra
                  ? `${row.gstRatePercent}% (${row.gstRatePercent / 2}% + ${row.gstRatePercent / 2}%)`
                  : `${row.gstRatePercent}%`}
              </td>
              <td>{[...(hsnByRate.get(row.gstRatePercent) || [])].join(", ")}</td>
              <td className="num">{formatPaise(row.taxablePaise)}</td>
              {isIntra ? (
                <>
                  <td className="num">{formatPaise(row.cgstPaise)}</td>
                  <td className="num">{formatPaise(row.sgstPaise)}</td>
                </>
              ) : (
                <td className="num">{formatPaise(row.igstPaise)}</td>
              )}
              <td className="num">{formatPaise(row.taxPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-print-bottom">
        <div>
          <p>
            <strong>Amount in words:</strong> {invoice.totalInWords}
          </p>
          {invoice.notes && (
            <p>
              <strong>Notes:</strong> {invoice.notes}
            </p>
          )}
          {seller.bank && (
            <p>
              <strong>Bank:</strong> {seller.bank.accountName}, A/c {seller.bank.accountNumber},
              IFSC {seller.bank.ifsc}, {seller.bank.bankName}
              {seller.bank.branch ? `, ${seller.bank.branch}` : ""}
            </p>
          )}
        </div>
        <div className="inv-print-totals">
          <p>
            <span>Taxable Value</span>
            <span>{formatPaise(invoice.taxablePaise)}</span>
          </p>
          {isIntra ? (
            <>
              <p>
                <span>CGST</span>
                <span>{formatPaise(invoice.cgstPaise)}</span>
              </p>
              <p>
                <span>SGST</span>
                <span>{formatPaise(invoice.sgstPaise)}</span>
              </p>
            </>
          ) : (
            <p>
              <span>IGST</span>
              <span>{formatPaise(invoice.igstPaise)}</span>
            </p>
          )}
          <p>
            <span>Round Off</span>
            <span>{formatSignedPaise(invoice.roundOffPaise, formatPaise)}</span>
          </p>
          <p className="inv-print-grand">
            <span>Total</span>
            <span>{formatPaise(invoice.totalPaise)}</span>
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
      </div>

      <div className="inv-print-footer">
        <p>{seller.declaration}</p>
        <div className="inv-print-sign">
          <p>For {seller.legalName}</p>
          <span>{seller.signatoryLabel}</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoicePrint;
