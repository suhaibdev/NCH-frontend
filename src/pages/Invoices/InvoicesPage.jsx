import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise } from "../../utils/gst";
import { formatDateOnly, isCanceledRequest } from "../../utils/estimates";
import { TAX_TYPE_LABELS } from "../../utils/invoiceTax";

import "../AdminCommon.css";
import "../Estimates/Estimates.css";
import "./Invoices.css";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["customer", "status", "from", "to", "search"];
const STATUS_LABELS = { active: "Active", reversed: "Reversed" };

const readFilters = (params) =>
  Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) || ""]));

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const appliedFilters = useMemo(() => readFilters(searchParams), [searchParams]);
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

        const response = await api.get("/invoices", { params, signal: controller.signal });
        const data = response.data || {};

        setRows(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Number(data.totalPages) || 1);
        setListState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        setRows([]);
        setListError(err.response?.data?.message || "Unable to load invoices.");
        setListState("error");
      }
    };

    load();
    return () => controller.abort();
  }, [appliedFilters, page, reload]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = {};
    FILTER_KEYS.forEach((key) => {
      const value = String(draft[key] || "").trim();
      if (value) next[key] = value;
    });
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams({});

  const goToPage = (nextPage) => {
    const next = Object.fromEntries(searchParams.entries());
    next.page = String(nextPage);
    setSearchParams(next);
  };

  const hasFilters = FILTER_KEYS.some((key) => appliedFilters[key]);

  const openInvoice = (invoiceId) => navigate(`/admin/invoices/${invoiceId}`);

  const newInvoiceLink = appliedFilters.customer
    ? `/admin/invoices/new?customer=${encodeURIComponent(appliedFilters.customer)}`
    : "/admin/invoices/new";

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <h1>Invoices</h1>
          <p>GST tax invoices. Stock is deducted when an invoice is saved.</p>
        </div>
        <div className="est-header-actions">
          <Link to={newInvoiceLink} className="ep-btn ep-btn-primary">
            New Invoice
          </Link>
        </div>
      </div>

      <section className="est-card">
        <form className="est-filters" onSubmit={applyFilters}>
          <div className="est-field">
            <label htmlFor="inv-filter-customer">Customer</label>
            <select
              id="inv-filter-customer"
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
            <label htmlFor="inv-filter-status">Status</label>
            <select
              id="inv-filter-status"
              className="ep-input"
              value={draft.status}
              onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>

          <div className="est-field">
            <label htmlFor="inv-filter-from">From</label>
            <input
              id="inv-filter-from"
              type="date"
              className="ep-input"
              value={draft.from}
              onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
            />
          </div>

          <div className="est-field">
            <label htmlFor="inv-filter-to">To</label>
            <input
              id="inv-filter-to"
              type="date"
              className="ep-input"
              value={draft.to}
              onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>

          <div className="est-field">
            <label htmlFor="inv-filter-search">Invoice No.</label>
            <input
              id="inv-filter-search"
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
              disabled={!hasFilters}
            >
              Clear
            </button>
          </div>
        </form>

        {listState === "loading" ? (
          <div className="est-state">Loading invoices...</div>
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
            <p>{hasFilters ? "No invoices match these filters." : "No invoices yet."}</p>
            {!hasFilters && (
              <Link to={newInvoiceLink} className="ep-btn ep-btn-primary">
                New Invoice
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="est-table-wrapper">
              <table className="ep-table est-table">
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Tax</th>
                    <th className="num">Total</th>
                    <th className="num">Paid</th>
                    <th className="num">Outstanding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row._id}
                      className="est-row"
                      tabIndex={0}
                      onClick={() => openInvoice(row._id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openInvoice(row._id);
                        }
                      }}
                      aria-label={`Open invoice ${row.invoiceNumber}`}
                    >
                      <td className="est-cell-main">
                        <strong>{row.invoiceNumber}</strong>
                        {row.sourceEstimateNumber && (
                          <div className="est-muted">from {row.sourceEstimateNumber}</div>
                        )}
                      </td>
                      <td data-label="Date">{formatDateOnly(row.invoiceDate)}</td>
                      <td data-label="Customer">{row.customerName || "-"}</td>
                      <td data-label="Tax">{TAX_TYPE_LABELS[row.taxType] || "-"}</td>
                      <td className="num est-money" data-label="Total">
                        {formatPaise(row.totalPaise)}
                      </td>
                      <td className="num est-money" data-label="Paid">
                        {formatPaise(row.paidPaise)}
                      </td>
                      <td className="num est-money" data-label="Outstanding">
                        {row.status === "active" ? formatPaise(row.outstandingPaise) : "-"}
                      </td>
                      <td className="est-cell-side">
                        <span className={`est-status ${row.status}`}>
                          {STATUS_LABELS[row.status] || row.status}
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

export default InvoicesPage;
