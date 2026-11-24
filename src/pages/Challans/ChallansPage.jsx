import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import api from "../../config/axios";
import { formatDateOnly, isCanceledRequest } from "../../utils/estimates";
import { CHALLAN_STATUS_LABELS } from "../../utils/challans";

import "../AdminCommon.css";
import "../Estimates/Estimates.css";
import "./Challans.css";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["customer", "status", "from", "to", "search"];

const readFilters = (params) =>
  Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) || ""]));

const ChallansPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const appliedFilters = useMemo(() => readFilters(searchParams), [searchParams]);
  const invoiceFilter = searchParams.get("invoice") || "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [draft, setDraft] = useState(appliedFilters);

  const [customers, setCustomers] = useState([]);
  const [customersError, setCustomersError] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listState, setListState] = useState("loading");
  const [listError, setListError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setDraft(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/customers", { signal: controller.signal })
      .then((response) => {
        const list = Array.isArray(response.data) ? response.data : [];
        setCustomers(
          [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        );
      })
      .catch((err) => {
        if (isCanceledRequest(err, controller)) return;
        setCustomersError("Customer filter unavailable.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setListState("loading");
        setListError("");

        const params = { page, limit: PAGE_SIZE };
        FILTER_KEYS.forEach((key) => {
          if (appliedFilters[key]) params[key] = appliedFilters[key];
        });
        if (invoiceFilter) params.invoice = invoiceFilter;

        const response = await api.get("/challans", { params, signal: controller.signal });
        const data = response.data || {};

        setRows(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Number(data.totalPages) || 1);
        setListState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        setRows([]);
        setListError(err.response?.data?.message || "Unable to load challans.");
        setListState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [appliedFilters, invoiceFilter, page, reload]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = {};
    FILTER_KEYS.forEach((key) => {
      const value = String(draft[key] || "").trim();
      if (value) next[key] = value;
    });
    if (invoiceFilter) next.invoice = invoiceFilter;
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams(invoiceFilter ? { invoice: invoiceFilter } : {});

  const clearInvoiceFilter = () => {
    const next = Object.fromEntries(searchParams.entries());
    delete next.invoice;
    delete next.page;
    setSearchParams(next);
  };

  const goToPage = (nextPage) => {
    const next = Object.fromEntries(searchParams.entries());
    next.page = String(nextPage);
    setSearchParams(next);
  };

  const hasFilters = FILTER_KEYS.some((key) => appliedFilters[key]) || Boolean(invoiceFilter);

  const openChallan = (challanId) => navigate(`/admin/challans/${challanId}`);

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <h1>Delivery Challans</h1>
          <p>
            Delivery records against invoices. No prices or GST, and stock is not changed. Create a
            challan from an invoice.
          </p>
        </div>
        <div className="est-header-actions">
          <Link to="/admin/invoices" className="ep-btn ep-btn-secondary">
            Go to Invoices
          </Link>
        </div>
      </div>

      <section className="est-card">
        {invoiceFilter && (
          <div className="ch-filter-chip">
            <span>Showing challans of one invoice.</span>
            <button type="button" className="ep-btn ep-btn-secondary" onClick={clearInvoiceFilter}>
              Show all challans
            </button>
          </div>
        )}

        <form className="est-filters" onSubmit={applyFilters}>
          <div className="est-field">
            <label htmlFor="ch-filter-customer">Customer</label>
            <select
              id="ch-filter-customer"
              className="ep-input"
              value={draft.customer}
              onChange={(event) => setDraft((prev) => ({ ...prev, customer: event.target.value }))}
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                  {customer.isActive === false ? " (inactive)" : ""}
                </option>
              ))}
            </select>
            {customersError && <small>{customersError}</small>}
          </div>

          <div className="est-field">
            <label htmlFor="ch-filter-status">Status</label>
            <select
              id="ch-filter-status"
              className="ep-input"
              value={draft.status}
              onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="est-field">
            <label htmlFor="ch-filter-from">From</label>
            <input
              id="ch-filter-from"
              type="date"
              className="ep-input"
              value={draft.from}
              onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
            />
          </div>

          <div className="est-field">
            <label htmlFor="ch-filter-to">To</label>
            <input
              id="ch-filter-to"
              type="date"
              className="ep-input"
              value={draft.to}
              onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>

          <div className="est-field">
            <label htmlFor="ch-filter-search">Challan No.</label>
            <input
              id="ch-filter-search"
              type="text"
              className="ep-input"
              placeholder="e.g. 0012"
              value={draft.search}
              onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
            />
          </div>

          <div className="est-filter-actions">
            <button type="submit" className="ep-btn ep-btn-primary">
              Apply
            </button>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={clearFilters}
              disabled={!FILTER_KEYS.some((key) => appliedFilters[key])}
            >
              Clear
            </button>
          </div>
        </form>

        {listState === "loading" ? (
          <div className="est-state">Loading challans...</div>
        ) : listState === "error" ? (
          <div className="est-state error">
            <p>{listError}</p>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={() => setReload((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="est-state">
            <p>{hasFilters ? "No challans match these filters." : "No challans yet."}</p>
            {!hasFilters && (
              <Link to="/admin/invoices" className="ep-btn ep-btn-primary">
                Open an invoice to create one
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="est-table-wrapper">
              <table className="ep-table est-table">
                <thead>
                  <tr>
                    <th>Challan No.</th>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th className="num">Total Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row._id}
                      className="est-row"
                      tabIndex={0}
                      onClick={() => openChallan(row._id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openChallan(row._id);
                        }
                      }}
                      aria-label={`Open challan ${row.challanNumber}`}
                    >
                      <td className="est-cell-main">
                        <strong>{row.challanNumber}</strong>
                      </td>
                      <td data-label="Date">{formatDateOnly(row.challanDate)}</td>
                      <td data-label="Invoice">{row.invoiceNumber}</td>
                      <td data-label="Customer">{row.customerName || "-"}</td>
                      <td className="num" data-label="Total Qty">
                        {row.totalQuantity}
                      </td>
                      <td className="est-cell-side">
                        <span className={`est-status ${row.status}`}>
                          {CHALLAN_STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="est-pagination">
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages} · {total} total
              </span>
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
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

export default ChallansPage;
