import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../config/axios";
import { formatState } from "../../utils/gst";
import {
  formatAddress,
  formatDateOnly,
  formatTimestamp,
  isCanceledRequest,
  unitLabel,
} from "../../utils/estimates";
import { CHALLAN_STATUS_LABELS, normalizeVehicleNumber, sumQuantities } from "../../utils/challans";
import ChallanPrint from "./ChallanPrint";

import "../AdminCommon.css";
import "../Estimates/Estimates.css";
import "./Challans.css";

const toTransportForm = (transport = {}) => ({
  transporterName: transport.transporterName || "",
  vehicleNumber: transport.vehicleNumber || "",
  lrNumber: transport.lrNumber || "",
  lrDate: transport.lrDate ? String(transport.lrDate).slice(0, 10) : "",
});

const ChallanDetailPage = () => {
  const { challanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [challan, setChallan] = useState(null);
  const [state, setState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);

  const [message, setMessage] = useState(location.state?.message || "");
  const [actionError, setActionError] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [editTransport, setEditTransport] = useState(toTransportForm());
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

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
        const response = await api.get(`/challans/${challanId}`, { signal: controller.signal });
        setChallan(response.data?.challan || null);
        setState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setState("notFound");
          return;
        }
        setLoadError(err.response?.data?.message || "Unable to load challan.");
        setState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [challanId, reload]);

  const openEdit = () => {
    setEditTransport(toTransportForm(challan.transport));
    setEditNotes(challan.notes || "");
    setShowEdit(true);
    setShowCancel(false);
    setActionError("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setActionError("");
      setMessage("");
      const response = await api.put(`/challans/${challanId}`, {
        transport: {
          transporterName: editTransport.transporterName.trim(),
          vehicleNumber: normalizeVehicleNumber(editTransport.vehicleNumber).trim(),
          lrNumber: editTransport.lrNumber.trim(),
          lrDate: editTransport.lrDate,
        },
        notes: editNotes.trim(),
      });
      setChallan(response.data.challan);
      setMessage(response.data.message || "Challan updated.");
      setShowEdit(false);
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to update the challan.");
    } finally {
      setIsSaving(false);
    }
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
      const response = await api.post(`/challans/${challanId}/cancel`, {
        reason: cancelReason.trim(),
      });
      setChallan(response.data.challan);
      setMessage(response.data.message || "Challan cancelled.");
      setShowCancel(false);
      setCancelReason("");
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to cancel the challan.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (state === "loading") {
    return <div className="ep-container est-page est-state">Loading challan...</div>;
  }

  if (state === "notFound" || state === "error") {
    return (
      <div className={`ep-container est-page est-state${state === "error" ? " error" : ""}`}>
        <p>{state === "notFound" ? "Challan not found." : loadError}</p>
        <div className="est-state-actions">
          <Link to="/admin/challans" className="ep-btn ep-btn-secondary">
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

  const isActive = challan.status === "active";
  const customer = challan.customerSnapshot || {};
  const shipTo = customer.shipTo || {};
  const transport = challan.transport || {};
  const busy = isSaving || isCancelling;

  const details = [
    ["Challan Date", formatDateOnly(challan.challanDate)],
    ["Invoice", `${challan.invoiceNumber} (${formatDateOnly(challan.invoiceDate)})`],
    ["Customer", customer.billingName || customer.name],
    ["Ship To", formatAddress(shipTo)],
    ["State", formatState(shipTo.stateCode)],
    ["Contact Number", customer.contactNumber],
    ["Notes", challan.notes],
  ];
  if (challan.status === "cancelled") {
    details.push(
      ["Cancelled On", formatTimestamp(challan.cancelledAt)],
      ["Cancel Reason", challan.cancelReason]
    );
  }

  const transportDetails = [
    ["Transporter", transport.transporterName],
    ["Vehicle Number", transport.vehicleNumber],
    ["LR Number", transport.lrNumber],
    ["LR Date", transport.lrDate ? formatDateOnly(transport.lrDate) : ""],
  ];

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <Link to="/admin/challans" className="est-back-link">
            Back
          </Link>
          <h1>
            {challan.challanNumber}
            <span className={`est-status ${challan.status}`}>
              {CHALLAN_STATUS_LABELS[challan.status] || challan.status}
            </span>
          </h1>
          <p>
            <Link to={`/admin/invoices/${challan.invoice}`}>{challan.invoiceNumber}</Link> ·{" "}
            {customer.name}
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
                className="ep-btn ep-btn-edit"
                onClick={openEdit}
                disabled={busy}
              >
                Edit Transport
              </button>
              <button
                type="button"
                className="ep-btn ep-btn-delete"
                onClick={() => {
                  setShowCancel((value) => !value);
                  setShowEdit(false);
                  setActionError("");
                }}
                disabled={busy}
              >
                Cancel Challan
              </button>
            </>
          )}
        </div>
      </div>

      {message && <div className="est-message success">{message}</div>}
      {actionError && <div className="est-message error">{actionError}</div>}

      {showEdit && isActive && (
        <section className="est-card">
          <form className="est-inline-panel" onSubmit={handleSaveEdit} noValidate>
            <p className="est-muted">
              Only the transport details and notes can be changed. To change quantities, cancel this
              challan and create a new one.
            </p>
            <div className="ch-transport-grid">
              <div className="est-field">
                <label htmlFor="ch-edit-transporter">Transporter</label>
                <input
                  id="ch-edit-transporter"
                  type="text"
                  className="ep-input"
                  maxLength={100}
                  value={editTransport.transporterName}
                  onChange={(event) =>
                    setEditTransport((prev) => ({ ...prev, transporterName: event.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="est-field">
                <label htmlFor="ch-edit-vehicle">Vehicle Number</label>
                <input
                  id="ch-edit-vehicle"
                  type="text"
                  className="ep-input"
                  maxLength={20}
                  value={editTransport.vehicleNumber}
                  onChange={(event) =>
                    setEditTransport((prev) => ({
                      ...prev,
                      vehicleNumber: normalizeVehicleNumber(event.target.value),
                    }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="est-field">
                <label htmlFor="ch-edit-lr">LR (Lorry Receipt) No.</label>
                <input
                  id="ch-edit-lr"
                  type="text"
                  className="ep-input"
                  maxLength={50}
                  value={editTransport.lrNumber}
                  onChange={(event) =>
                    setEditTransport((prev) => ({ ...prev, lrNumber: event.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="est-field">
                <label htmlFor="ch-edit-lr-date">LR Date</label>
                <input
                  id="ch-edit-lr-date"
                  type="date"
                  className="ep-input"
                  value={editTransport.lrDate}
                  onChange={(event) =>
                    setEditTransport((prev) => ({ ...prev, lrDate: event.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="est-field">
              <label htmlFor="ch-edit-notes">Notes</label>
              <input
                id="ch-edit-notes"
                type="text"
                className="ep-input"
                maxLength={500}
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="est-form-actions">
              <button type="submit" className="ep-btn ep-btn-primary" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                onClick={() => setShowEdit(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {showCancel && isActive && (
        <section className="est-card">
          <form className="est-inline-panel" onSubmit={handleCancel}>
            <p className="est-muted">
              Cancelling keeps this challan on record and returns its quantities to the invoice's
              remaining-to-dispatch pool. Stock is not changed.
            </p>
            <div className="est-field">
              <label htmlFor="ch-cancel-reason">Reason</label>
              <input
                id="ch-cancel-reason"
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
                Keep Challan
              </button>
            </div>
          </form>
        </section>
      )}

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
            <h2>Goods Delivered</h2>
            <p>Quantities only. A challan carries no prices or GST.</p>
          </div>
        </div>
        <div className="est-table-wrapper">
          <table className="ep-table est-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th className="num">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {challan.lines.map((line) => (
                <tr key={line._id || String(line.invoiceLine)}>
                  <td className="est-cell-main">
                    <strong>{line.productName}</strong>
                  </td>
                  <td data-label="Unit">{unitLabel(line.unit)}</td>
                  <td className="num est-cell-side">{line.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="est-total-bar">
          <span>Total quantity</span>
          <span className="est-money">{sumQuantities(challan.lines)}</span>
        </div>
      </section>

      <section className="est-card">
        <div className="est-card-header">
          <div>
            <h2>Transport</h2>
          </div>
        </div>
        <div className="est-card-body">
          <dl className="est-details">
            {transportDetails.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {printing && <ChallanPrint challan={challan} onDone={finishPrinting} />}
    </div>
  );
};

export default ChallanDetailPage;
