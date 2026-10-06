import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../../config/axios";

import "../AdminCommon.css";
import "./SuppliersPage.css";
import "./ReceiveMaterialPage.css";

const CONDITIONS = [
  { value: "not_washed", label: "Not Washed", category: "raw_material" },
  { value: "already_washed", label: "Already Washed", category: "washed_raw_material" },
];

const SIZE_UNITS = ["m", "cm", "inch", "ft"];

const localToday = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

const EMPTY_FORM = () => ({
  materialCondition: "not_washed",
  stockType: "",
  size: { lengthValue: "", lengthUnit: "m", widthValue: "", widthUnit: "inch" },
  quantity: "",
  pricePerPiece: "",
  receivedDate: localToday(),
  supplierBillNumber: "",
  notes: "",
});

const formatRupees = (paise) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(paise || 0) / 100);

const parsePreviewPaise = (value) => {
  const source = String(value || "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(source)) return null;
  const [whole, fraction = ""] = source.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
};

const ReceiveMaterialPage = () => {
  const { supplierId } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [supplierState, setSupplierState] = useState("loading");
  const [supplierError, setSupplierError] = useState("");
  const [supplierReload, setSupplierReload] = useState(0);

  const [form, setForm] = useState(EMPTY_FORM);
  const [clothTypes, setClothTypes] = useState([]);
  const [typesState, setTypesState] = useState("idle");
  const [typesError, setTypesError] = useState("");
  const [typesReload, setTypesReload] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const selectedCondition = CONDITIONS.find(
    (condition) => condition.value === form.materialCondition
  );

  const selectedType = clothTypes.find(
    (stockType) => stockType._id === form.stockType
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadSupplier = async () => {
      try {
        setSupplierState("loading");
        setSupplierError("");
        const response = await api.get(`/suppliers/${supplierId}`, { signal: controller.signal });
        setSupplier(response.data);
        setSupplierState("success");
      } catch (err) {
        if (err.code === "ERR_CANCELED" || controller.signal.aborted) return;
        setSupplierState(err.response?.status === 404 ? "notFound" : "error");
        setSupplierError(err.response?.data?.message || "Unable to load supplier.");
      }
    };

    loadSupplier();
    return () => controller.abort();
  }, [supplierId, supplierReload]);

  useEffect(() => {
    const controller = new AbortController();

    const loadClothTypes = async () => {
      try {
        setTypesState("loading");
        setTypesError("");
        const response = await api.get("/stock/types", {
          params: { category: selectedCondition.category },
          signal: controller.signal,
        });
        const eligible = Array.isArray(response.data)
          ? response.data.filter((type) => type.requiresSupplier && type.requiresSize)
          : [];
        setClothTypes(eligible);
        setTypesState("success");
      } catch (err) {
        if (err.code === "ERR_CANCELED" || controller.signal.aborted) return;
        setClothTypes([]);
        setTypesState("error");
        setTypesError(err.response?.data?.message || "Unable to load cloth Stock Types.");
      }
    };

    loadClothTypes();
    return () => controller.abort();
  }, [selectedCondition.category, typesReload]);

  const purchaseAmountPaise = useMemo(() => {
    const pricePaise = parsePreviewPaise(form.pricePerPiece);
    const quantity = Number(form.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || pricePaise === null) return null;
    const total = quantity * pricePaise;
    return Number.isSafeInteger(total) ? total : null;
  }, [form.pricePerPiece, form.quantity]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setSuccess(null);
    setError("");
    setForm((previous) => name.startsWith("size.")
      ? {
          ...previous,
          size: { ...previous.size, [name.replace("size.", "")]: value },
        }
      : { ...previous, [name]: value });
  };

  const updateCondition = (event) => {
    const materialCondition = event.target.value;
    setSuccess(null);
    setError("");
    setForm((previous) => ({ ...previous, materialCondition, stockType: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving || !supplier) return;

    if (!form.stockType) {
      setError("Select a configured cloth Stock Type.");
      return;
    }
    if (!Number.isSafeInteger(Number(form.quantity)) || Number(form.quantity) <= 0) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }
    if (parsePreviewPaise(form.pricePerPiece) === null) {
      setError("Price per PCS is invalid.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const response = await api.post("/material-receipts", {
        supplier: supplier._id,
        materialCondition: form.materialCondition,
        stockType: form.stockType,
        size: form.size,
        quantity: form.quantity,
        pricePerPiece: form.pricePerPiece,
        receivedDate: form.receivedDate,
        supplierBillNumber: form.supplierBillNumber,
        notes: form.notes,
      });
      setSuccess(response.data);
      setForm((previous) => ({
        ...EMPTY_FORM(),
        materialCondition: previous.materialCondition,
        size: previous.size,
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to receive material.");
    } finally {
      setIsSaving(false);
    }
  };

  if (supplierState === "loading") {
    return <div className="ep-container suppliers-page suppliers-state">Loading supplier...</div>;
  }

  if (supplierState === "notFound") {
    return <div className="ep-container suppliers-page suppliers-state"><p>Supplier not found.</p><Link className="ep-btn ep-btn-secondary" to="/admin/suppliers">Back to Suppliers</Link></div>;
  }

  if (supplierState === "error") {
    return <div className="ep-container suppliers-page suppliers-state suppliers-error-state"><p>{supplierError}</p><button type="button" className="ep-btn ep-btn-secondary" onClick={() => setSupplierReload((value) => value + 1)}>Retry</button></div>;
  }

  return (
    <div className="ep-container suppliers-page receive-material-page">
      <div className="suppliers-header">
        <div>
          <Link to={`/admin/suppliers/${supplier._id}`} className="suppliers-back-link">Back to Supplier</Link>
          <h1>Receive Material</h1>
          <p>Record a supplier cloth receipt. Supplier and stock identity are locked by this transaction.</p>
        </div>
      </div>

      <section className="receive-supplier-card">
        <span>Supplier</span>
        <strong>{supplier.name}</strong>
        {supplier.contactPerson && <small>{supplier.contactPerson}</small>}
      </section>

      {error && <div className="suppliers-message error">{error}</div>}

      {success && (
        <section className="receive-success-card">
          <h2>Material received successfully.</h2>
          <p><strong>{success.receipt.stockTypeName}</strong> from <strong>{success.receipt.supplierName}</strong></p>
          <p>{success.receipt.size.lengthValue} {success.receipt.size.lengthUnit} × {success.receipt.size.widthValue} {success.receipt.size.widthUnit}</p>
          <div className="receive-success-grid">
            <span>Received<strong>+{success.receipt.quantity} PCS</strong></span>
            <span>Previous Stock<strong>{success.stock.previousStock} PCS</strong></span>
            <span>Current Stock<strong>{success.stock.currentStock} PCS</strong></span>
            <span>Purchase Amount<strong>{formatRupees(success.receipt.totalAmountPaise)}</strong></span>
          </div>
        </section>
      )}

      <section className="suppliers-card receive-form-card">
        <form className="receive-material-form" onSubmit={submit}>
          <label className="suppliers-field">
            <span>Material Condition *</span>
            <select value={form.materialCondition} onChange={updateCondition} disabled={isSaving}>
              {CONDITIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}
            </select>
          </label>

          <label className="suppliers-field">
            <span>Cloth Type *</span>
            <select name="stockType" value={form.stockType} onChange={updateForm} disabled={typesState === "loading" || isSaving}>
              <option value="">{typesState === "loading" ? "Loading cloth types..." : "Select cloth type"}</option>
              {clothTypes.map((type) => <option key={type._id} value={type._id}>{type.name}</option>)}
            </select>
            {typesState === "error" && <small className="receive-field-error">{typesError} <button type="button" onClick={() => setTypesReload((value) => value + 1)}>Retry</button></small>}
            {typesState === "success" && clothTypes.length === 0 && <small className="receive-field-error">No eligible {selectedCondition.category === "raw_material" ? "Raw Material" : "Washed Raw Material"} cloth Stock Type is configured.</small>}
          </label>

          <div className="receive-size-group">
            <span>Structured Size *</span>
            <div className="receive-size-inputs">
              <input type="number" min="0.01" step="0.01" name="size.lengthValue" value={form.size.lengthValue} onChange={updateForm} placeholder="Length" disabled={isSaving} />
              <select name="size.lengthUnit" value={form.size.lengthUnit} onChange={updateForm} disabled={isSaving}>{SIZE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
              <input type="number" min="0.01" step="0.01" name="size.widthValue" value={form.size.widthValue} onChange={updateForm} placeholder="Width" disabled={isSaving} />
              <select name="size.widthUnit" value={form.size.widthUnit} onChange={updateForm} disabled={isSaving}>{SIZE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
            </div>
            <small>Length × Width is stored exactly as entered; units are not converted.</small>
          </div>

          <div className="receive-form-row">
            <label className="suppliers-field"><span>Quantity *</span><input type="number" min="1" step="1" name="quantity" value={form.quantity} onChange={updateForm} placeholder="PCS" disabled={isSaving} /></label>
            <label className="suppliers-field"><span>Unit</span><input type="text" value="PCS" disabled /></label>
          </div>

          <div className="receive-form-row">
            <label className="suppliers-field"><span>Price Per PCS *</span><input type="text" inputMode="decimal" name="pricePerPiece" value={form.pricePerPiece} onChange={updateForm} placeholder="₹ 0.00" disabled={isSaving} /></label>
            <div className="receive-amount-preview"><span>Purchase Amount</span><strong>{purchaseAmountPaise === null ? "—" : formatRupees(purchaseAmountPaise)}</strong><small>Preview only; backend calculates the stored total.</small></div>
          </div>

          <label className="suppliers-field"><span>Received Date *</span><input type="date" name="receivedDate" value={form.receivedDate} onChange={updateForm} disabled={isSaving} /></label>
          <label className="suppliers-field"><span>Supplier Bill / Invoice Number</span><input type="text" name="supplierBillNumber" value={form.supplierBillNumber} onChange={updateForm} maxLength="150" disabled={isSaving} /></label>
          <label className="suppliers-field receive-field-wide"><span>Notes</span><textarea name="notes" value={form.notes} onChange={updateForm} rows="3" maxLength="500" disabled={isSaving} /></label>

          <div className="receive-actions"><button type="submit" className="ep-btn ep-btn-primary" disabled={isSaving || typesState !== "success" || clothTypes.length === 0}>{isSaving ? "Receiving..." : "Receive Material"}</button></div>
          {selectedType && <p className="receive-type-note">Receiving into configured Stock Type: <strong>{selectedType.name}</strong></p>}
        </form>
      </section>
    </div>
  );
};

export default ReceiveMaterialPage;
