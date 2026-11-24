import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../../config/axios";
import {
  effectiveGstRate,
  formatPaise,
  formatState,
  paiseToRupeesInput,
  rupeesToPaise,
} from "../../utils/gst";

import "../AdminCommon.css";
import "./CustomersPage.css";

const PRICE_PAGE_SIZE = 20;

const UNIT_LABELS = { pcs: "PCS", dozen: "Dozen" };

const unitLabel = (unit) => UNIT_LABELS[unit] || unit || "unit";

const formatShortDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatAddress = (address, withState = false) => {
  if (!address) return "";
  const parts = [address.line1, address.line2, address.city, address.pincode].filter(
    (part) => part && String(part).trim()
  );
  if (withState && address.stateCode) parts.push(formatState(address.stateCode));
  return parts.join(", ");
};

const isCanceled = (err, controller) => err?.code === "ERR_CANCELED" || controller.signal.aborted;

const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  /* ---------- customer ---------- */
  const [customer, setCustomer] = useState(null);
  const [customerState, setCustomerState] = useState("loading");
  const [customerError, setCustomerError] = useState("");
  const [customerReload, setCustomerReload] = useState(0);

  /* ---------- prices ---------- */
  const [prices, setPrices] = useState([]);
  const [pricesState, setPricesState] = useState("loading");
  const [pricesError, setPricesError] = useState("");
  const [pricePage, setPricePage] = useState(1);
  const [priceTotalPages, setPriceTotalPages] = useState(1);
  const [priceTotal, setPriceTotal] = useState(0);
  const [priceStatus, setPriceStatus] = useState("active");
  const [pricesReload, setPricesReload] = useState(0);

  /* ---------- add product ---------- */
  const [showAdd, setShowAdd] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [productsState, setProductsState] = useState("idle");
  const [productsError, setProductsError] = useState("");
  const [productsReload, setProductsReload] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newPrice, setNewPrice] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  /* ---------- row actions ---------- */
  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [rowBusyId, setRowBusyId] = useState(null);
  const [rowError, setRowError] = useState("");

  const [message, setMessage] = useState("");

  /* ---------- estimate account (separate from any invoice ledger) ---------- */
  const [estimateAccount, setEstimateAccount] = useState(null);
  const [accountState, setAccountState] = useState("loading");
  const [accountError, setAccountError] = useState("");
  const [accountReload, setAccountReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadCustomer = async () => {
      try {
        setCustomerState("loading");
        setCustomerError("");

        const response = await api.get(`/customers/${customerId}`, {
          signal: controller.signal,
        });

        setCustomer(response.data);
        setCustomerState("success");
      } catch (err) {
        if (isCanceled(err, controller)) return;

        if (err.response?.status === 404 || err.response?.status === 400) {
          setCustomerState("notFound");
          return;
        }

        setCustomerError(err.response?.data?.message || "Unable to load customer.");
        setCustomerState("error");
      }
    };

    loadCustomer();

    return () => controller.abort();
  }, [customerId, customerReload]);

  useEffect(() => {
    const controller = new AbortController();

    const loadAccount = async () => {
      try {
        setAccountState("loading");
        setAccountError("");
        const response = await api.get(`/customers/${customerId}/estimate-account`, {
          signal: controller.signal,
        });
        setEstimateAccount(response.data);
        setAccountState("success");
      } catch (err) {
        if (isCanceled(err, controller)) return;
        setAccountError(err.response?.data?.message || "Unable to load the estimate account.");
        setAccountState("error");
      }
    };

    loadAccount();
    return () => controller.abort();
  }, [customerId, accountReload]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPrices = async () => {
      try {
        setPricesState("loading");
        setPricesError("");

        const response = await api.get(`/customers/${customerId}/prices`, {
          params: { page: pricePage, limit: PRICE_PAGE_SIZE, status: priceStatus },
          signal: controller.signal,
        });

        const data = response.data || {};
        setPrices(Array.isArray(data.items) ? data.items : []);
        setPriceTotalPages(Number(data.totalPages) || 1);
        setPriceTotal(Number(data.total) || 0);
        setPricesState("success");
      } catch (err) {
        if (isCanceled(err, controller)) return;

        setPrices([]);
        setPricesError(err.response?.data?.message || "Unable to load product prices.");
        setPricesState("error");
      }
    };

    loadPrices();

    return () => controller.abort();
  }, [customerId, pricePage, priceStatus, pricesReload]);

  /* Step back when the last row of a later page was deactivated. */
  useEffect(() => {
    if (pricesState === "success" && prices.length === 0 && pricePage > 1) {
      setPricePage((value) => value - 1);
    }
  }, [pricesState, prices.length, pricePage]);

  /* Debounced Finished Goods search for the add panel. */
  useEffect(() => {
    if (!showAdd) return undefined;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setProductsState("loading");
        setProductsError("");

        const response = await api.get("/stock", {
          params: {
            category: "finished_goods",
            search: productSearch.trim() || undefined,
            page: 1,
            limit: 20,
          },
          signal: controller.signal,
        });

        setProductResults(Array.isArray(response.data?.items) ? response.data.items : []);
        setProductsState("success");
      } catch (err) {
        if (isCanceled(err, controller)) return;

        setProductResults([]);
        setProductsError(err.response?.data?.message || "Unable to load Finished Goods.");
        setProductsState("error");
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [showAdd, productSearch, productsReload]);

  const pricedItemIds = useMemo(
    () => new Set(prices.map((row) => row.item?._id).filter(Boolean)),
    [prices]
  );

  const refreshPrices = useCallback(() => setPricesReload((value) => value + 1), []);

  const openAddPanel = () => {
    setShowAdd(true);
    setSelectedProduct(null);
    setNewPrice("");
    setAddError("");
    setProductSearch("");
    setMessage("");
  };

  const closeAddPanel = () => {
    setShowAdd(false);
    setSelectedProduct(null);
    setNewPrice("");
    setAddError("");
  };

  const savePrice = async (itemId, priceText) => {
    const response = await api.put(`/customers/${customerId}/prices/${itemId}`, {
      price: priceText.trim(),
    });
    return response.data;
  };

  const handleAddPrice = async (event) => {
    event.preventDefault();

    if (!selectedProduct) {
      setAddError("Select a Finished Goods product.");
      return;
    }

    if (!rupeesToPaise(newPrice)) {
      setAddError("Enter a price greater than zero with up to 2 decimals.");
      return;
    }

    try {
      setIsAdding(true);
      setAddError("");

      const data = await savePrice(selectedProduct._id, newPrice);

      setMessage(
        `${data?.message || "Price saved."} ${selectedProduct.productName}: ${formatPaise(
          data?.price?.pricePaise
        )} per ${unitLabel(selectedProduct.unit)}.`
      );
      closeAddPanel();
      setPriceStatus("active");
      setPricePage(1);
      refreshPrices();
    } catch (err) {
      setAddError(err.response?.data?.message || "Unable to save price.");
    } finally {
      setIsAdding(false);
    }
  };

  const startEditPrice = (row) => {
    setEditingItemId(row.item?._id || null);
    setEditPrice(paiseToRupeesInput(row.pricePaise));
    setRowError("");
    setMessage("");
  };

  const cancelEditPrice = () => {
    setEditingItemId(null);
    setEditPrice("");
    setRowError("");
  };

  const handleSaveEdit = async (row) => {
    if (!rupeesToPaise(editPrice)) {
      setRowError("Enter a price greater than zero with up to 2 decimals.");
      return;
    }

    try {
      setRowBusyId(row.item._id);
      setRowError("");

      await savePrice(row.item._id, editPrice);

      setMessage(`Price updated for ${row.item.productName}.`);
      cancelEditPrice();
      refreshPrices();
    } catch (err) {
      setRowError(err.response?.data?.message || "Unable to update price.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleDeactivate = async (row) => {
    const confirmed = window.confirm(
      `Deactivate the price for ${row.item.productName}? It can be reactivated later.`
    );

    if (!confirmed) return;

    try {
      setRowBusyId(row.item._id);
      setRowError("");
      setMessage("");

      await api.delete(`/customers/${customerId}/prices/${row.item._id}`);

      setMessage(`Price deactivated for ${row.item.productName}.`);
      refreshPrices();
    } catch (err) {
      setRowError(err.response?.data?.message || "Unable to deactivate price.");
    } finally {
      setRowBusyId(null);
    }
  };

  const handleReactivate = async (row) => {
    try {
      setRowBusyId(row.item._id);
      setRowError("");
      setMessage("");

      await savePrice(row.item._id, paiseToRupeesInput(row.pricePaise));

      setMessage(`Price reactivated for ${row.item.productName}.`);
      refreshPrices();
    } catch (err) {
      setRowError(err.response?.data?.message || "Unable to reactivate price.");
    } finally {
      setRowBusyId(null);
    }
  };

  /* ---------- page-level states ---------- */

  if (customerState === "loading") {
    return <div className="ep-container customers-page customers-state">Loading customer...</div>;
  }

  if (customerState === "notFound") {
    return (
      <div className="ep-container customers-page customers-state">
        <p>Customer not found.</p>
        <Link to="/admin/customers" className="ep-btn ep-btn-secondary customers-link-btn">
          Back
        </Link>
      </div>
    );
  }

  if (customerState === "error") {
    return (
      <div className="ep-container customers-page customers-state customers-error-state">
        <p>{customerError}</p>
        <div className="customers-state-actions">
          <Link to="/admin/customers" className="ep-btn ep-btn-secondary customers-link-btn">
            Back
          </Link>
          <button
            type="button"
            className="ep-btn ep-btn-primary"
            onClick={() => setCustomerReload((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isActive = customer.isActive !== false;

  const details = [
    ["Billing Name", customer.billingName || customer.name],
    ["Email", customer.email],
    ["Contact Person", customer.contactPerson],
    ["Contact Number", customer.contactNumber ? String(customer.contactNumber) : ""],
    ["GSTIN", customer.gst],
    ["State", formatState(customer.stateCode)],
    ["Billing Address", formatAddress(customer.billingAddress)],
    [
      "Shipping Address",
      customer.shippingSameAsBilling !== false
        ? "Same as billing"
        : formatAddress(customer.shippingAddress, true),
    ],
  ];

  return (
    <div className="ep-container customers-page customer-detail-page">
      <div className="customers-header customer-detail-header">
        <div className="customer-detail-title">
          <Link to="/admin/customers" className="customers-back-link">
            Back
          </Link>

          <h1>
            {customer.name}
            <span className={`customers-status-badge ${isActive ? "active" : "inactive"}`}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </h1>

          <p>Customer details and product prices.</p>
        </div>

        <button
          type="button"
          className="ep-btn ep-btn-secondary customer-detail-edit"
          onClick={() => navigate("/admin/customers", { state: { editCustomerId: customer._id } })}
        >
          Edit Customer
        </button>
      </div>

      {message && <div className="customers-message success">{message}</div>}

      {/* =====================================
          DETAILS
      ====================================== */}

      <section className="customers-card">
        <div className="customers-list-header">
          <div>
            <h2>Details</h2>
          </div>
        </div>

        <dl className="customer-detail-grid">
          {details.map(([label, value]) => (
            <div key={label} className="customer-detail-item">
              <dt>{label}</dt>
              <dd className={label === "GSTIN" ? "customers-gst-value" : undefined}>
                {value || "-"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* =====================================
          ESTIMATE ACCOUNT (no GST; separate from invoices)
      ====================================== */}

      <section className="customers-card">
        <div className="customers-list-header">
          <div>
            <h2>Estimate Account</h2>
            <p>Active estimates and their payments. Kept separate from invoices.</p>
          </div>
        </div>

        {accountState === "loading" ? (
          <div className="customers-state">Loading estimate account...</div>
        ) : accountState === "error" ? (
          <div className="customers-state customers-error-state">
            <p>{accountError}</p>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={() => setAccountReload((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <dl className="customer-detail-grid customer-estimate-grid">
              {[
                ["Total Estimated", formatPaise(estimateAccount.totalEstimatedPaise)],
                ["Paid", formatPaise(estimateAccount.totalPaidPaise)],
                ["Outstanding", formatPaise(estimateAccount.outstandingPaise)],
                [
                  "Estimates",
                  `${estimateAccount.activeCount} active · ${estimateAccount.cancelledCount} cancelled`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="customer-detail-item">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="customer-estimate-links">
              <Link
                to={`/admin/estimates?customer=${customer._id}`}
                className="ep-btn ep-btn-secondary customers-link-btn"
              >
                View Estimates
              </Link>
              {isActive && (
                <Link
                  to={`/admin/estimates/new?customer=${customer._id}`}
                  className="ep-btn ep-btn-primary customers-link-btn"
                >
                  New Estimate
                </Link>
              )}
            </div>
          </>
        )}
      </section>

      {/* =====================================
          PRODUCTS AND PRICES
      ====================================== */}

      <section className="customers-card">
        <div className="customers-list-header customer-prices-header">
          <div>
            <h2>Products and Prices</h2>
            <p>Price per stock unit. Only Finished Goods can be priced.</p>
          </div>

          <div className="customer-prices-toolbar">
            <label htmlFor="price-status" className="customer-sr-only">
              Price status
            </label>
            <select
              id="price-status"
              className="ep-input"
              value={priceStatus}
              onChange={(event) => {
                setPriceStatus(event.target.value);
                setPricePage(1);
                cancelEditPrice();
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>

            {!showAdd && (
              <button
                type="button"
                className="ep-btn ep-btn-primary"
                onClick={openAddPanel}
                disabled={!isActive}
                title={isActive ? undefined : "Activate the customer to add prices."}
              >
                Add Product
              </button>
            )}
          </div>
        </div>

        {!isActive && (
          <p className="customer-prices-note">
            This customer is inactive. Activate the customer to add or change prices.
          </p>
        )}

        {showAdd && (
          <form className="customer-add-price" onSubmit={handleAddPrice} noValidate>
            <div className="customers-field">
              <label htmlFor="product-search">Finished Goods Product</label>
              <input
                id="product-search"
                type="text"
                className="ep-input"
                placeholder="Search Finished Goods"
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setSelectedProduct(null);
                }}
                autoComplete="off"
              />
            </div>

            {selectedProduct ? (
              <div className="customer-selected-product">
                <div>
                  <strong>{selectedProduct.productName}</strong>
                  <small>
                    {unitLabel(selectedProduct.unit)} · HSN {selectedProduct.hsnCode || "-"} · GST{" "}
                    {effectiveGstRate(selectedProduct)}%
                  </small>
                </div>
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  onClick={() => setSelectedProduct(null)}
                  disabled={isAdding}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="customer-product-results" aria-live="polite">
                {productsState === "loading" ? (
                  <p className="customer-results-state">Loading Finished Goods...</p>
                ) : productsState === "error" ? (
                  <div className="customer-results-state customers-error-state">
                    <p>{productsError}</p>
                    <button
                      type="button"
                      className="ep-btn ep-btn-secondary"
                      onClick={() => setProductsReload((value) => value + 1)}
                    >
                      Retry
                    </button>
                  </div>
                ) : productResults.length === 0 ? (
                  <p className="customer-results-state">
                    {productSearch.trim()
                      ? "No Finished Goods match your search."
                      : "No Finished Goods products exist yet."}
                  </p>
                ) : (
                  <ul>
                    {productResults.map((product) => (
                      <li key={product._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setAddError("");
                          }}
                        >
                          <span>{product.productName}</span>
                          <small>
                            {unitLabel(product.unit)}
                            {pricedItemIds.has(product._id)
                              ? " · Already priced (will update)"
                              : ""}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="customers-field">
              <label htmlFor="new-price">
                Price per {selectedProduct ? unitLabel(selectedProduct.unit) : "unit"} (₹)
              </label>
              <input
                id="new-price"
                type="text"
                inputMode="decimal"
                className="ep-input"
                placeholder="0.00"
                value={newPrice}
                onChange={(event) => setNewPrice(event.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>

            {addError && <div className="customers-message error">{addError}</div>}

            <div className="customer-add-actions">
              <button type="submit" className="ep-btn ep-btn-primary" disabled={isAdding}>
                {isAdding ? "Saving..." : "Save Price"}
              </button>
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                onClick={closeAddPanel}
                disabled={isAdding}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {rowError && <div className="customers-message error customer-row-error">{rowError}</div>}

        {pricesState === "loading" ? (
          <div className="customers-state">Loading product prices...</div>
        ) : pricesState === "error" ? (
          <div className="customers-state customers-error-state">
            <p>{pricesError}</p>
            <button type="button" className="ep-btn ep-btn-secondary" onClick={refreshPrices}>
              Retry
            </button>
          </div>
        ) : prices.length === 0 ? (
          <div className="customers-state">
            {priceStatus === "inactive"
              ? "No inactive prices."
              : "No products priced for this customer yet."}
          </div>
        ) : (
          <>
            <div className="customers-table-wrapper">
              <table className="ep-table customers-table customer-prices-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit</th>
                    <th>HSN</th>
                    <th>GST %</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {prices.map((row) => {
                    const item = row.item;
                    const itemId = item?._id;
                    const isEditing = itemId && editingItemId === itemId;
                    const isBusy = itemId && rowBusyId === itemId;

                    return (
                      <tr key={row._id}>
                        <td className="customer-price-product">
                          <strong>{item?.productName || "Product unavailable"}</strong>
                        </td>
                        <td data-label="Unit">{item ? unitLabel(item.unit) : "-"}</td>
                        <td data-label="HSN">{item?.hsnCode || "-"}</td>
                        <td data-label="GST">{item ? `${effectiveGstRate(item)}%` : "-"}</td>
                        <td className="customer-price-amount">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              className="ep-input customer-price-input"
                              aria-label={`Price for ${item.productName}`}
                              value={editPrice}
                              onChange={(event) =>
                                setEditPrice(event.target.value.replace(/[^\d.]/g, ""))
                              }
                              disabled={isBusy}
                            />
                          ) : (
                            <strong>{formatPaise(row.pricePaise)}</strong>
                          )}
                        </td>
                        <td className="customer-price-status">
                          <span
                            className={`customers-status-badge ${row.isActive ? "active" : "inactive"}`}
                          >
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td data-label="Updated">{formatShortDate(row.updatedAt)}</td>
                        <td className="customers-cell-actions">
                          <div className="customers-actions">
                            {!item ? null : isEditing ? (
                              <>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-primary"
                                  onClick={() => handleSaveEdit(row)}
                                  disabled={isBusy}
                                >
                                  {isBusy ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-secondary"
                                  onClick={cancelEditPrice}
                                  disabled={isBusy}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : row.isActive ? (
                              <>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-edit"
                                  onClick={() => startEditPrice(row)}
                                  disabled={Boolean(rowBusyId) || !isActive}
                                >
                                  Edit Price
                                </button>
                                <button
                                  type="button"
                                  className="ep-btn ep-btn-delete"
                                  onClick={() => handleDeactivate(row)}
                                  disabled={Boolean(rowBusyId)}
                                >
                                  {isBusy ? "Working..." : "Deactivate"}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="ep-btn ep-btn-primary"
                                onClick={() => handleReactivate(row)}
                                disabled={Boolean(rowBusyId) || !isActive}
                              >
                                {isBusy ? "Working..." : "Reactivate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="customers-pagination">
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                disabled={pricePage <= 1}
                onClick={() => {
                  cancelEditPrice();
                  setPricePage((value) => value - 1);
                }}
              >
                Previous
              </button>
              <span>
                Page {pricePage} of {priceTotalPages} · {priceTotal} total
              </span>
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                disabled={pricePage >= priceTotalPages}
                onClick={() => {
                  cancelEditPrice();
                  setPricePage((value) => value + 1);
                }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default CustomerDetailPage;
