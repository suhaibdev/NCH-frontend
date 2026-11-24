import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise, formatState } from "../../utils/gst";
import {
  formatDateOnly,
  getBusinessToday,
  isCanceledRequest,
  unitLabel,
} from "../../utils/estimates";
import { TAX_TYPE_LABELS } from "../../utils/invoiceTax";
import InvoiceTaxBreakdown from "../Invoices/InvoiceTaxBreakdown";

import "../AdminCommon.css";
import "./Estimates.css";
import "../Invoices/Invoices.css";

/*
 * Confirmation step for "Convert to Invoice". The server prepares the
 * preview (real invoice math, GST added on top of the saved estimate
 * prices); the admin may only change the invoice date, per-line batch
 * references and notes. Quantities and prices cannot be changed here, and
 * stock is NOT deducted again: the estimate already deducted it.
 */
const EstimateConversionPanel = ({ estimateId, onClose }) => {
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [state, setState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);

  const [invoiceDate, setInvoiceDate] = useState(getBusinessToday());
  const [notes, setNotes] = useState("");
  const [batches, setBatches] = useState({});

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setState("loading");
        setLoadError("");
        const response = await api.get(`/estimates/${estimateId}/conversion-preview`, {
          signal: controller.signal,
        });
        setPreview(response.data);
        setState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        setLoadError(err.response?.data?.message || "Unable to prepare the conversion.");
        setState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [estimateId, reload]);

  const handleConvert = async (event) => {
    event.preventDefault();
    setError("");

    const today = getBusinessToday();
    if (!invoiceDate || invoiceDate > today) {
      setError("Invoice date cannot be empty or in the future.");
      return;
    }
    if (invoiceDate < String(preview.estimateDate).slice(0, 10)) {
      setError("Invoice date cannot be before the estimate date.");
      return;
    }

    const lines = preview.lines
      .map((line) => ({
        item: String(line.item),
        batchReference: (batches[line.item] || "").trim(),
      }))
      .filter((line) => line.batchReference);

    try {
      setIsConverting(true);
      const response = await api.post(`/estimates/${estimateId}/convert`, {
        invoiceDate,
        notes: notes.trim(),
        lines,
      });
      navigate(`/admin/invoices/${response.data?.invoice?._id}`, {
        replace: true,
        state: { message: response.data?.message || "Estimate converted to an invoice." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to convert the estimate.");
    } finally {
      setIsConverting(false);
    }
  };

  if (state === "loading") {
    return (
      <section className="est-card">
        <div className="est-state">Preparing the invoice preview...</div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="est-card">
        <div className="est-state error">
          <p>{loadError}</p>
          <div className="est-state-actions">
            <button
              type="button"
              className="ep-btn ep-btn-primary"
              onClick={() => setReload((value) => value + 1)}
            >
              Retry
            </button>
            <button type="button" className="ep-btn ep-btn-secondary" onClick={onClose}>
              Keep Estimate
            </button>
          </div>
        </div>
      </section>
    );
  }

  const { tax, customer, taxType } = preview;
  const canConvert = preview.eligible && Boolean(tax) && !isConverting;

  return (
    <section className="est-card est-convert">
      <div className="est-card-header">
        <div>
          <h2>Convert to Invoice</h2>
          <p>Creates a GST invoice from {preview.estimateNumber}. Stock is not deducted again.</p>
        </div>
      </div>

      <form className="est-card-body est-convert-body" onSubmit={handleConvert} noValidate>
        {preview.problems.length > 0 && (
          <div className="est-message error">
            <strong>This estimate cannot be converted yet:</strong>
            <ul className="est-convert-problems">
              {preview.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        )}

        {tax && (
          <div className="est-convert-notice">
            <strong>GST is added on top of the saved estimate prices.</strong> Estimate total{" "}
            {formatPaise(preview.estimateTotalPaise)} (no GST) becomes an invoice total of{" "}
            <strong>{formatPaise(tax.totalPaise)}</strong> including GST and round-off.
          </div>
        )}

        {customer && (
          <div className="inv-customer-meta">
            <span>{customer.name}</span>
            <span>GSTIN: {customer.gstin || "Unregistered"}</span>
            <span>State: {formatState(customer.stateCode) || "Not set"}</span>
            {taxType && <span className="inv-badge">{TAX_TYPE_LABELS[taxType]}</span>}
          </div>
        )}

        {preview.lines.length > 0 && (
          <div className="est-table-wrapper">
            <table className="ep-table est-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>HSN</th>
                  <th className="num">GST %</th>
                  <th className="num">Qty</th>
                  <th className="num">Price</th>
                  <th className="num">Taxable</th>
                  <th>Batch Ref</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((line) => (
                  <tr key={line.item}>
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
                    <td className="num est-money est-cell-side">
                      {formatPaise(line.taxablePaise)}
                    </td>
                    <td className="est-cell-full">
                      <input
                        type="text"
                        className="ep-input inv-batch-input"
                        aria-label={`Batch reference for ${line.productName}`}
                        placeholder="Batch ref (optional)"
                        maxLength={100}
                        value={batches[line.item] || ""}
                        onChange={(event) =>
                          setBatches((previous) => ({
                            ...previous,
                            [line.item]: event.target.value,
                          }))
                        }
                        disabled={isConverting}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tax && <InvoiceTaxBreakdown tax={tax} taxType={taxType} />}

        {preview.carriedPaymentCount > 0 && (
          <p className="est-muted">
            {formatPaise(preview.carriedPaymentsPaise)} already received (
            {preview.carriedPaymentCount} payment{preview.carriedPaymentCount === 1 ? "" : "s"})
            will move to the invoice. The estimate payments stay on record, marked as transferred.
          </p>
        )}

        <div className="est-form-grid">
          <div className="est-field">
            <label htmlFor="est-convert-date">Invoice Date</label>
            <input
              id="est-convert-date"
              type="date"
              className="ep-input"
              min={String(preview.estimateDate).slice(0, 10)}
              max={getBusinessToday()}
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
              disabled={isConverting}
            />
            <small>Estimate dated {formatDateOnly(preview.estimateDate)}.</small>
          </div>
          <div className="est-field">
            <label htmlFor="est-convert-notes">Invoice Notes</label>
            <input
              id="est-convert-notes"
              type="text"
              className="ep-input"
              maxLength={500}
              placeholder={`Converted from ${preview.estimateNumber}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isConverting}
            />
          </div>
        </div>

        {error && <div className="est-message error">{error}</div>}

        <div className="est-form-actions">
          <button type="submit" className="ep-btn ep-btn-primary" disabled={!canConvert}>
            {isConverting ? "Converting..." : "Confirm Conversion"}
          </button>
          <button
            type="button"
            className="ep-btn ep-btn-secondary"
            onClick={onClose}
            disabled={isConverting}
          >
            Keep Estimate
          </button>
        </div>
      </form>
    </section>
  );
};

export default EstimateConversionPanel;
