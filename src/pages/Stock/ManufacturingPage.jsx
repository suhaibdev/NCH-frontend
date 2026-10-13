import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../config/axios";
import "./ManufacturingPage.css";

const CATEGORY_LABELS = {
  raw_material: "Raw Material",
  washed_raw_material: "Washed Raw Material",
  finished_goods: "Finished Goods",
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyInput = () => ({ category: "", stockItem: "", quantityUsed: "", wastage: "0" });
const emptyForm = () => ({
  manufacturingDate: today(),
  notes: "",
  inputs: [emptyInput()],
  output: { finishedStockItem: "", quantityProduced: "" },
});

const messageFor = (error, fallback) => error.response?.data?.message || fallback;
const sizeLabel = (size) =>
  size?.lengthValue && size?.widthValue
    ? `${size.lengthValue} ${size.lengthUnit} × ${size.widthValue} ${size.widthUnit}`
    : "Not applicable";

const itemLabel = (item) => {
  const context = [item.supplier?.name, item.size?.lengthValue ? sizeLabel(item.size) : null]
    .filter(Boolean)
    .join(" · ");
  return `${item.productName}${context ? ` — ${context}` : ""} — ${item.currentStock} ${item.unit.toUpperCase()} available`;
};

const ManufacturingPage = () => {
  const [inputItems, setInputItems] = useState([]);
  const [finishedItems, setFinishedItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  const selectedInputs = useMemo(
    () =>
      form.inputs.map((input) => inputItems.find((item) => item._id === input.stockItem) || null),
    [form.inputs, inputItems]
  );
  const selectedOutput = finishedItems.find((item) => item._id === form.output.finishedStockItem);

  const loadSetup = async () => {
    try {
      setLoadingSetup(true);
      const [inputResponse, outputResponse] = await Promise.all([
        api.get("/manufacturing/stock-items", { params: { kind: "input", page: 1, limit: 100 } }),
        api.get("/manufacturing/stock-items", { params: { kind: "output", page: 1, limit: 100 } }),
      ]);
      setInputItems(inputResponse.data.items || []);
      setFinishedItems(outputResponse.data.items || []);
    } catch (requestError) {
      setError(messageFor(requestError, "Unable to load manufacturing stock items."));
    } finally {
      setLoadingSetup(false);
    }
  };

  const loadHistory = async (page = historyPage) => {
    try {
      setLoadingHistory(true);
      const response = await api.get("/manufacturing", {
        params: { page, limit: 20 },
      });
      setHistory(response.data.items || []);
      setPagination(response.data.pagination || null);
    } catch (requestError) {
      setError(messageFor(requestError, "Unable to load manufacturing history."));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [historyPage]);

  const updateInput = (index, field, value) => {
    setForm((previous) => {
      const inputs = previous.inputs.map((input, inputIndex) => {
        if (inputIndex !== index) return input;
        if (field === "category") return { ...input, category: value, stockItem: "" };
        return { ...input, [field]: value };
      });
      return { ...previous, inputs };
    });
  };

  const addInput = () =>
    setForm((previous) => ({ ...previous, inputs: [...previous.inputs, emptyInput()] }));

  const removeInput = (index) => {
    setForm((previous) => ({
      ...previous,
      inputs:
        previous.inputs.length === 1
          ? previous.inputs
          : previous.inputs.filter((_, item) => item !== index),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await api.post("/manufacturing", form);
      setSuccess(`${response.data.entry.manufacturingNumber} completed successfully.`);
      setForm(emptyForm());
      setHistoryPage(1);
      await Promise.all([loadSetup(), loadHistory(1)]);
    } catch (requestError) {
      setFormError(messageFor(requestError, "Unable to complete manufacturing."));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (entryId) => {
    try {
      setDetailError("");
      setReverseReason("");
      const response = await api.get(`/manufacturing/${entryId}`);
      setDetail(response.data.entry);
    } catch (requestError) {
      setDetailError(messageFor(requestError, "Unable to load manufacturing details."));
    }
  };

  const reverse = async (event) => {
    event.preventDefault();
    if (!detail) return;

    setDetailError("");
    setReversing(true);
    try {
      await api.post(`/manufacturing/${detail._id}/reverse`, { reason: reverseReason });
      setDetail(null);
      setSuccess("Manufacturing entry reversed successfully.");
      setHistoryPage(1);
      await Promise.all([loadSetup(), loadHistory(1)]);
    } catch (requestError) {
      setDetailError(messageFor(requestError, "Unable to reverse manufacturing."));
    } finally {
      setReversing(false);
    }
  };

  const selectedInputIds = new Set(form.inputs.map((input) => input.stockItem).filter(Boolean));
  const formReady =
    form.inputs.length > 0 &&
    form.inputs.every(
      (input) => input.category && input.stockItem && Number(input.quantityUsed) > 0
    ) &&
    form.output.finishedStockItem &&
    Number(form.output.quantityProduced) > 0;

  return (
    <main className="manufacturing-page">
      <div className="manufacturing-container">
        <Link className="manufacturing-back" to="/admin/stock">
          Back
        </Link>

        <header className="manufacturing-header">
          <p>Stock Operations</p>
          <h1>Manufacturing</h1>
          <span>Combine Raw and Washed materials into one Finished Goods output.</span>
        </header>

        {error && (
          <section className="manufacturing-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                loadSetup();
                loadHistory();
              }}
            >
              Retry
            </button>
          </section>
        )}

        <form className="manufacturing-form" onSubmit={submit}>
          <section className="manufacturing-card manufacturing-details">
            <h2>Manufacturing Details</h2>
            <label>
              Manufacturing Date *
              <input
                type="date"
                value={form.manufacturingDate}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, manufacturingDate: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Notes
              <textarea
                maxLength="500"
                value={form.notes}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, notes: event.target.value }))
                }
              />
            </label>
          </section>

          <section className="manufacturing-card">
            <div className="manufacturing-section-heading">
              <div>
                <h2>Inputs</h2>
                <p>
                  Wastage is included in Quantity Used. Stock is deducted by Quantity Used only.
                </p>
              </div>
              <button type="button" className="secondary-button" onClick={addInput}>
                + Add Input
              </button>
            </div>

            {loadingSetup ? (
              <p className="manufacturing-state">Loading available input stock…</p>
            ) : inputItems.length === 0 ? (
              <p className="manufacturing-state">
                No Raw or Washed stock with an available balance was found.
              </p>
            ) : (
              <div className="manufacturing-input-list">
                {form.inputs.map((input, index) => {
                  const selectedItem = selectedInputs[index];
                  const options = inputItems.filter(
                    (item) =>
                      item.category === input.category &&
                      (!selectedInputIds.has(item._id) || item._id === input.stockItem)
                  );
                  return (
                    <article className="manufacturing-input-row" key={index}>
                      <div className="manufacturing-input-heading">
                        <h3>Input {index + 1}</h3>
                        <button
                          type="button"
                          className="text-button"
                          disabled={form.inputs.length === 1}
                          onClick={() => removeInput(index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="manufacturing-input-grid">
                        <label>
                          Category *
                          <select
                            value={input.category}
                            onChange={(event) => updateInput(index, "category", event.target.value)}
                            required
                          >
                            <option value="">Select category</option>
                            <option value="raw_material">Raw Material</option>
                            <option value="washed_raw_material">Washed Raw Material</option>
                          </select>
                        </label>
                        <label>
                          Product / Stock Item *
                          <select
                            value={input.stockItem}
                            disabled={!input.category}
                            onChange={(event) =>
                              updateInput(index, "stockItem", event.target.value)
                            }
                            required
                          >
                            <option value="">Select available stock</option>
                            {options.map((item) => (
                              <option key={item._id} value={item._id}>
                                {itemLabel(item)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Quantity Used *
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={input.quantityUsed}
                            onChange={(event) =>
                              updateInput(index, "quantityUsed", event.target.value)
                            }
                            required
                          />
                        </label>
                        <label>
                          Wastage Included
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={input.wastage}
                            onChange={(event) => updateInput(index, "wastage", event.target.value)}
                            required
                          />
                        </label>
                      </div>
                      {selectedItem && (
                        <dl className="manufacturing-item-context">
                          <div>
                            <dt>Available</dt>
                            <dd>
                              {selectedItem.currentStock} {selectedItem.unit.toUpperCase()}
                            </dd>
                          </div>
                          <div>
                            <dt>Supplier</dt>
                            <dd>{selectedItem.supplier?.name || "Not applicable"}</dd>
                          </div>
                          <div>
                            <dt>Size</dt>
                            <dd>{sizeLabel(selectedItem.size)}</dd>
                          </div>
                          <div>
                            <dt>Unit</dt>
                            <dd>{selectedItem.unit.toUpperCase()}</dd>
                          </div>
                        </dl>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="manufacturing-card">
            <h2>Finished Goods Output</h2>
            {loadingSetup ? (
              <p className="manufacturing-state">Loading Finished Goods…</p>
            ) : finishedItems.length === 0 ? (
              <p className="manufacturing-state">
                No Finished Goods products are configured. Add one in Stock Management first.
              </p>
            ) : (
              <div className="manufacturing-output-grid">
                <label>
                  Finished Product *
                  <select
                    value={form.output.finishedStockItem}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        output: { ...previous.output, finishedStockItem: event.target.value },
                      }))
                    }
                    required
                  >
                    <option value="">Select Finished Goods</option>
                    {finishedItems.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.productName} — {item.currentStock} {item.unit.toUpperCase()} current
                        stock
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity Produced *
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.output.quantityProduced}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        output: { ...previous.output, quantityProduced: event.target.value },
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Unit
                  <input
                    value={
                      selectedOutput
                        ? selectedOutput.unit.toUpperCase()
                        : "Select a Finished Product"
                    }
                    readOnly
                  />
                </label>
              </div>
            )}
          </section>

          <section className="manufacturing-card">
            <h2>Summary</h2>
            {selectedInputs.every(Boolean) && selectedOutput && form.output.quantityProduced ? (
              <div className="manufacturing-summary">
                <div>
                  <h3>Inputs</h3>
                  {selectedInputs.map((item, index) => (
                    <p key={item._id}>
                      <strong>{item.productName}</strong>: {form.inputs[index].quantityUsed}{" "}
                      {item.unit.toUpperCase()} used
                      {Number(form.inputs[index].wastage) > 0 &&
                        ` · ${form.inputs[index].wastage} ${item.unit.toUpperCase()} wastage included`}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>Output</h3>
                  <p>
                    <strong>{selectedOutput.productName}</strong>: {form.output.quantityProduced}{" "}
                    {selectedOutput.unit.toUpperCase()} produced
                  </p>
                </div>
              </div>
            ) : (
              <p className="manufacturing-state">
                Select all inputs and one Finished Goods output to review the manufacturing summary.
              </p>
            )}
            {formError && <p className="manufacturing-error-text">{formError}</p>}
            {success && <p className="manufacturing-success">{success}</p>}
            <div className="manufacturing-actions">
              <button type="submit" disabled={!formReady || saving || loadingSetup}>
                {saving ? "Completing Manufacturing…" : "Complete Manufacturing"}
              </button>
            </div>
          </section>
        </form>

        <section className="manufacturing-card">
          <div className="manufacturing-section-heading">
            <div>
              <h2>Manufacturing History</h2>
              <p>Completed entries remain permanent. Reverse an entry instead of deleting it.</p>
            </div>
          </div>
          {loadingHistory ? (
            <p className="manufacturing-state">Loading manufacturing history…</p>
          ) : history.length === 0 ? (
            <p className="manufacturing-state">No manufacturing entries have been completed yet.</p>
          ) : (
            <div className="manufacturing-table-scroll">
              <table className="manufacturing-table">
                <thead>
                  <tr>
                    <th>Manufacturing No.</th>
                    <th>Date</th>
                    <th>Finished Product</th>
                    <th>Produced</th>
                    <th>Inputs</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.manufacturingNumber}</td>
                      <td>{new Date(entry.manufacturingDate).toLocaleDateString()}</td>
                      <td>{entry.output?.finishedStockItemName || entry.finishedProductName}</td>
                      <td>
                        {entry.output?.quantityProduced || entry.quantityManufactured}{" "}
                        {entry.output?.unit?.toUpperCase() || entry.finishedUnit?.toUpperCase()}
                      </td>
                      <td>{entry.materials.length}</td>
                      <td>
                        <span className={`manufacturing-status ${entry.status}`}>
                          {entry.status === "reversed" ? "Reversed" : "Completed"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => openDetail(entry._id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pagination?.totalPages > 1 && (
            <div className="manufacturing-pagination">
              <button
                type="button"
                disabled={historyPage === 1}
                onClick={() => setHistoryPage((page) => page - 1)}
              >
                Previous
              </button>
              <span>
                Page {historyPage} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={historyPage >= pagination.totalPages}
                onClick={() => setHistoryPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>

        {detail && (
          <div className="manufacturing-modal-backdrop">
            <section
              className="manufacturing-modal"
              aria-modal="true"
              role="dialog"
              aria-labelledby="manufacturing-detail-title"
            >
              <button type="button" className="manufacturing-back" onClick={() => setDetail(null)}>
                Back
              </button>
              <h2 id="manufacturing-detail-title">{detail.manufacturingNumber}</h2>
              <p className="manufacturing-modal-meta">
                {new Date(detail.manufacturingDate).toLocaleDateString()} · Created by{" "}
                {detail.createdBy || "Admin"}
              </p>
              <h3>Inputs</h3>
              <div className="manufacturing-detail-inputs">
                {detail.materials.map((input) => (
                  <article key={input.item}>
                    <strong>{input.productName}</strong>
                    <span>{CATEGORY_LABELS[input.category]}</span>
                    <span>Supplier: {input.supplierName || "Not applicable"}</span>
                    <span>Size: {sizeLabel(input.size)}</span>
                    <span>
                      {input.quantityUsed} {input.unit.toUpperCase()} used · {input.wastage} wastage
                      included
                    </span>
                  </article>
                ))}
              </div>
              <h3>Finished Output</h3>
              <p>
                <strong>{detail.output.finishedStockItemName}</strong>:{" "}
                {detail.output.quantityProduced} {detail.output.unit.toUpperCase()} produced
              </p>
              {detail.notes && (
                <p>
                  <strong>Notes:</strong> {detail.notes}
                </p>
              )}
              {detail.status === "reversed" ? (
                <p className="manufacturing-reversed">
                  Reversed on {new Date(detail.reversedAt).toLocaleDateString()}:{" "}
                  {detail.reverseReason}
                </p>
              ) : (
                <form className="manufacturing-reverse-form" onSubmit={reverse}>
                  <h3>Reverse Manufacturing</h3>
                  <label>
                    Reason *
                    <textarea
                      value={reverseReason}
                      maxLength="500"
                      onChange={(event) => setReverseReason(event.target.value)}
                      required
                    />
                  </label>
                  <p>
                    Reversal restores all input quantities and subtracts the original Finished Goods
                    output.
                  </p>
                  {detailError && <p className="manufacturing-error-text">{detailError}</p>}
                  <div className="manufacturing-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setDetail(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="danger-button" disabled={reversing}>
                      {reversing ? "Reversing…" : "Reverse Manufacturing"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default ManufacturingPage;
