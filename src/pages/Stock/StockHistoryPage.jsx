import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../config/axios";
import "./StockHistoryPage.css";

const PAGE_SIZE = 20;

const emptyFilters = {
  search: "",
  movementType: "",
  category: "",
  startDate: "",
  endDate: "",
};

const MOVEMENT_TYPE_LABELS = {
  stock_in: "Stock In",
  stock_out: "Stock Out",
  material_receipt: "Material Receipt",
  washing_out: "Washing Out",
  washing_in: "Washing In",
  washing_sent: "Washing Sent",
  washing_completed: "Washing Completed",
  manufacturing_use: "Manufacturing Use",
  manufacturing_output: "Manufacturing Output",
  manufacturing_reverse_in: "Manufacturing Reversal (In)",
  manufacturing_reverse_out: "Manufacturing Reversal (Out)",
  adjustment: "Adjustment",
};

const CATEGORY_LABELS = {
  raw_material: "Raw Material",
  washed_raw_material: "Washed Raw Material",
  finished_goods: "Finished Goods",
};

const REFERENCE_LABELS = {
  washing: "Washing",
  washing_process: "Washing Process",
  manufacturing: "Manufacturing",
  manual: "Manual",
  material_receipt: "Material Receipt",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const text = (value) => {
  if (value === null || value === undefined) return "";
  const result = String(value).trim();
  return result === "undefined" || result === "null" || result === "NaN" ? "" : result;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
};

const formatNumber = (value) => {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number)
    ? "—"
    : number.toLocaleString("en-IN");
};

const unitLabel = (unit) => (unit === "dozen" ? "Dozen" : unit === "pcs" ? "PCS" : "");

const formatSize = (size) => {
  if (!size) return "";
  const { lengthValue, lengthUnit, widthValue, widthUnit } = size;
  const hasLength = Number.isFinite(Number(lengthValue)) && lengthValue !== null;
  const hasWidth = Number.isFinite(Number(widthValue)) && widthValue !== null;
  if (!hasLength && !hasWidth) return "";
  const length = hasLength ? `${lengthValue} ${text(lengthUnit)}`.trim() : "";
  const width = hasWidth ? `${widthValue} ${text(widthUnit)}`.trim() : "";
  return [length, width].filter(Boolean).join(" x ");
};

const getReference = (movement) =>
  text(movement.reason) || text(movement.notes) || REFERENCE_LABELS[movement.referenceType] || "—";

const getProduct = (movement) =>
  text(movement.productName) || text(movement.item?.productName) || "—";

const getSubline = (movement) =>
  [text(movement.supplierName), formatSize(movement.size)].filter(Boolean).join(" · ");

const getQuantity = (movement) => {
  const sign = movement.direction === "in" ? "+" : movement.direction === "out" ? "−" : "";
  return `${sign}${formatNumber(movement.quantity)} ${unitLabel(movement.unit)}`.trim();
};

const directionLabel = (direction) =>
  direction === "in" ? "In" : direction === "out" ? "Out" : "—";
const directionClass = (direction) => (direction === "in" || direction === "out" ? direction : "");

