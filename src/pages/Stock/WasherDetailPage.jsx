import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../config/axios";
import "./ProcessGoodsPage.css";
import { getFridayThursdayCycle } from "../../utils/washerPayoutCycle";

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
};

const date = () => new Date().toISOString().slice(0, 10);
const WasherDetailPage = () => {
  const { washerId } = useParams();
  const cycle = getFridayThursdayCycle();
  const [data, setData] = useState({}),
    [advances, setAdvances] = useState([]),
    [payouts, setPayouts] = useState([]),
    [loading, setLoading] = useState(true),
    [savingAdvance, setSavingAdvance] = useState(false),
    [previewing, setPreviewing] = useState(false),
    [generating, setGenerating] = useState(false),
    [err, setErr] = useState(""),
    [advance, setAdvance] = useState({
      amount: "",
      advanceDate: date(),
      method: "cash",
      reference: "",
      notes: "",
    }),
    [pay, setPay] = useState({
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      payoutDate: date(),
      paymentMethod: "cash",
      paymentReference: "",
    }),
    [preview, setPreview] = useState(null);
  const load = async () => {
    try {
      setLoading(true);
      const [s, a, p] = await Promise.all([
        api.get(`/washer-accounting/${washerId}/account-summary`),
        api.get(`/washer-accounting/${washerId}/advances`, { params: { page: 1, limit: 20 } }),
        api.get(`/washer-accounting/${washerId}/payouts`, { params: { page: 1, limit: 20 } }),
      ]);
      setData(s.data);
      setAdvances(a.data.items || []);
      setPayouts(p.data.items || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to load washer account.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [washerId]);
  const give = async (e) => {
    e.preventDefault();
    const amount = Number(advance.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Advance amount must be greater than zero.");
      return;
    }
    try {
      setSavingAdvance(true);
      setErr("");
      await api.post("/washer-accounting/advances", { washer: washerId, ...advance });
      setAdvance({ ...advance, amount: "", reference: "", notes: "" });
      load();
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to record advance.");
    } finally {
      setSavingAdvance(false);
    }
  };
  const show = async () => {
    try {
      setPreviewing(true);
      setErr("");
      setPreview(
        (await api.get(`/washer-accounting/${washerId}/payout-preview`, { params: pay })).data
      );
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to preview payout.");
    } finally {
      setPreviewing(false);
    }
  };
  const generate = async () => {
    try {
      setGenerating(true);
      setErr("");
      await api.post("/washer-accounting/payouts", { washer: washerId, ...pay });
      setPreview(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to generate payout.");
    } finally {
      setGenerating(false);
    }
  };
  return (
    <main className="process-page">
      <div className="process-container">
        <Link className="back-button" to={`/admin/washers/${washerId}`}>
          Back
        </Link>
        <header className="process-header">
          <div>
            <p className="process-eyebrow">Washer Detail</p>
            <h1>{data.washer?.name || "Washer"}</h1>
          </div>
        </header>
        {err && <p className="process-error">{err}</p>}
        <section className="process-grid">
          <article className="process-card">
            <h2>Overview</h2>
            <p>Unpaid Earnings: ₹{data.unpaidEarnings || "0.00"}</p>
            <p>Outstanding Advance: ₹{data.outstandingAdvance || "0.00"}</p>
            <p>Estimated Net Payable: ₹{data.estimatedNetPayable || "0.00"}</p>
          </article>
          <article className="process-card">
            <h2>Give Advance</h2>
            <form className="process-form" onSubmit={give}>
              <label>
                Amount ₹
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={advance.amount}
                  onChange={(e) => setAdvance({ ...advance, amount: e.target.value })}
                />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={advance.advanceDate}
                  onChange={(e) => setAdvance({ ...advance, advanceDate: e.target.value })}
                />
              </label>
              <label>
                Method
                <select
                  value={advance.method}
                  onChange={(e) => setAdvance({ ...advance, method: e.target.value })}
                >
                  {["cash", "bank_transfer", "upi", "cheque", "other"].map((x) => (
                    <option key={x} value={x}>
                      {PAYMENT_METHOD_LABELS[x]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reference
                <input
                  maxLength="150"
                  value={advance.reference}
                  onChange={(e) => setAdvance({ ...advance, reference: e.target.value })}
                />
              </label>
              <label>
                Notes
                <textarea
                  maxLength="500"
                  value={advance.notes}
                  onChange={(e) => setAdvance({ ...advance, notes: e.target.value })}
                />
              </label>
              <button disabled={savingAdvance}>
                {savingAdvance ? "Recording…" : "Give Advance"}
              </button>
            </form>
          </article>
        </section>
        <section className="process-card">
          <h2>Advance</h2>
          <div className="process-table-scroll">
            <table className="process-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Recovered</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4">Loading advances…</td>
                  </tr>
                ) : advances.length ? (
                  advances.map((x) => (
                    <tr key={x._id}>
                      <td>{new Date(x.advanceDate).toLocaleDateString()}</td>
                      <td>₹{x.amount}</td>
                      <td>₹{x.recovered}</td>
                      <td>₹{x.remaining}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No advances recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="process-card washer-account-card">
          <h2>Process History</h2>
          <p>Review washer processing batches from the Process Goods history.</p>
          <Link className="back-button" to="/admin/stock/process-goods">
            Open Process History
          </Link>
        </section>
        <section className="process-card">
          <h2>Generate Payout</h2>
          <p className="process-hint">
            Regular payout day: Thursday. Current default period: Friday to Thursday.
          </p>
          <div className="process-form process-form-wide">
            <label>
              Period Start
              <input
                type="date"
                value={pay.periodStart}
                onChange={(e) => setPay({ ...pay, periodStart: e.target.value })}
              />
            </label>
            <label>
              Period End
              <input
                type="date"
                value={pay.periodEnd}
                onChange={(e) => setPay({ ...pay, periodEnd: e.target.value })}
              />
            </label>
            <label>
              Payout Date
              <input
                type="date"
                value={pay.payoutDate}
                onChange={(e) => setPay({ ...pay, payoutDate: e.target.value })}
              />
            </label>
            <label>
              Payment Method
              <select
                value={pay.paymentMethod}
                onChange={(e) => setPay({ ...pay, paymentMethod: e.target.value })}
              >
                {["cash", "bank_transfer", "upi", "cheque", "other"].map((x) => (
                  <option key={x} value={x}>
                    {PAYMENT_METHOD_LABELS[x]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment Reference
              <input
                maxLength="150"
                value={pay.paymentReference}
                onChange={(e) => setPay({ ...pay, paymentReference: e.target.value })}
              />
            </label>
            <button type="button" onClick={show} disabled={previewing || generating}>
              {previewing ? "Loading Preview…" : "Preview Payout"}
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={!preview || preview.processes.length === 0 || generating}
            >
              {generating ? "Generating Payout…" : "Generate Payout"}
            </button>
          </div>
          {preview && (
            <div className="process-hint">
              <p>
                Gross ₹{preview.grossEarnings} · Outstanding Advance ₹{preview.outstandingAdvance} ·
                Advance Deduction ₹{preview.advanceDeduction} · Net ₹{preview.netPaid}
              </p>
              {preview.processes.length ? (
                preview.processes.map((x) => (
                  <p key={x._id}>
                    {x.destinationStockTypeName}: {x.quantity} PCS × ₹{x.ratePerPiece} = ₹{x.amount}
                  </p>
                ))
              ) : (
                <p>No completed unpaid washing batches are eligible for this period.</p>
              )}
            </div>
          )}
        </section>
        <section className="process-card">
          <h2>Payout History</h2>
          <div className="process-table-scroll">
            <table className="process-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payout No.</th>
                  <th>Gross</th>
                  <th>Advance</th>
                  <th>Net Paid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">Loading payouts…</td>
                  </tr>
                ) : payouts.length ? (
                  payouts.map((x) => (
                    <tr key={x._id}>
                      <td>{new Date(x.payoutDate).toLocaleDateString()}</td>
                      <td>{x.payoutNumber}</td>
                      <td>₹{x.grossEarnings}</td>
                      <td>₹{x.advanceDeduction}</td>
                      <td>₹{x.netPaid}</td>
                      <td>Paid</td>
                      <td>
                        <Link
                          className="back-button"
                          to={`/admin/washers/${washerId}/payouts/${x._id}/slip`}
                        >
                          View Slip
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No payouts generated yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};
export default WasherDetailPage;
