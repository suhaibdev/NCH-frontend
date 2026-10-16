import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../config/axios";
import ManufacturingHistoryTable from "./ManufacturingHistoryTable";
import "./ManufacturingPage.css";

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

const ManufacturingPage = () => {
  const [inputItems, setInputItems] = useState([]);
  const [washedItems, setWashedItems] = useState([]);
  const [labelItems, setLabelItems] = useState([]);
  const [labelStockType, setLabelStockType] = useState(null);
  const [finishedItems, setFinishedItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState("");
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

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get("/manufacturing", {
        params: { page: 1, limit: 5 },
      });
      setHistory(response.data.items || []);
      setExpandedHistoryId("");
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
  }, []);

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
      await Promise.all([loadSetup(), loadHistory()]);
    } catch (requestError) {
      setFormError(messageFor(requestError, "Unable to complete manufacturing."));
    } finally {
      setSaving(false);
    }
  };

  const reverse = async (event, entry) => {
    event.preventDefault();
    if (!entry) return;

    setDetailError("");
    setReversing(true);
    try {
      await api.post(`/manufacturing/${entry._id}/reverse`, { reason: reverseReason });
      setExpandedHistoryId("");
      setSuccess("Manufacturing entry reversed successfully.");
      await Promise.all([loadSetup(), loadHistory()]);
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
                  Quantity *
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
                        ) : isLabelInput ? (
                          <div className="manufacturing-input-grid manufacturing-label-grid">
                            <label>
                              Label Item *
                              <select
                                value={input.stockItem}
                                onChange={(event) =>
                                  updateInput(index, "stockItem", event.target.value)
                                }
                                required
                              >
                                <option value="">Select Label</option>
                                {options.map((item) => (
                                  <option key={item._id} value={item._id}>
                                    {itemLabel(item)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Available
                              <input
                                value={
                                  selectedItem
                                    ? `${selectedItem.currentStock} ${selectedItem.unit.toUpperCase()}`
                                    : "Select a Label Item"
                                }
                                readOnly
                              />
                            </label>
                            <label>
                              Required
                              <input value={`${input.quantityUsed || 0} PCS`} readOnly />
                              <span className="manufacturing-field-note">Auto</span>
                            </label>
                          </div>
                        ) : (
                          <div
                            className={`manufacturing-input-grid ${
                              isWashedInput
                                ? "manufacturing-washed-grid"
                                : "manufacturing-additional-grid"
                            }`}
                          >
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
                              Item *
                              <select
                                value={input.stockItem}
                                onChange={(event) =>
                                  updateInput(index, "stockItem", event.target.value)
                                }
                                required
                              >
                                <option value="">
                                  {isWashedInput
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
                            <label>
                              Available
                              <input
                                value={
                                  selectedItem
                                    ? `${selectedItem.currentStock} ${selectedItem.unit.toUpperCase()}`
                                    : "Select an Item"
                                }
                                readOnly
                              />
                            </label>
                            <label>
                              Qty Used *
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
                              Wastage *
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
                          </div>
                        )}
                        {selectedItem && isWashedInput && (
                          <div className="manufacturing-item-metadata">
                            <span>Supplier: {selectedItem.supplier?.name || "Not applicable"}</span>
                            <span>Size: {sizeLabel(selectedItem.size)}</span>
                          </div>
                        )}
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
            <h2>Manufacturing Summary</h2>
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
                  <p>
                    <strong>Label Required:</strong> {form.output.quantityProduced} PCS
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
            <h2>Manufacturing History</h2>
            <Link
              className="secondary-button manufacturing-history-link"
              to="/admin/stock/manufacturing/history"
            >
              View All History
            </Link>
          </div>
          {loadingHistory ? (
            <p className="manufacturing-state">Loading manufacturing history…</p>
          ) : history.length === 0 ? (
            <p className="manufacturing-state">No manufacturing entries have been completed yet.</p>
          ) : (
            <ManufacturingHistoryTable
              items={history}
              expandedId={expandedHistoryId}
              onToggle={(entryId) => {
                setDetailError("");
                setReverseReason("");
                setExpandedHistoryId((current) => (current === entryId ? "" : entryId));
              }}
              renderExpandedActions={(entry) =>
                entry.status !== "reversed" && (
                  <form
                    className="manufacturing-reverse-form"
                    onSubmit={(event) => reverse(event, entry)}
                  >
                    <h3>Reverse Manufacturing</h3>
                    <label>
                      Reason *
                      <textarea
                        rows="3"
                        value={reverseReason}
                        maxLength="500"
                        onChange={(event) => setReverseReason(event.target.value)}
                        required
                      />
                    </label>
                    <p>Reversal restores inputs and subtracts the saved Finished Goods output.</p>
                    {detailError && <p className="manufacturing-error-text">{detailError}</p>}
                    <div className="manufacturing-actions">
                      <button type="submit" className="danger-button" disabled={reversing}>
                        {reversing ? "Reversing…" : "Reverse Manufacturing"}
                      </button>
                    </div>
                  </form>
                )
              }
            />
          )}
        </section>
      </div>
    </main>
  );
};

export default ManufacturingPage;
