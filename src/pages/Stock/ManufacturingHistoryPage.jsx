import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../config/axios";
import ManufacturingHistoryTable from "./ManufacturingHistoryTable";
import "./ManufacturingPage.css";

const emptyFilters = {
  month: "",
  fromDate: "",
  toDate: "",
  finishedItem: "",
  size: "",
  batchNumber: "",
};

const messageFor = (error, fallback) => error.response?.data?.message || fallback;

const ManufacturingHistoryPage = () => {
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [finishedItems, setFinishedItems] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [expandedId, setExpandedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async (page = 1, filters = appliedFilters) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/manufacturing", {
        params: { page, limit: 20, ...filters },
      });
      setItems(response.data.items || []);
      setPagination(response.data.pagination || null);
      setExpandedId("");
    } catch (requestError) {
      setError(messageFor(requestError, "Unable to load manufacturing history."));
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      setLoadingFilters(true);
      const [productsResponse, sizesResponse] = await Promise.all([
        api.get("/manufacturing/stock-items", { params: { kind: "output", page: 1, limit: 100 } }),
        api.get("/manufacturing/history-filter-options"),
      ]);
      setFinishedItems(productsResponse.data.items || []);
      setSizes(sizesResponse.data.sizes || []);
    } catch (requestError) {
      setError(messageFor(requestError, "Unable to load manufacturing history filters."));
    } finally {
      setLoadingFilters(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
    loadHistory(1, emptyFilters);
  }, []);

  const updateFilter = (field, value) => {
    setDraftFilters((previous) => ({ ...previous, [field]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters(draftFilters);
    loadHistory(1, draftFilters);
  };

  const resetFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    loadHistory(1, emptyFilters);
  };

  return (
    <main className="manufacturing-page manufacturing-history-page">
      <div className="manufacturing-container">
        <Link className="manufacturing-back" to="/admin/stock/manufacturing">
          Back
        </Link>

        <header className="manufacturing-header">
          <p>Stock Operations</p>
          <h1>Manufacturing History</h1>
        </header>

        {error && (
          <section className="manufacturing-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                loadFilterOptions();
                loadHistory(pagination?.page || 1);
              }}
            >
              Retry
            </button>
          </section>
        )}

        <section className="manufacturing-card">
          <h2>Filters</h2>
          <form className="manufacturing-history-filters" onSubmit={applyFilters}>
            <div className="manufacturing-filter-row manufacturing-filter-row-primary">
              <label>
                Month
                <input
                  type="month"
                  value={draftFilters.month}
                  onChange={(event) => updateFilter("month", event.target.value)}
                />
              </label>
              <label>
                From Date
                <input
                  type="date"
                  value={draftFilters.fromDate}
                  onChange={(event) => updateFilter("fromDate", event.target.value)}
                />
              </label>
              <label>
                To Date
                <input
                  type="date"
                  value={draftFilters.toDate}
                  onChange={(event) => updateFilter("toDate", event.target.value)}
                />
              </label>
              <label className="manufacturing-filter-product">
                Product
                <select
                  value={draftFilters.finishedItem}
                  onChange={(event) => updateFilter("finishedItem", event.target.value)}
                  disabled={loadingFilters}
                >
                  <option value="">All Finished Products</option>
                  {finishedItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.productName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Size
                <select
                  value={draftFilters.size}
                  onChange={(event) => updateFilter("size", event.target.value)}
                  disabled={loadingFilters}
                >
                  <option value="">All Sizes</option>
                  {sizes.map((size) => (
                    <option key={size.key} value={size.key}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="manufacturing-filter-row manufacturing-filter-row-actions">
              <label className="manufacturing-filter-batch">
                Batch No.
                <input
                  type="search"
                  maxLength="100"
                  value={draftFilters.batchNumber}
                  onChange={(event) => updateFilter("batchNumber", event.target.value)}
                />
              </label>
              <button type="submit" disabled={loading}>
                Apply Filters
              </button>
              <button type="button" className="secondary-button" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="manufacturing-card">
          <h2>Search Results</h2>
          {loading ? (
            <p className="manufacturing-state">Loading manufacturing history…</p>
          ) : items.length === 0 ? (
            <p className="manufacturing-state">No manufacturing records match these filters.</p>
          ) : (
            <ManufacturingHistoryTable
              items={items}
              expandedId={expandedId}
              onToggle={(entryId) =>
                setExpandedId((current) => (current === entryId ? "" : entryId))
              }
            />
          )}
          {pagination?.totalPages > 1 && (
            <div className="manufacturing-pagination">
              <button
                type="button"
                disabled={pagination.page === 1 || loading}
                onClick={() => loadHistory(pagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadHistory(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ManufacturingHistoryPage;
