import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import api from "../../config/axios";
import {
  formatDateOnly,
  getBusinessToday,
  isCanceledRequest,
  unitLabel,
} from "../../utils/estimates";
import { normalizeVehicleNumber, parseDispatchQuantity } from "../../utils/challans";

import "../AdminCommon.css";
import "../Estimates/Estimates.css";
import "./Challans.css";

const emptyTransport = { transporterName: "", vehicleNumber: "", lrNumber: "", lrDate: "" };

const ChallanFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoice") || "";

  const [dispatch, setDispatch] = useState(null);
  const [state, setState] = useState(invoiceId ? "loading" : "noInvoice");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);

  const [quantities, setQuantities] = useState({});
  const [challanDate, setChallanDate] = useState(getBusinessToday());
  const [transport, setTransport] = useState(emptyTransport);
  const [notes, setNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const today = getBusinessToday();

  useEffect(() => {
    if (!invoiceId) return undefined;

    const controller = new AbortController();

    const load = async () => {
      try {
        setState("loading");
        setLoadError("");
        const response = await api.get(`/challans/invoice-dispatch/${invoiceId}`, {
          signal: controller.signal,
        });
        const data = response.data;
        setDispatch(data);

        // Prefill each line with what is still left to dispatch.
        setQuantities(
          Object.fromEntries(
            data.lines.map((line) => [
              line.invoiceLine,
              line.remainingQuantity > 0 ? String(line.remainingQuantity) : "",
            ])
          )
        );

        if (data.invoice.status !== "active") setState("notActive");
        else if (!data.canCreate) setState("nothingLeft");
        else setState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setState("notFound");
          return;
        }
        setLoadError(err.response?.data?.message || "Unable to load the invoice dispatch details.");
        setState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [invoiceId, reload]);

  const updateTransport = (field, value) =>
    setTransport((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!challanDate || challanDate > today) {
      return setFormError("Challan date cannot be empty or in the future.");
    }
    if (challanDate < String(dispatch.invoice.invoiceDate).slice(0, 10)) {
      return setFormError("Challan date cannot be before the invoice date.");
    }

    const lines = [];
    for (const line of dispatch.lines) {
      const quantity = parseDispatchQuantity(quantities[line.invoiceLine]);
      if (quantity === null) {
        return setFormError(`${line.productName}: quantity must be a whole number.`);
      }
      if (quantity > line.remainingQuantity) {
        return setFormError(
          `${line.productName}: only ${line.remainingQuantity} ${unitLabel(line.unit)} remain to dispatch.`
        );
      }
      if (quantity > 0) lines.push({ invoiceLine: line.invoiceLine, quantity });
    }
    if (lines.length === 0) return setFormError("Enter a quantity for at least one product.");

    try {
      setIsSaving(true);
      const response = await api.post("/challans", {
        invoice: invoiceId,
        challanDate,
        lines,
        transport: {
          transporterName: transport.transporterName.trim(),
          vehicleNumber: normalizeVehicleNumber(transport.vehicleNumber).trim(),
          lrNumber: transport.lrNumber.trim(),
          lrDate: transport.lrDate,
        },
        notes: notes.trim(),
      });
      navigate(`/admin/challans/${response.data?.challan?._id}`, {
        replace: true,
        state: { message: response.data?.message || "Challan created." },
      });
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to create the challan.");
    } finally {
      setIsSaving(false);
    }
  };

  const backTo = invoiceId ? `/admin/invoices/${invoiceId}` : "/admin/challans";

  /* ---------- page-level states ---------- */

  if (state === "loading") {
    return <div className="ep-container est-page est-state">Loading invoice...</div>;
  }

  if (state !== "success") {
    const text = {
      noInvoice: "Open an invoice and choose Create Challan to start a delivery challan.",
      notFound: "Invoice not found.",
      notActive: "Challans can be created only for active invoices.",
      nothingLeft: "This invoice has been fully dispatched. Cancel a challan to free quantity.",
      error: loadError,
    }[state];
    return (
      <div className={`ep-container est-page est-state${state === "error" ? " error" : ""}`}>
        <p>{text}</p>
        <div className="est-state-actions">
          <Link to={backTo} className="ep-btn ep-btn-secondary">
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

  const { invoice, lines } = dispatch;

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <Link to={backTo} className="est-back-link">
            Back
          </Link>
          <h1>New Delivery Challan</h1>
          <p>
            Against {invoice.invoiceNumber} · {invoice.customerName}. Stock and payments are not
            affected.
          </p>
        </div>
      </div>

      {formError && <div className="est-message error">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <section className="est-card">
          <div className="est-card-header">
            <div>
              <h2>Goods to dispatch</h2>
              <p>
                Quantities start at what is still left on the invoice. Lower them for a partial
                dispatch, or clear a line to skip it.
              </p>
            </div>
          </div>

          <div className="est-table-wrapper">
            <table className="ep-table est-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th className="num">Ordered</th>
                  <th className="num">Dispatched</th>
                  <th className="num">Remaining</th>
                  <th>This Challan</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
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
                    <td className="est-cell-full">
                      {line.remainingQuantity > 0 ? (
                        <>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="ep-input ch-qty-input"
                            aria-label={`Quantity to dispatch for ${line.productName}`}
                            value={quantities[line.invoiceLine] ?? ""}
                            onChange={(event) =>
                              setQuantities((previous) => ({
                                ...previous,
                                [line.invoiceLine]: event.target.value.replace(/\D/g, ""),
                              }))
                            }
                            disabled={isSaving}
                          />
                          <div className="ch-qty-hint">max {line.remainingQuantity}</div>
                        </>
                      ) : (
                        <span className="est-muted">Fully dispatched</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="est-card">
          <div className="est-card-header">
            <div>
              <h2>Challan details</h2>
            </div>
          </div>
          <div className="est-card-body">
            <div className="est-form-grid">
              <div className="est-field">
                <label htmlFor="ch-date">Challan Date</label>
                <input
                  id="ch-date"
                  type="date"
                  className="ep-input"
                  min={String(invoice.invoiceDate).slice(0, 10)}
                  max={today}
                  value={challanDate}
                  onChange={(event) => setChallanDate(event.target.value)}
                  disabled={isSaving}
                />
                <small>Invoice dated {formatDateOnly(invoice.invoiceDate)}.</small>
              </div>
            </div>

            <h3 className="ch-section-title">Transport (optional)</h3>
            <div className="ch-transport-grid">
              <div className="est-field">
                <label htmlFor="ch-transporter">Transporter</label>
                <input
                  id="ch-transporter"
                  type="text"
                  className="ep-input"
                  maxLength={100}
                  value={transport.transporterName}
                  onChange={(event) => updateTransport("transporterName", event.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="est-field">
                <label htmlFor="ch-vehicle">Vehicle Number</label>
                <input
                  id="ch-vehicle"
                  type="text"
                  className="ep-input"
                  maxLength={20}
                  value={transport.vehicleNumber}
                  onChange={(event) =>
                    updateTransport("vehicleNumber", normalizeVehicleNumber(event.target.value))
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="est-field">
                <label htmlFor="ch-lr-number">LR (Lorry Receipt) No.</label>
                <input
                  id="ch-lr-number"
                  type="text"
                  className="ep-input"
                  maxLength={50}
                  value={transport.lrNumber}
                  onChange={(event) => updateTransport("lrNumber", event.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="est-field">
                <label htmlFor="ch-lr-date">LR Date</label>
                <input
                  id="ch-lr-date"
                  type="date"
                  className="ep-input"
                  max={today}
                  value={transport.lrDate}
                  onChange={(event) => updateTransport("lrDate", event.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="est-field" style={{ marginTop: 16 }}>
              <label htmlFor="ch-notes">Notes</label>
              <textarea
                id="ch-notes"
                className="ep-input"
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>
        </section>

        <div className="est-form-actions">
          <button type="submit" className="ep-btn ep-btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Challan"}
          </button>
          <Link to={backTo} className="ep-btn ep-btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ChallanFormPage;
