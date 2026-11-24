import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise, formatState } from "../../utils/gst";
import {
  MAX_QUANTITY,
  formatDateOnly,
  getBusinessToday,
  isCanceledRequest,
  lineTotalPaise,
  parseQuantity,
  unitLabel,
} from "../../utils/estimates";
import {
  TAX_TYPE_LABELS,
  determineTaxType,
  hasTaxMetadata,
  previewInvoiceTax,
} from "../../utils/invoiceTax";
import InvoiceTaxBreakdown from "./InvoiceTaxBreakdown";

import "../AdminCommon.css";
import "../Estimates/Estimates.css";
import "./Invoices.css";

const PRICE_PAGE_LIMIT = 100;
const MAX_PRICE_PAGES = 10;

/* Loads every active price (with HSN/GST) for a customer, keyed by item id. */
const loadAllPrices = async (customerId, signal) => {
  const map = new Map();
  for (let page = 1; page <= MAX_PRICE_PAGES; page += 1) {
    const response = await api.get("/invoices/priceable-products", {
      params: { customer: customerId, page, limit: PRICE_PAGE_LIMIT },
      signal,
    });
    const data = response.data || {};
    (Array.isArray(data.items) ? data.items : []).forEach((row) => {
      if (row.item?._id) map.set(row.item._id, row);
    });
    if (page >= (Number(data.totalPages) || 1)) break;
  }
  return map;
};

/* The values a line will be saved with (snapshot unless re-priced or new). */
const effectiveLine = (line) =>
  line.isExisting && !line.reprice
    ? {
        pricePaise: line.snapshotPricePaise,
        hsnCode: line.snapshotHsn,
        gstRatePercent: line.snapshotRate,
      }
    : {
        pricePaise: line.currentPricePaise,
        hsnCode: line.currentHsn,
        gstRatePercent: line.currentRate,
      };