const StockHistoryPage = () => {
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const controllerRef = useRef(null);

  const loadHistory = useCallback(async (targetPage, filters) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setLoading(true);
      setError("");

      const params = { page: targetPage, limit: PAGE_SIZE };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      const response = await api.get("/stock/history", { params, signal: controller.signal });
      const data = response.data || {};

      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(Number(data.page) || targetPage);
      setTotalPages(Number(data.totalPages) || 1);
      setTotal(Number(data.total) || 0);
    } catch (requestError) {
      if (controller.signal.aborted || requestError.code === "ERR_CANCELED") return;
      setError(requestError.response?.data?.message || "Unable to load stock history.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(1, emptyFilters);
    return () => controllerRef.current?.abort();
  }, [loadHistory]);

  const updateFilter = (field, value) => {
    setDraftFilters((previous) => ({ ...previous, [field]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();

    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      setRangeError("From Date cannot be after To Date.");
      return;
    }

    setRangeError("");
    setAppliedFilters(draftFilters);
    loadHistory(1, draftFilters);
  };

  const resetFilters = () => {
    setRangeError("");
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    loadHistory(1, emptyFilters);
  };

  const goToPage = (target) => loadHistory(target, appliedFilters);

  return (
    <main className="stock-history-page">
      <div className="stock-history-container">
        <Link className="stock-history-back" to="/admin/stock">
          Back
        </Link>

        <header className="stock-history-header">
          <p>Stock</p>
          <h1>Stock History</h1>
        </header>

        <section className="stock-history-card">
          <form className="stock-history-filters" onSubmit={applyFilters}>
            <label>
              Product
              <input
                type="search"
                maxLength="100"
                placeholder="Search product"
                value={draftFilters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>
            <label>
              Movement Type
              <select
                value={draftFilters.movementType}
                onChange={(event) => updateFilter("movementType", event.target.value)}
              >
                <option value="">All Movement Types</option>
                {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Main Category
              <select
                value={draftFilters.category}
                onChange={(event) => updateFilter("category", event.target.value)}
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              From Date
              <input
                type="date"
                value={draftFilters.startDate}
                onChange={(event) => updateFilter("startDate", event.target.value)}
              />
            </label>
            <label>
              To Date
              <input
                type="date"
                value={draftFilters.endDate}
                onChange={(event) => updateFilter("endDate", event.target.value)}
              />
            </label>
            <div className="stock-history-actions">
              <button type="submit" disabled={loading}>
                Apply
              </button>
              <button type="button" className="secondary" onClick={resetFilters} disabled={loading}>
                Reset
              </button>
            </div>
          </form>
          {rangeError && (
            <p className="stock-history-range-error" role="alert">
              {rangeError}
            </p>
          )}
        </section>

        <section className="stock-history-card">
          {error ? (
            <div className="stock-history-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => goToPage(page)}>
                Retry
              </button>
            </div>
          ) : loading ? (
            <div
              className="stock-history-skeleton"
              aria-busy="true"
              aria-label="Loading stock history"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="stock-history-empty">No stock movements match these filters.</p>
          ) : (
            <>
              <div className="stock-history-table-scroll">
                <table className="stock-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Movement Type</th>
                      <th>Direction</th>
                      <th className="num">Quantity</th>
                      <th className="num">Balance Before</th>
                      <th className="num">Balance After</th>
                      <th>Reference / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((movement) => (
                      <tr key={movement._id}>
                        <td>{formatDate(movement.movementDate)}</td>
                        <td>
                          <strong>{getProduct(movement)}</strong>
                          {getSubline(movement) && <small>{getSubline(movement)}</small>}
                        </td>
                        <td>{CATEGORY_LABELS[movement.category] || "—"}</td>
                        <td>{MOVEMENT_TYPE_LABELS[movement.movementType] || "—"}</td>
                        <td>
                          <span
                            className={`stock-history-direction ${directionClass(movement.direction)}`}
                          >
                            {directionLabel(movement.direction)}
                          </span>
                        </td>
                        <td className="num">{getQuantity(movement)}</td>
                        <td className="num">{formatNumber(movement.balanceBefore)}</td>
                        <td className="num">{formatNumber(movement.balanceAfter)}</td>
                        <td>{getReference(movement)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="stock-history-rows">
                {items.map((movement) => (
                  <li key={movement._id}>
                    <div className="stock-history-row-top">
                      <span className="stock-history-row-date">
                        {formatDate(movement.movementDate)}
                      </span>
                      <span className={`stock-history-badge ${directionClass(movement.direction)}`}>
                        {MOVEMENT_TYPE_LABELS[movement.movementType] || "—"}
                      </span>
                    </div>
                    <strong>{getProduct(movement)}</strong>
                    {getSubline(movement) && <small>{getSubline(movement)}</small>}
                    <div className="stock-history-row-numbers">
                      <span className={`stock-history-qty ${directionClass(movement.direction)}`}>
                        {getQuantity(movement)}
                      </span>
                      <span>
                        {formatNumber(movement.balanceBefore)} →{" "}
                        {formatNumber(movement.balanceAfter)}
                      </span>
                    </div>
                    <small>
                      {CATEGORY_LABELS[movement.category] || "—"} · {getReference(movement)}
                    </small>
                  </li>
                ))}
              </ul>

              <div className="stock-history-pagination">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages} · {formatNumber(total)} movements
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default StockHistoryPage;
