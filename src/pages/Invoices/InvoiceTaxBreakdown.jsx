import React from "react";

import { formatPaise } from "../../utils/gst";
import { formatSignedPaise } from "../../utils/invoiceTax";

/*
 * Per-rate tax summary plus totals. Used for the live preview on the form
 * and for the saved values on the detail page (same shape in both cases).
 */
const InvoiceTaxBreakdown = ({ tax, taxType, totalInWords = "", preview = false }) => {
  const isIntra = taxType === "intra";

  return (
    <div>
      <div className="inv-tax-wrapper">
        <table className="inv-tax-table">
          <thead>
            <tr>
              <th>GST Rate</th>
              <th>Taxable</th>
              {isIntra ? (
                <>
                  <th>CGST</th>
                  <th>SGST</th>
                </>
              ) : (
                <th>IGST</th>
              )}
              <th>Tax</th>
            </tr>
          </thead>
          <tbody>
            {tax.taxSummary.map((row) => (
              <tr key={row.gstRatePercent}>
                <td>{row.gstRatePercent}%</td>
                <td>{formatPaise(row.taxablePaise)}</td>
                {isIntra ? (
                  <>
                    <td>{formatPaise(row.cgstPaise)}</td>
                    <td>{formatPaise(row.sgstPaise)}</td>
                  </>
                ) : (
                  <td>{formatPaise(row.igstPaise)}</td>
                )}
                <td>{formatPaise(row.taxPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="inv-totals">
        <p>
          <span>Taxable Value</span>
          <span className="est-money">{formatPaise(tax.taxablePaise)}</span>
        </p>
        {isIntra ? (
          <>
            <p>
              <span>CGST</span>
              <span className="est-money">{formatPaise(tax.cgstPaise)}</span>
            </p>
            <p>
              <span>SGST</span>
              <span className="est-money">{formatPaise(tax.sgstPaise)}</span>
            </p>
          </>
        ) : (
          <p>
            <span>IGST</span>
            <span className="est-money">{formatPaise(tax.igstPaise)}</span>
          </p>
        )}
        <p>
          <span>Round Off</span>
          <span className="est-money">{formatSignedPaise(tax.roundOffPaise, formatPaise)}</span>
        </p>
        <p className="inv-grand">
          <span>Total</span>
          <span className="est-money">{formatPaise(tax.totalPaise)}</span>
        </p>
      </div>

      {totalInWords && <p className="inv-words">{totalInWords}</p>}
      {preview && (
        <p className="inv-preview-note">Preview. Saved values are calculated by the server.</p>
      )}
    </div>
  );
};

export default InvoiceTaxBreakdown;