const InvoiceFormPage = () => {
  const { invoiceId } = useParams();
  const isEdit = Boolean(invoiceId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pageState, setPageState] = useState("loading");
  const [pageError, setPageError] = useState("");
  const [pageReload, setPageReload] = useState(0);

  const [sellerConfigured, setSellerConfigured] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [invoice, setInvoice] = useState(null);

  const [customerId, setCustomerId] = useState(searchParams.get("customer") || "");
  const [invoiceDate, setInvoiceDate] = useState(getBusinessToday());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);

  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [productsState, setProductsState] = useState("idle");
  const [productsError, setProductsError] = useState("");
  const [productsReload, setProductsReload] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const today = getBusinessToday();
  const selectedCustomer = customers.find((customer) => customer._id === customerId);
  const activeCustomerId = isEdit ? String(invoice?.customer || "") : customerId;
  const taxType = isEdit
    ? invoice?.taxType || null
    : determineTaxType(selectedCustomer?.stateCode || "");

  /* Initial load: seller status plus customers (create) or the invoice (edit). */
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setPageState("loading");
        setPageError("");

        if (!isEdit) {
          const sellerResponse = await api.get("/invoices/seller-status", {
            signal: controller.signal,
          });
          setSellerConfigured(Boolean(sellerResponse.data?.configured));

          const response = await api.get("/customers", {
            params: { status: "active" },
            signal: controller.signal,
          });
          const list = Array.isArray(response.data) ? response.data : [];
          setCustomers(
            [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
          );
          setPageState("success");
          return;
        }

        const response = await api.get(`/invoices/${invoiceId}`, { signal: controller.signal });
        const loaded = response.data?.invoice;
        if (!loaded) throw new Error("missing invoice");
        setInvoice(loaded);
        if (loaded.status !== "active") {
          setPageState("notEditable");
          return;
        }
        if ((response.data?.summary?.paymentCount || 0) > 0) {
          setPageState("locked");
          return;
        }

        const prices = await loadAllPrices(String(loaded.customer), controller.signal);

        setNotes(loaded.notes || "");
        setLines(
          loaded.lines.map((line) => {
            const current = prices.get(String(line.item));
            return {
              item: String(line.item),
              productName: line.productName,
              unit: line.unit,
              snapshotPricePaise: line.pricePaise,
              snapshotHsn: line.hsnCode,
              snapshotRate: line.gstRatePercent,
              currentPricePaise: current ? current.pricePaise : null,
              currentHsn: current ? current.item.hsnCode : "",
              currentRate: current ? current.item.gstRatePercent : null,
              available: current ? current.item.currentStock : null,
              originalQuantity: line.quantity,
              quantity: String(line.quantity),
              batchReference: line.batchReference || "",
              reprice: false,
              isExisting: true,
            };
          })
        );
        setPageState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setPageState("notFound");
          return;
        }
        setPageError(err.response?.data?.message || "Unable to load the invoice form.");
        setPageState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [invoiceId, isEdit, pageReload]);

  const changeCustomer = (value) => {
    setCustomerId(value);
    setLines([]);
    setProductSearch("");
    setFormError("");
  };

  /* Debounced priced-product search for the chosen customer. */
  useEffect(() => {
    if (pageState !== "success" || !activeCustomerId) {
      setProducts([]);
      setProductsState("idle");
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setProductsState("loading");
        setProductsError("");
        const response = await api.get("/invoices/priceable-products", {
          params: {
            customer: activeCustomerId,
            search: productSearch.trim() || undefined,
            page: 1,
            limit: 20,
          },
          signal: controller.signal,
        });
        setProducts(Array.isArray(response.data?.items) ? response.data.items : []);
        setProductsState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        setProducts([]);
        setProductsError(err.response?.data?.message || "Unable to load priced products.");
        setProductsState("error");
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeCustomerId, productSearch, pageState, productsReload]);

  const lineItemIds = useMemo(() => new Set(lines.map((line) => line.item)), [lines]);

  const addProduct = (row) => {
    if (lineItemIds.has(row.item._id) || !hasTaxMetadata(row.item)) return;
    setFormError("");
    setLines((previous) => [
      ...previous,
      {
        item: row.item._id,
        productName: row.item.productName,
        unit: row.item.unit,
        snapshotPricePaise: null,
        snapshotHsn: "",
        snapshotRate: null,
        currentPricePaise: row.pricePaise,
        currentHsn: row.item.hsnCode,
        currentRate: row.item.gstRatePercent,
        available: row.item.currentStock,
        originalQuantity: 0,
        quantity: "1",
        batchReference: "",
        reprice: false,
        isExisting: false,
      },
    ]);
  };

  const updateLine = (itemId, changes) =>
    setLines((previous) =>
      previous.map((line) => (line.item === itemId ? { ...line, ...changes } : line))
    );

  const removeLine = (itemId) =>
    setLines((previous) => previous.filter((line) => line.item !== itemId));

  const preview = useMemo(() => {
    if (!taxType || lines.length === 0) return null;
    const taxLines = [];
    for (const line of lines) {
      const quantity = parseQuantity(line.quantity);
      const values = effectiveLine(line);
      if (!quantity || !values.pricePaise || !hasTaxMetadata(values)) return null;
      taxLines.push({
        gstRatePercent: values.gstRatePercent,
        taxablePaise: lineTotalPaise(quantity, values.pricePaise),
      });
    }
    return previewInvoiceTax(taxLines, taxType);
  }, [lines, taxType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!isEdit && !sellerConfigured) {
      return setFormError("Seller details are not configured. Invoices cannot be created yet.");
    }
    if (!isEdit && !customerId) return setFormError("Select a customer.");
    if (!isEdit && !taxType) {
      return setFormError("This customer has no valid state. Set it on the customer page first.");
    }
    if (!isEdit && (!invoiceDate || invoiceDate > today)) {
      return setFormError("Invoice date cannot be empty or in the future.");
    }
    if (lines.length === 0) return setFormError("Add at least one product.");

    const badLine = lines.find((line) => !parseQuantity(line.quantity));
    if (badLine) {
      return setFormError(
        `${badLine.productName}: quantity must be a whole number from 1 to ${MAX_QUANTITY}.`
      );
    }

    const payloadLines = lines.map((line) => ({
      item: line.item,
      quantity: parseQuantity(line.quantity),
      batchReference: line.batchReference.trim(),
      ...(isEdit && line.isExisting && line.reprice ? { reprice: true } : {}),
    }));

    try {
      setIsSaving(true);
      const response = isEdit
        ? await api.put(`/invoices/${invoiceId}`, { lines: payloadLines, notes: notes.trim() })
        : await api.post("/invoices", {
            customer: customerId,
            invoiceDate,
            lines: payloadLines,
            notes: notes.trim(),
          });

      const saved = response.data?.invoice;
      navigate(`/admin/invoices/${saved?._id || invoiceId}`, {
        replace: true,
        state: { message: response.data?.message || "Invoice saved." },
      });
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to save invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  const backTo = isEdit ? `/admin/invoices/${invoiceId}` : "/admin/invoices";

  /* ---------- page-level states ---------- */

  if (pageState === "loading") {
    return <div className="ep-container est-page est-state">Loading...</div>;
  }

  if (["notFound", "notEditable", "locked", "error"].includes(pageState)) {
    const text = {
      notFound: "Invoice not found.",
      notEditable: `Invoice ${invoice?.invoiceNumber || ""} is ${invoice?.status} and cannot be edited.`,
      locked: `Invoice ${invoice?.invoiceNumber || ""} has payments and is locked. Reverse it instead.`,
      error: pageError,
    }[pageState];
    return (
      <div className={`ep-container est-page est-state${pageState === "error" ? " error" : ""}`}>
        <p>{text}</p>
        <div className="est-state-actions">
          <Link to={backTo} className="ep-btn ep-btn-secondary">
            Back
          </Link>
          {pageState === "error" && (
            <button
              type="button"
              className="ep-btn ep-btn-primary"
              onClick={() => setPageReload((value) => value + 1)}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const customerInfo = isEdit ? invoice.customerSnapshot : selectedCustomer;
  const customerGstin = isEdit ? customerInfo?.gstin : customerInfo?.gst;
  const incompleteLine = lines.find((line) => !hasTaxMetadata(effectiveLine(line)));

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <Link to={backTo} className="est-back-link">
            Back
          </Link>
          <h1>{isEdit ? `Edit ${invoice.invoiceNumber}` : "New Invoice"}</h1>
          <p>
            GST tax invoice. Prices exclude GST; tax is added per rate. Stock is deducted on save.
          </p>
        </div>
      </div>

      {!isEdit && !sellerConfigured && (
        <div className="inv-banner">
          Seller details (NCH name, address, GSTIN) are not configured yet. Invoices cannot be saved
          until they are set.
        </div>
      )}

      {formError && <div className="est-message error">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <section className="est-card">
          <div className="est-card-header">
            <div>
              <h2>Details</h2>
            </div>
          </div>
          <div className="est-card-body est-form-grid">
            <div className="est-field">
              <label htmlFor="inv-customer">Customer</label>
              {isEdit ? (
                <div className="est-readonly">
                  {customerInfo?.billingName || customerInfo?.name}
                </div>
              ) : (
                <>
                  <select
                    id="inv-customer"
                    className="ep-input"
                    value={customerId}
                    onChange={(event) => changeCustomer(event.target.value)}
                    disabled={isSaving}
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && <small>No active customers. Add one first.</small>}
                  {customerId && !selectedCustomer && (
                    <small>The selected customer is not active.</small>
                  )}
                </>
              )}
              {customerInfo && (
                <div className="inv-customer-meta">
                  <span>GSTIN: {customerGstin || "Unregistered"}</span>
                  <span>State: {formatState(customerInfo.stateCode) || "Not set"}</span>
                  {taxType ? (
                    <span className="inv-badge">{TAX_TYPE_LABELS[taxType]}</span>
                  ) : (
                    <span className="inv-missing">No state: set it on the customer page</span>
                  )}
                </div>
              )}
            </div>

            <div className="est-field">
              <label htmlFor="inv-date">Invoice Date</label>
              {isEdit ? (
                <div className="est-readonly">{formatDateOnly(invoice.invoiceDate)}</div>
              ) : (
                <input
                  id="inv-date"
                  type="date"
                  className="ep-input"
                  max={today}
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  disabled={isSaving}
                />
              )}
            </div>
          </div>
        </section>

        <section className="est-card">
          <div className="est-card-header">
            <div>
              <h2>Products</h2>
              <p>Only products with an active price, an HSN code and a GST rate can be invoiced.</p>
            </div>
          </div>

          <div className="est-card-body est-picker">
            {!activeCustomerId ? (
              <p className="est-results-state">Select a customer to add products.</p>
            ) : (
              <>
                <div className="est-field">
                  <label htmlFor="inv-product-search">Add product</label>
                  <input
                    id="inv-product-search"
                    type="text"
                    className="ep-input"
                    placeholder="Search priced products"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    autoComplete="off"
                  />
                </div>

                {productsState === "loading" || productsState === "idle" ? (
                  <p className="est-results-state">Loading priced products...</p>
                ) : productsState === "error" ? (
                  <div className="est-results-state">
                    <p>{productsError}</p>
                    <button
                      type="button"
                      className="ep-btn ep-btn-secondary"
                      onClick={() => setProductsReload((value) => value + 1)}
                    >
                      Retry
                    </button>
                  </div>
                ) : products.length === 0 ? (
                  <p className="est-results-state">
                    {productSearch.trim()
                      ? "No priced products match your search."
                      : "This customer has no active product prices. Set prices on the customer page."}
                  </p>
                ) : (
                  <ul className="est-results">
                    {products.map((row) => {
                      const added = lineItemIds.has(row.item._id);
                      const complete = hasTaxMetadata(row.item);
                      return (
                        <li key={row.item._id}>
                          <button
                            type="button"
                            onClick={() => addProduct(row)}
                            disabled={added || !complete || isSaving}
                          >
                            <span>{row.item.productName}</span>
                            <small>
                              {formatPaise(row.pricePaise)} per {unitLabel(row.item.unit)} · HSN{" "}
                              {row.item.hsnCode || "-"} · GST{" "}
                              {complete ? `${row.item.gstRatePercent}%` : "-"} · Available{" "}
                              {row.item.currentStock}
                              {added ? " · Added" : ""}
                              {!complete ? " · Set HSN/GST in Stock Management" : ""}
                            </small>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="est-state">No products added yet.</div>
          ) : (
            <div className="est-table-wrapper">
              <table className="ep-table est-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>HSN</th>
                    <th className="num">GST %</th>
                    <th>Qty</th>
                    <th className="num">Price</th>
                    <th>Batch Ref</th>
                    <th className="num">Taxable</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const quantity = parseQuantity(line.quantity);
                    const values = effectiveLine(line);
                    const canReprice =
                      line.isExisting &&
                      line.currentPricePaise !== null &&
                      hasTaxMetadata({
                        hsnCode: line.currentHsn,
                        gstRatePercent: line.currentRate,
                      }) &&
                      (line.currentPricePaise !== line.snapshotPricePaise ||
                        line.currentHsn !== line.snapshotHsn ||
                        line.currentRate !== line.snapshotRate);
                    const extraNeeded = (quantity || 0) - line.originalQuantity;
                    const shortage =
                      line.available !== null && extraNeeded > 0 && extraNeeded > line.available;

                    return (
                      <tr key={line.item}>
                        <td className="est-cell-main">
                          <strong>{line.productName}</strong>
                          <div className="est-muted">
                            {unitLabel(line.unit)}
                            {line.available !== null
                              ? ` · Available ${line.available}${
                                  line.isExisting
                                    ? ` (+${line.originalQuantity} on this invoice)`
                                    : ""
                                }`
                              : ""}
                          </div>
                          {shortage && (
                            <div className="inv-missing">
                              Only {line.available} more {unitLabel(line.unit)} in stock.
                            </div>
                          )}
                        </td>
                        <td data-label="HSN">{values.hsnCode || "-"}</td>
                        <td className="num" data-label="GST">
                          {hasTaxMetadata(values) ? `${values.gstRatePercent}%` : "-"}
                        </td>
                        <td className="est-cell-full">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="ep-input est-qty-input"
                            aria-label={`Quantity for ${line.productName}`}
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.item, {
                                quantity: event.target.value.replace(/\D/g, ""),
                              })
                            }
                            disabled={isSaving}
                          />
                        </td>
                        <td className="num est-money" data-label="Price">
                          {formatPaise(values.pricePaise)}
                          {canReprice && (
                            <label className="est-reprice">
                              <input
                                type="checkbox"
                                checked={line.reprice}
                                onChange={(event) =>
                                  updateLine(line.item, { reprice: event.target.checked })
                                }
                                disabled={isSaving}
                              />
                              Use current {formatPaise(line.currentPricePaise)}, HSN{" "}
                              {line.currentHsn}, {line.currentRate}%
                            </label>
                          )}
                        </td>
                        <td className="est-cell-full">
                          <input
                            type="text"
                            className="ep-input inv-batch-input"
                            aria-label={`Batch reference for ${line.productName}`}
                            placeholder="Batch ref (optional)"
                            maxLength={100}
                            value={line.batchReference}
                            onChange={(event) =>
                              updateLine(line.item, { batchReference: event.target.value })
                            }
                            disabled={isSaving}
                          />
                        </td>
                        <td className="num est-money est-cell-side">
                          {quantity && values.pricePaise
                            ? formatPaise(lineTotalPaise(quantity, values.pricePaise))
                            : "-"}
                        </td>
                        <td className="est-cell-actions">
                          <button
                            type="button"
                            className="ep-btn ep-btn-delete"
                            onClick={() => removeLine(line.item)}
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="est-card-body">
            {incompleteLine ? (
              <p className="inv-missing">
                {incompleteLine.productName} has no HSN code or GST rate. Set it in Stock
                Management.
              </p>
            ) : preview ? (
              <InvoiceTaxBreakdown tax={preview} taxType={taxType} preview />
            ) : (
              <p className="est-results-state">
                {taxType
                  ? "Add products with valid quantities to see the tax preview."
                  : "Select a customer with a valid state to see the tax preview."}
              </p>
            )}
          </div>
        </section>

        <section className="est-card">
          <div className="est-card-body">
            <div className="est-field">
              <label htmlFor="inv-notes">Notes</label>
              <textarea
                id="inv-notes"
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
          <button
            type="submit"
            className="ep-btn ep-btn-primary"
            disabled={isSaving || lines.length === 0 || (!isEdit && !sellerConfigured)}
          >
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Save Invoice"}
          </button>
          <Link to={backTo} className="ep-btn ep-btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default InvoiceFormPage;
