import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise } from "../../utils/gst";
import {
  MAX_QUANTITY,
  formatDateOnly,
  getBusinessToday,
  isCanceledRequest,
  lineTotalPaise,
  parseQuantity,
  unitLabel,
} from "../../utils/estimates";

import "../AdminCommon.css";
import "./Estimates.css";

const PRICE_PAGE_LIMIT = 100;
const MAX_PRICE_PAGES = 10;

/* Loads every active price for a customer (bounded), keyed by item id. */
const loadAllPrices = async (customerId, signal) => {
  const map = new Map();
  for (let page = 1; page <= MAX_PRICE_PAGES; page += 1) {
    const response = await api.get("/estimates/priceable-products", {
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

const EstimateFormPage = () => {
  const { estimateId } = useParams();
  const isEdit = Boolean(estimateId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* ---------- page data ---------- */
  const [pageState, setPageState] = useState("loading");
  const [pageError, setPageError] = useState("");
  const [pageReload, setPageReload] = useState(0);

  const [customers, setCustomers] = useState([]);
  const [estimate, setEstimate] = useState(null);

  /* ---------- form ---------- */
  const [customerId, setCustomerId] = useState(searchParams.get("customer") || "");
  const [estimateDate, setEstimateDate] = useState(getBusinessToday());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);

  /* ---------- product picker ---------- */
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [productsState, setProductsState] = useState("idle");
  const [productsError, setProductsError] = useState("");
  const [productsReload, setProductsReload] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const today = getBusinessToday();
  const activeCustomerId = isEdit ? String(estimate?.customer || "") : customerId;

  /* Initial load: customers (create) or the estimate plus current prices (edit). */
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setPageState("loading");
        setPageError("");

        if (!isEdit) {
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

        const response = await api.get(`/estimates/${estimateId}`, { signal: controller.signal });
        const loaded = response.data?.estimate;
        if (!loaded) throw new Error("missing estimate");
        if (loaded.status !== "active") {
          setEstimate(loaded);
          setPageState("notEditable");
          return;
        }

        const prices = await loadAllPrices(String(loaded.customer), controller.signal);

        setEstimate(loaded);
        setNotes(loaded.notes || "");
        setLines(
          loaded.lines.map((line) => {
            const current = prices.get(String(line.item));
            return {
              item: String(line.item),
              productName: line.productName,
              unit: line.unit,
              snapshotPricePaise: line.pricePaise,
              currentPricePaise: current ? current.pricePaise : null,
              available: current ? current.item.currentStock : null,
              originalQuantity: line.quantity,
              quantity: String(line.quantity),
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
        setPageError(err.response?.data?.message || "Unable to load the estimate form.");
        setPageState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [estimateId, isEdit, pageReload]);

  /* Changing the customer (create only) clears lines priced for the old customer. */
  const changeCustomer = (value) => {
    setCustomerId(value);
    setLines([]);
    setProductSearch("");
    setFormError("");
  };

  /* Debounced product search for the chosen customer. */
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
        const response = await api.get("/estimates/priceable-products", {
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
    if (lineItemIds.has(row.item._id)) return;
    setFormError("");
    setLines((previous) => [
      ...previous,
      {
        item: row.item._id,
        productName: row.item.productName,
        unit: row.item.unit,
        snapshotPricePaise: null,
        currentPricePaise: row.pricePaise,
        available: row.item.currentStock,
        originalQuantity: 0,
        quantity: "1",
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

  const effectivePrice = (line) =>
    line.isExisting && !line.reprice ? line.snapshotPricePaise : line.currentPricePaise;

  const totalPaise = lines.reduce((sum, line) => {
    const quantity = parseQuantity(line.quantity);
    return sum + (quantity ? lineTotalPaise(quantity, effectivePrice(line)) : 0);
  }, 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!isEdit && !customerId) return setFormError("Select a customer.");
    if (!isEdit && (!estimateDate || estimateDate > today)) {
      return setFormError("Estimate date cannot be empty or in the future.");
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
      ...(isEdit && line.isExisting && line.reprice ? { reprice: true } : {}),
    }));

    try {
      setIsSaving(true);
      const response = isEdit
        ? await api.put(`/estimates/${estimateId}`, { lines: payloadLines, notes: notes.trim() })
        : await api.post("/estimates", {
            customer: customerId,
            estimateDate,
            lines: payloadLines,
            notes: notes.trim(),
          });

      const saved = response.data?.estimate;
      navigate(`/admin/estimates/${saved?._id || estimateId}`, {
        replace: true,
        state: { message: response.data?.message || "Estimate saved." },
      });
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to save estimate.");
    } finally {
      setIsSaving(false);
    }
  };

  const backTo = isEdit ? `/admin/estimates/${estimateId}` : "/admin/estimates";

  /* ---------- page-level states ---------- */

  if (pageState === "loading") {
    return <div className="ep-container est-page est-state">Loading...</div>;
  }

  if (pageState === "notFound" || pageState === "notEditable" || pageState === "error") {
    const text =
      pageState === "notFound"
        ? "Estimate not found."
        : pageState === "notEditable"
          ? `Estimate ${estimate?.estimateNumber || ""} is ${estimate?.status} and cannot be edited.`
          : pageError;
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

  const selectedCustomer = customers.find((customer) => customer._id === customerId);

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <Link to={backTo} className="est-back-link">
            Back
          </Link>
          <h1>{isEdit ? `Edit ${estimate.estimateNumber}` : "New Estimate"}</h1>
          <p>
            Estimates have no GST. Prices come from the customer&apos;s assigned prices; stock is
            deducted on save.
          </p>
        </div>
      </div>

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
              <label htmlFor="est-customer">Customer</label>
              {isEdit ? (
                <div className="est-readonly">
                  {estimate.customerSnapshot?.billingName || estimate.customerSnapshot?.name}
                </div>
              ) : (
                <>
                  <select
                    id="est-customer"
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
            </div>

            <div className="est-field">
              <label htmlFor="est-date">Estimate Date</label>
              {isEdit ? (
                <div className="est-readonly">{formatDateOnly(estimate.estimateDate)}</div>
              ) : (
                <input
                  id="est-date"
                  type="date"
                  className="ep-input"
                  max={today}
                  value={estimateDate}
                  onChange={(event) => setEstimateDate(event.target.value)}
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
              <p>Only products with an active price for this customer can be added.</p>
            </div>
          </div>

          <div className="est-card-body est-picker">
            {!activeCustomerId ? (
              <p className="est-results-state">Select a customer to add products.</p>
            ) : (
              <>
                <div className="est-field">
                  <label htmlFor="est-product-search">Add product</label>
                  <input
                    id="est-product-search"
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
                      return (
                        <li key={row.item._id}>
                          <button
                            type="button"
                            onClick={() => addProduct(row)}
                            disabled={added || isSaving}
                          >
                            <span>{row.item.productName}</span>
                            <small>
                              {formatPaise(row.pricePaise)} per {unitLabel(row.item.unit)} ·
                              Available {row.item.currentStock} {unitLabel(row.item.unit)}
                              {added ? " · Added" : ""}
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
                    <th>Unit</th>
                    <th className="num">Available</th>
                    <th>Qty</th>
                    <th className="num">Price</th>
                    <th className="num">Line Total</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const quantity = parseQuantity(line.quantity);
                    const price = effectivePrice(line);
                    const canReprice =
                      line.isExisting &&
                      line.currentPricePaise !== null &&
                      line.currentPricePaise !== line.snapshotPricePaise;
                    const extraNeeded = (quantity || 0) - line.originalQuantity;
                    const shortage =
                      line.available !== null && extraNeeded > 0 && extraNeeded > line.available;

                    return (
                      <tr key={line.item}>
                        <td className="est-cell-main">
                          <strong>{line.productName}</strong>
                          {shortage && (
                            <div className="est-muted">
                              Only {line.available} more {unitLabel(line.unit)} in stock.
                            </div>
                          )}
                        </td>
                        <td data-label="Unit">{unitLabel(line.unit)}</td>
                        <td className="num" data-label="Available">
                          {line.available === null
                            ? "-"
                            : line.isExisting
                              ? `${line.available} (+${line.originalQuantity} on this estimate)`
                              : line.available}
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
                          {formatPaise(price)}
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
                              Use current price {formatPaise(line.currentPricePaise)}
                            </label>
                          )}
                        </td>
                        <td className="num est-money est-cell-side">
                          {quantity ? formatPaise(lineTotalPaise(quantity, price)) : "-"}
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

          <div className="est-total-bar">
            <span>Total</span>
            <span className="est-money">{formatPaise(totalPaise)}</span>
          </div>
        </section>

        <section className="est-card">
          <div className="est-card-body">
            <div className="est-field">
              <label htmlFor="est-notes">Notes</label>
              <textarea
                id="est-notes"
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
            disabled={isSaving || lines.length === 0}
          >
            {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Save Estimate"}
          </button>
          <Link to={backTo} className="ep-btn ep-btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EstimateFormPage;
