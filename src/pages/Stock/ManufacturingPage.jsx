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
const washedMaterialInput = () => ({
  kind: "washed",
  category: "washed_raw_material",
  stockItem: "",
  quantityUsed: "",
  wastage: "0",
});
const labelInput = () => ({
  kind: "label",
  category: "raw_material",
  stockItem: "",
  quantityUsed: "",
  wastage: "0",
});
const additionalInput = () => ({
  kind: "additional",
  category: "raw_material",
  stockItem: "",
  quantityUsed: "",
  wastage: "0",
});
const emptyForm = () => ({
  manufacturingDate: today(),
  batchNumber: "",
  notes: "",
  inputs: [washedMaterialInput(), labelInput()],
  output: { finishedStockItem: "", quantityProduced: "" },
});

const messageFor = (error, fallback) => error.response?.data?.message || fallback;
const sizeLabel = (size) =>
  size?.lengthValue && size?.widthValue
    ? `${size.lengthValue} ${size.lengthUnit} × ${size.widthValue} ${size.widthUnit}`
    : "Not applicable";

const itemLabel = (item) => {
  const context = [
    item.stockType?.name,
    item.supplier?.name,
    item.size?.lengthValue ? sizeLabel(item.size) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `${item.productName}${context ? ` — ${context}` : ""} — ${item.currentStock} ${item.unit.toUpperCase()} available`;
};

const ItemContext = ({ item }) => (
  <dl className="manufacturing-item-context">
    <div>
      <dt>Available</dt>
      <dd>
        {item.currentStock} {item.unit.toUpperCase()}
      </dd>
    </div>
    <div>
      <dt>Supplier</dt>
      <dd>{item.supplier?.name || "Not applicable"}</dd>
    </div>
    <div>
      <dt>Size</dt>
      <dd>{sizeLabel(item.size)}</dd>
    </div>
    <div>
      <dt>Unit</dt>
      <dd>{item.unit.toUpperCase()}</dd>
    </div>
  </dl>
);

const ManufacturingPage = () => {
  const [inputItems, setInputItems] = useState([]);
  const [washedItems, setWashedItems] = useState([]);
  const [labelItems, setLabelItems] = useState([]);
  const [labelStockType, setLabelStockType] = useState(null);
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

  const allInputItems = useMemo(() => {
    const byId = new Map();
    [...inputItems, ...washedItems, ...labelItems].forEach((item) => byId.set(item._id, item));
    return [...byId.values()];
  }, [inputItems, labelItems, washedItems]);
  const selectedInputs = useMemo(
    () =>
      form.inputs.map(
        (input) => allInputItems.find((item) => item._id === input.stockItem) || null
      ),
    [allInputItems, form.inputs]
  );
  const selectedOutput = finishedItems.find((item) => item._id === form.output.finishedStockItem);

  const loadSetup = async () => {
    try {
      setLoadingSetup(true);
      const [inputResponse, washedResponse, labelResponse, outputResponse] = await Promise.all([
        api.get("/manufacturing/stock-items", { params: { kind: "input", page: 1, limit: 100 } }),
        api.get("/manufacturing/stock-items", { params: { kind: "washed", page: 1, limit: 100 } }),
        api.get("/manufacturing/stock-items", { params: { kind: "label", page: 1, limit: 100 } }),
        api.get("/manufacturing/stock-items", { params: { kind: "output", page: 1, limit: 100 } }),
      ]);
      setInputItems(inputResponse.data.items || []);
      setWashedItems(washedResponse.data.items || []);
      setLabelItems(labelResponse.data.items || []);
      setLabelStockType(labelResponse.data.labelStockType || null);
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
    setForm((previous) => ({ ...previous, inputs: [...previous.inputs, additionalInput()] }));

  const removeInput = (index) => {
    setForm((previous) => ({
      ...previous,
      inputs: index < 2 ? previous.inputs : previous.inputs.filter((_, item) => item !== index),
    }));
  };

  const updateOutputQuantity = (quantityProduced) => {
    setForm((previous) => ({
      ...previous,
      output: { ...previous.output, quantityProduced },
      inputs: previous.inputs.map((input) =>
        input.kind === "label" ? { ...input, quantityUsed: quantityProduced, wastage: "0" } : input
      ),
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
  const additionalInputItems = inputItems.filter(
    (item) => item.stockType?._id !== labelStockType?._id
  );
  const formReady =
    form.inputs.length > 0 &&
    form.inputs.every(
      (input) =>
        input.category &&
        input.stockItem &&
        Number(input.quantityUsed) > 0 &&
        Number(input.wastage) >= 0
    ) &&
    form.batchNumber.trim() &&
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
              Batch No. *
              <input
                type="text"
                maxLength="100"
                value={form.batchNumber}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, batchNumber: event.target.value }))
                }
                required
              />
            </label>
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
                  Finished Quantity *
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.output.quantityProduced}
                    onChange={(event) => updateOutputQuantity(event.target.value)}
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
            <p className="manufacturing-label-requirement">
              Label Required: {form.output.quantityProduced || 0} PCS
            </p>
          </section>

          <section className="manufacturing-card">
            <div className="manufacturing-section-heading">
              <div>
                <h2>Materials Used</h2>
                <p>
                  Wastage is included in Quantity Used. Stock is deducted by Quantity Used only.
                </p>
              </div>
            </div>

            {loadingSetup ? (
              <p className="manufacturing-state">Loading available input stock…</p>
            ) : (
              <div className="manufacturing-input-list">
                {form.inputs.map((input, index) => {
                  const selectedItem = selectedInputs[index];
                  const isWashedInput = input.kind === "washed";
                  const isLabelInput = input.kind === "label";
                  const isAdditionalInput = input.kind === "additional";
                  const sourceItems = isWashedInput
                    ? washedItems
                    : isLabelInput
                      ? labelItems
                      : additionalInputItems;
                  const options = sourceItems.filter(
                    (item) =>
                      item.category === input.category &&
                      (!selectedInputIds.has(item._id) || item._id === input.stockItem)
                  );
                  return (
                    <React.Fragment key={`${input.kind}-${index}`}>
                      <article className="manufacturing-input-row">
                        <div className="manufacturing-input-heading">
                          <h3>
                            {isWashedInput
                              ? "Washed Raw Material"
                              : isLabelInput
                                ? "Label"
                                : `Additional Material ${index - 1}`}
                          </h3>
                          {isAdditionalInput && (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => removeInput(index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {isLabelInput && !labelStockType ? (
                          <p className="manufacturing-state">No Label Stock Type is configured.</p>
                        ) : isLabelInput && labelItems.length === 0 ? (
                          <p className="manufacturing-state">No Label stock item is configured.</p>
                        ) : isWashedInput && washedItems.length === 0 ? (
                          <p className="manufacturing-state">
                            No Washed Raw Material stock is available.
                          </p>
                        ) : (
                          <div className="manufacturing-input-grid">
                            {isAdditionalInput && (
                              <label>
                                Material Type *
                                <select
                                  value={input.category}
                                  onChange={(event) =>
                                    updateInput(index, "category", event.target.value)
                                  }
                                  required
                                >
                                  <option value="raw_material">Raw Material</option>
                                  <option value="washed_raw_material">Washed Raw Material</option>
                                </select>
                              </label>
                            )}
                            <label>
                              {isLabelInput ? "Label Item *" : "Product / Item *"}
                              <select
                                value={input.stockItem}
                                onChange={(event) =>
                                  updateInput(index, "stockItem", event.target.value)
                                }
                                required
                              >
                                <option value="">
                                  {isLabelInput
                                    ? "Select Label"
                                    : isWashedInput
                                      ? "Select Washed Raw Material"
                                      : "Select available stock"}
                                </option>
                                {options.map((item) => (
                                  <option key={item._id} value={item._id}>
                                    {itemLabel(item)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {isLabelInput ? (
                              <>
                                <label>
                                  Label Quantity Used
                                  <input value={`${input.quantityUsed || 0} PCS`} readOnly />
                                  <span className="manufacturing-field-note">
                                    Automatically matches Finished Quantity.
                                  </span>
                                </label>
                                <label>
                                  Label Wastage
                                  <input value="0 PCS" readOnly />
                                </label>
                              </>
                            ) : (
                              <>
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
                                    onChange={(event) =>
                                      updateInput(index, "wastage", event.target.value)
                                    }
                                    required
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        )}
                        {selectedItem && <ItemContext item={selectedItem} />}
                      </article>
                      {index === 1 && (
                        <div className="manufacturing-additional-heading">
                          <div>
                            <h3>Additional Materials</h3>
                            <p>Add Raw Material or Washed Raw Material when needed.</p>
                          </div>
                          <button type="button" className="secondary-button" onClick={addInput}>
                            + Add Input
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </section>

          <section className="manufacturing-card">
            <h2>Summary</h2>
            {selectedInputs.every(Boolean) && selectedOutput && form.output.quantityProduced ? (
              <div className="manufacturing-summary">
                <div>
                  <h3>Materials Used</h3>
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
            <label className="manufacturing-notes-field">
              Notes
              <textarea
                rows="3"
                maxLength="500"
                value={form.notes}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, notes: event.target.value }))
                }
              />
            </label>
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
                    <th>Batch No.</th>
                    <th>Manufacturing No.</th>
                    <th>Manufacturing Date</th>
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
                      <td>{entry.batchNumber || "Legacy record"}</td>
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
              <h2 id="manufacturing-detail-title">
                {detail.batchNumber || detail.manufacturingNumber}
              </h2>
              <p className="manufacturing-modal-meta">
                <strong>Batch No.:</strong>{" "}
                {detail.batchNumber || "Not recorded for this legacy entry"}
              </p>
              <p className="manufacturing-modal-meta">
                {new Date(detail.manufacturingDate).toLocaleDateString()} · Created by{" "}
                {detail.createdBy || "Admin"}
              </p>
              <h3>Materials Used</h3>
              <div className="manufacturing-detail-inputs">
                {detail.materials.map((input) => (
                  <article key={input.item}>
                    <strong>
                      {input.stockTypeName?.toLowerCase() === "label"
                        ? "Label Used"
                        : input.category === "washed_raw_material"
                          ? "Washed Raw Material Used"
                          : "Additional Material"}
                    </strong>
                    <span>{input.productName}</span>
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
