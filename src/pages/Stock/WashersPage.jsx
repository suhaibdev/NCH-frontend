import React, { useEffect, useState } from "react";
import api from "../../config/axios";
import "./ProcessGoodsPage.css";

const emptyForm = { name: "", phone: "", address: "", defaultRatePerPiece: "0.00", washingRates: [], notes: "", isActive: true };
const messageFor = (error, fallback) => error.response?.data?.message || fallback;

const WashersPage = () => {
  const [washers, setWashers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [selected, setSelected] = useState(null);
  const [outputTypes, setOutputTypes] = useState([]);

  const loadWashers = async () => {
    try {
      setLoading(true); setError("");
      const response = await api.get("/washers", { params: { page, limit: 20, search } });
      setWashers(response.data.items || []); setPagination(response.data.pagination || null);
    } catch (requestError) { setError(messageFor(requestError, "Unable to load washers.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { const id = window.setTimeout(loadWashers, 250); return () => window.clearTimeout(id); }, [page, search]);
  useEffect(() => { api.get("/stock/types", { params: { category: "washed_raw_material" } }).then((response) => setOutputTypes((response.data || []).filter((type) => type.requiresSupplier && type.requiresSize))).catch(() => setOutputTypes([])); }, []);
  const updateForm = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const edit = (washer) => { setSelected(null); setEditingId(washer._id); setForm({ name: washer.name, phone: washer.phone || "", address: washer.address || "", defaultRatePerPiece: washer.defaultRatePerPiece || "0.00", washingRates: (washer.washingRates || []).map((rate) => ({ stockType: String(rate.stockType), ratePerPiece: rate.ratePerPiece })), notes: washer.notes || "", isActive: washer.isActive }); setFormError(""); };
  const updateRate = (stockType, value) => setForm((previous) => ({ ...previous, washingRates: [...previous.washingRates.filter((rate) => rate.stockType !== stockType), { stockType, ratePerPiece: value }] }));
  const reset = () => { setEditingId(null); setForm(emptyForm); setFormError(""); };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setFormError("");
    try {
      if (editingId) await api.put(`/washers/${editingId}`, form); else await api.post("/washers", form);
      reset(); await loadWashers();
    } catch (requestError) { setFormError(messageFor(requestError, "Unable to save washer.")); }
    finally { setSaving(false); }
  };
  return <main className="process-page"><div className="process-container">
    <header className="process-header"><div><p className="process-eyebrow">NCH Factory Management</p><h1>Washers</h1><p>Maintain active washers and their default per-PCS processing rate.</p></div></header>
    <div className="process-grid washers-grid">
      <section className="process-card"><h2>{editingId ? "Edit Washer" : "Add Washer"}</h2><form className="process-form" onSubmit={submit}>
        <label>Name *<input name="name" value={form.name} onChange={updateForm} maxLength="150" required /></label>
        <label>Contact Number<input name="phone" value={form.phone} onChange={updateForm} inputMode="numeric" maxLength="10" placeholder="10 digits" /></label>
        <label>Default Rate per PCS (₹)<input name="defaultRatePerPiece" value={form.defaultRatePerPiece} onChange={updateForm} inputMode="decimal" required /></label>
        <fieldset className="washing-rates"><legend>Washing Rates</legend>{outputTypes.length === 0 ? <p>No eligible Washed Output Types are configured yet.</p> : outputTypes.map((type) => { const rate = form.washingRates.find((item) => item.stockType === String(type._id)); return <label key={type._id}>{type.name}<span>₹ <input inputMode="decimal" value={rate?.ratePerPiece || ""} onChange={(event) => updateRate(String(type._id), event.target.value)} placeholder="0.00" /> / PCS</span></label>; })}</fieldset>
        <label>Address<textarea name="address" value={form.address} onChange={updateForm} maxLength="500" /></label>
        <label>Notes<textarea name="notes" value={form.notes} onChange={updateForm} maxLength="1000" /></label>
        <label className="checkbox-field"><input type="checkbox" name="isActive" checked={form.isActive} onChange={updateForm} /> Active washer</label>
        {formError && <p className="process-error">{formError}</p>}<div className="process-actions"><button disabled={saving} type="submit">{saving ? "Saving…" : editingId ? "Save Washer" : "Add Washer"}</button>{editingId && <button type="button" className="secondary-button" onClick={reset}>Cancel</button>}</div>
      </form></section>
      <section className="process-card"><div className="process-card-heading"><div><h2>Washer Directory</h2><p>Search by name or contact number.</p></div><input className="process-search" type="search" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search washers" /></div>
        {loading ? <p className="process-state">Loading washers…</p> : error ? <div className="process-error-block"><p>{error}</p><button type="button" onClick={loadWashers}>Retry</button></div> : washers.length === 0 ? <p className="process-state">No washers found. Add the first washer to begin.</p> : <div className="process-table-scroll"><table className="process-table"><thead><tr><th>Name</th><th>Phone</th><th>Default Rate</th><th>Status</th><th>Actions</th></tr></thead><tbody>{washers.map((washer) => <tr key={washer._id}><td><button type="button" className="table-link" onClick={() => setSelected(washer)}>{washer.name}</button></td><td>{washer.phone || "—"}</td><td>₹{washer.defaultRatePerPiece}/PCS</td><td><span className={`process-status ${washer.isActive ? "active" : "inactive"}`}>{washer.isActive ? "Active" : "Inactive"}</span></td><td><button type="button" className="secondary-button compact-button" onClick={() => edit(washer)}>Edit</button></td></tr>)}</tbody></table></div>}
        {pagination?.totalPages > 1 && <div className="process-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pagination.totalPages}</span><button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}
      </section>
    </div>
    {selected && <section className="process-card washer-detail"><button type="button" className="back-button" onClick={() => setSelected(null)}>Back</button><h2>{selected.name}</h2><dl><dt>Contact Number</dt><dd>{selected.phone || "Not provided"}</dd><dt>Default Rate</dt><dd>₹{selected.defaultRatePerPiece}/PCS</dd><dt>Configured Output Rates</dt><dd>{(selected.washingRates || []).length ? selected.washingRates.map((rate) => <div key={rate.stockType}>{rate.stockTypeNameSnapshot}: ₹{rate.ratePerPiece}/PCS</div>) : "No output-specific rates yet"}</dd><dt>Address</dt><dd>{selected.address || "Not provided"}</dd><dt>Notes</dt><dd>{selected.notes || "No notes"}</dd><dt>Status</dt><dd>{selected.isActive ? "Active" : "Inactive"}</dd></dl><p className="process-hint">Advance, payout and printable payout-slip APIs are available for this washer. The dedicated accounting detail screen is the next UI refinement.</p></section>}
  </div></main>;
};
export default WashersPage;
