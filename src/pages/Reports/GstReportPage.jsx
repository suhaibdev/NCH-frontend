import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import api from "../../config/axios";
import { formatPaise, formatState } from "../../utils/gst";
import {
  formatDateOnly,
  formatTimestamp,
  getBusinessToday,
  isCanceledRequest,
} from "../../utils/estimates";
import { TAX_TYPE_LABELS, formatSignedPaise } from "../../utils/invoiceTax";
import {
  SUPPLY_LABELS,
  blobErrorMessage,
  financialYearOf,
  financialYearOptions,
  monthsOfFinancialYear,
  periodFromParams,
  periodQuery,
  periodSearch,
} from "../../utils/gstReport";

import "../AdminCommon.css";
import "../Estimates/Estimates.css";
import "./GstReport.css";

const REGISTER_PAGE_SIZE = 20;
const UNIT_LABELS = { pcs: "PCS", dozen: "Dozen" };

/** Loads one report section for the current period. */
const useReportSection = (url, query, extraKey = "") => {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const key = JSON.stringify(query) + extraKey;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setState("loading");
        setError("");
        const response = await api.get(url, { params: query, signal: controller.signal });
        setData(response.data);
        setState("success");
      } catch (err) {
        if (isCanceledRequest(err, controller)) return;
        setError(err.response?.data?.message || "Unable to load this part of the report.");
        setState("error");
      }
    };
    load();
    return () => controller.abort();
    // `key` captures every value of `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, reload]);

  return { data, state, error, retry: () => setReload((value) => value + 1) };
};

const SectionState = ({ section, emptyText, isEmpty, children }) => {
  if (section.state === "loading") return <div className="est-state">Loading...</div>;
  if (section.state === "error") {
    return (
      <div className="est-state error">
        <p>{section.error}</p>
        <button type="button" className="ep-btn ep-btn-secondary" onClick={section.retry}>
          Retry
        </button>
      </div>
    );
  }
  if (isEmpty) return <div className="est-state">{emptyText}</div>;
  return children;
};

const GstReportPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = getBusinessToday();

  const period = useMemo(() => periodFromParams(searchParams, today), [searchParams, today]);
  const query = useMemo(() => periodQuery(period), [period]);
  const registerPage = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  /* ---------- period controls (draft until Apply) ---------- */
  const initialFy =
    period.mode === "fy"
      ? period.fy
      : financialYearOf(period.mode === "range" ? period.from : `${period.month}-01`);
  const [draftFy, setDraftFy] = useState(initialFy);
  const [draftMonth, setDraftMonth] = useState(period.mode === "month" ? period.month : "year");
  const [useRange, setUseRange] = useState(period.mode === "range");
  const [draftFrom, setDraftFrom] = useState(period.mode === "range" ? period.from : "");
  const [draftTo, setDraftTo] = useState(period.mode === "range" ? period.to : "");
  const [periodError, setPeriodError] = useState("");

  const fyOptions = financialYearOptions(today);
  const monthOptions = monthsOfFinancialYear(draftFy, today);

  const applyPeriod = (event) => {
    event.preventDefault();
    setPeriodError("");
    let next;
    if (useRange) {
      if (!draftFrom || !draftTo) return setPeriodError("Choose both From and To dates.");
      if (draftFrom > draftTo) return setPeriodError("From date cannot be after To date.");
      next = { mode: "range", from: draftFrom, to: draftTo };
    } else if (draftMonth === "year") {
      next = { mode: "fy", fy: draftFy };
    } else {
      next = { mode: "month", month: draftMonth };
    }
    setSearchParams(periodSearch(next));
    return undefined;
  };

  /* ---------- data ---------- */
  const summary = useReportSection("/reports/gst/summary", query);
  const hsn = useReportSection("/reports/gst/hsn", query);
  const registerQuery = useMemo(
    () => ({ ...query, page: registerPage, limit: REGISTER_PAGE_SIZE }),
    [query, registerPage]
  );
  const register = useReportSection("/reports/gst/invoices", registerQuery);

  const goToPage = (page) => {
    setSearchParams({ ...periodSearch(period), page: String(page) });
  };

  /* ---------- CSV download (authenticated, so via axios as a Blob) ---------- */
  const [downloading, setDownloading] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const download = async (section) => {
    try {
      setDownloading(section);
      setDownloadError("");
      const response = await api.get("/reports/gst/export.csv", {
        params: { ...query, section },
        responseType: "blob",
      });
      const disposition = response.headers?.["content-disposition"] || "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || `gst-${section}.csv`;
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(await blobErrorMessage(err, "Unable to download the CSV."));
    } finally {
      setDownloading("");
    }
  };

  const downloadButton = (section, label) => (
    <button
      type="button"
      className="ep-btn ep-btn-secondary"
      onClick={() => download(section)}
      disabled={Boolean(downloading)}
    >
      {downloading === section ? "Preparing..." : label}
    </button>
  );

  const report = summary.data;
  const totals = report?.totals;

  return (
    <div className="ep-container est-page">
      <div className="est-header">
        <div>
          <Link to="/admin/dashboard" className="est-back-link">
            Back
          </Link>
          <h1>GST Report</h1>
          <p>
            Built from saved GST invoices only. Estimates and challans are never included; reversed
            invoices are listed separately and excluded from every total.
          </p>
        </div>
      </div>

      <section className="est-card">
        <form className="gst-period" onSubmit={applyPeriod}>
          <div className="est-field">
            <label htmlFor="gst-fy">Financial Year</label>
            <select
              id="gst-fy"
              className="ep-input"
              value={draftFy}
              onChange={(event) => {
                setDraftFy(event.target.value);
                setDraftMonth("year");
              }}
              disabled={useRange}
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>

          <div className="est-field">
            <label htmlFor="gst-month">Period</label>
            <select
              id="gst-month"
              className="ep-input"
              value={draftMonth}
              onChange={(event) => setDraftMonth(event.target.value)}
              disabled={useRange}
            >
              <option value="year">Whole year</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <label className="gst-check">
            <input
              type="checkbox"
              checked={useRange}
              onChange={(event) => setUseRange(event.target.checked)}
            />
            Custom range
          </label>

          <div className="est-field">
            <label htmlFor="gst-from">From</label>
            <input
              id="gst-from"
              type="date"
              className="ep-input"
              max={today}
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              disabled={!useRange}
            />
          </div>

          <div className="est-field">
            <label htmlFor="gst-to">To</label>
            <input
              id="gst-to"
              type="date"
              className="ep-input"
              max={today}
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              disabled={!useRange}
            />
          </div>

          <button type="submit" className="ep-btn ep-btn-primary">
            Show Report
          </button>
        </form>
        {useRange && <p className="gst-note">A custom range can cover at most 366 days.</p>}
        {periodError && (
          <div className="est-inline-panel">
            <div className="est-message error">{periodError}</div>
          </div>
        )}
      </section>

      {downloadError && <div className="est-message error">{downloadError}</div>}

      {/* ---------- summary ---------- */}
      {summary.state === "loading" ? (
        <div className="est-state">Loading report...</div>
      ) : summary.state === "error" ? (
        <div className="est-state error">
          <p>{summary.error}</p>
          <button type="button" className="ep-btn ep-btn-secondary" onClick={summary.retry}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <h2 className="gst-period-title">{report.period.label}</h2>
          {report.warnings.map((warning) => (
            <div key={warning} className="est-message error">
              {warning}
            </div>
          ))}

          <div className="gst-cards">
            <div>
              <span>Taxable</span>
              <strong className="est-money">{formatPaise(totals.taxablePaise)}</strong>
            </div>
            <div>
              <span>CGST</span>
              <strong className="est-money">{formatPaise(totals.cgstPaise)}</strong>
            </div>
            <div>
              <span>SGST</span>
              <strong className="est-money">{formatPaise(totals.sgstPaise)}</strong>
            </div>
            <div>
              <span>IGST</span>
              <strong className="est-money">{formatPaise(totals.igstPaise)}</strong>
            </div>
            <div>
              <span>Round Off</span>
              <strong className="est-money">
                {formatSignedPaise(totals.roundOffPaise, formatPaise)}
              </strong>
            </div>
            <div>
              <span>Total</span>
              <strong className="est-money">{formatPaise(totals.totalPaise)}</strong>
            </div>
          </div>

          <div className="gst-meta">
            <span>
              {totals.invoiceCount} invoice{totals.invoiceCount === 1 ? "" : "s"}
            </span>
            {report.numberRange.first && (
              <span>
                {report.numberRange.first} to {report.numberRange.last}
              </span>
            )}
            {report.reconciliation.totalsReconcile ? (
              <span className="gst-badge ok">Totals reconcile</span>
            ) : (
              <span className="gst-badge bad">
                Totals do not reconcile ({report.reconciliation.mismatchedInvoices} invoice
                {report.reconciliation.mismatchedInvoices === 1 ? "" : "s"})
              </span>
            )}
            {report.reversed.count > 0 && (
              <span className="gst-badge warn">{report.reversed.count} reversed (excluded)</span>
            )}
          </div>

          {/* ---------- rate-wise ---------- */}
          <section className="est-card">
            <div className="est-card-header">
              <div>
                <h2>Rate-wise Summary</h2>
                <p>Round-off is at invoice level, so it is shown in the totals only.</p>
              </div>
              {downloadButton("rate", "Download CSV")}
            </div>
            <SectionState
              section={summary}
              isEmpty={report.byRate.length === 0}
              emptyText="No GST invoices in this period."
            >
              <div className="est-table-wrapper">
                <table className="ep-table est-table">
                  <thead>
                    <tr>
                      <th>GST Rate</th>
                      <th className="num">Taxable</th>
                      <th className="num">CGST</th>
                      <th className="num">SGST</th>
                      <th className="num">IGST</th>
                      <th className="num">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byRate.map((row) => (
                      <tr key={row.gstRatePercent}>
                        <td className="est-cell-main">
                          <strong>{row.gstRatePercent}%</strong>
                        </td>
                        <td className="num est-money" data-label="Taxable">
                          {formatPaise(row.taxablePaise)}
                        </td>
                        <td className="num est-money" data-label="CGST">
                          {formatPaise(row.cgstPaise)}
                        </td>
                        <td className="num est-money" data-label="SGST">
                          {formatPaise(row.sgstPaise)}
                        </td>
                        <td className="num est-money" data-label="IGST">
                          {formatPaise(row.igstPaise)}
                        </td>
                        <td className="num est-money est-cell-side">{formatPaise(row.taxPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionState>
          </section>

          {/* ---------- B2B / B2C ---------- */}
          <section className="est-card">
            <div className="est-card-header">
              <div>
                <h2>B2B and B2C</h2>
                <p>B2B: the invoice shows a customer GSTIN. B2C: unregistered customer.</p>
              </div>
            </div>
            <SectionState
              section={summary}
              isEmpty={report.bySupplyType.length === 0}
              emptyText="No GST invoices in this period."
            >
              <div className="est-table-wrapper">
                <table className="ep-table est-table">
                  <thead>
                    <tr>
                      <th>Supply</th>
                      <th>Tax</th>
                      <th className="num">Invoices</th>
                      <th className="num">Taxable</th>
                      <th className="num">CGST</th>
                      <th className="num">SGST</th>
                      <th className="num">IGST</th>
                      <th className="num">Round Off</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bySupplyType.map((row) => (
                      <tr key={`${row.supplyType}-${row.taxType}`}>
                        <td className="est-cell-main">
                          <strong>{SUPPLY_LABELS[row.supplyType]}</strong>
                        </td>
                        <td data-label="Tax">{TAX_TYPE_LABELS[row.taxType] || row.taxType}</td>
                        <td className="num" data-label="Invoices">
                          {row.invoiceCount}
                        </td>
                        <td className="num est-money" data-label="Taxable">
                          {formatPaise(row.taxablePaise)}
                        </td>
                        <td className="num est-money" data-label="CGST">
                          {formatPaise(row.cgstPaise)}
                        </td>
                        <td className="num est-money" data-label="SGST">
                          {formatPaise(row.sgstPaise)}
                        </td>
                        <td className="num est-money" data-label="IGST">
                          {formatPaise(row.igstPaise)}
                        </td>
                        <td className="num est-money" data-label="Round Off">
                          {formatSignedPaise(row.roundOffPaise, formatPaise)}
                        </td>
                        <td className="num est-money est-cell-side">
                          {formatPaise(row.totalPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionState>
          </section>
        </>
      )}

      {/* ---------- HSN-wise ---------- */}
      <section className="est-card">
        <div className="est-card-header">
          <div>
            <h2>HSN-wise Summary</h2>
            <p>Tax apportioned by taxable value within each GST rate.</p>
          </div>
          {downloadButton("hsn", "Download CSV")}
        </div>
        <SectionState
          section={hsn}
          isEmpty={hsn.data?.items?.length === 0}
          emptyText="No GST invoices in this period."
        >
          {hsn.data && (
            <>
              {hsn.data.warnings.map((warning) => (
                <div key={warning} className="est-inline-panel">
                  <div className="est-message error">{warning}</div>
                </div>
              ))}
              <div className="est-table-wrapper">
                <table className="ep-table est-table">
                  <thead>
                    <tr>
                      <th>HSN</th>
                      <th>Rate</th>
                      <th>Unit</th>
                      <th className="num">Quantity</th>
                      <th className="num">Taxable</th>
                      <th className="num">CGST</th>
                      <th className="num">SGST</th>
                      <th className="num">IGST</th>
                      <th className="num">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hsn.data.items.map((row) => (
                      <tr key={`${row.hsnCode}-${row.gstRatePercent}-${row.unit}`}>
                        <td className="est-cell-main">
                          <strong>{row.hsnCode}</strong>
                        </td>
                        <td data-label="Rate">{row.gstRatePercent}%</td>
                        <td data-label="Unit">{UNIT_LABELS[row.unit] || row.unit}</td>
                        <td className="num" data-label="Quantity">
                          {row.quantity}
                        </td>
                        <td className="num est-money" data-label="Taxable">
                          {formatPaise(row.taxablePaise)}
                        </td>
                        <td className="num est-money" data-label="CGST">
                          {formatPaise(row.cgstPaise)}
                        </td>
                        <td className="num est-money" data-label="SGST">
                          {formatPaise(row.sgstPaise)}
                        </td>
                        <td className="num est-money" data-label="IGST">
                          {formatPaise(row.igstPaise)}
                        </td>
                        <td className="num est-money est-cell-side">{formatPaise(row.taxPaise)}</td>
                      </tr>
                    ))}
                    <tr className="gst-total-row">
                      <td className="est-cell-main">
                        <strong>Total</strong>
                      </td>
                      <td className="gst-empty-cell" aria-hidden="true" />
                      <td className="gst-empty-cell" aria-hidden="true" />
                      <td className="num" data-label="Quantity">
                        {hsn.data.totals.quantity}
                      </td>
                      <td className="num est-money" data-label="Taxable">
                        {formatPaise(hsn.data.totals.taxablePaise)}
                      </td>
                      <td className="num est-money" data-label="CGST">
                        {formatPaise(hsn.data.totals.cgstPaise)}
                      </td>
                      <td className="num est-money" data-label="SGST">
                        {formatPaise(hsn.data.totals.sgstPaise)}
                      </td>
                      <td className="num est-money" data-label="IGST">
                        {formatPaise(hsn.data.totals.igstPaise)}
                      </td>
                      <td className="num est-money est-cell-side">
                        {formatPaise(hsn.data.totals.taxPaise)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionState>
      </section>

      {/* ---------- register ---------- */}
      <section className="est-card">
        <div className="est-card-header">
          <div>
            <h2>Invoice Register</h2>
            <p>Active GST invoices in the period, in date and number order.</p>
          </div>
          {downloadButton("register", "Download CSV")}
        </div>
        <SectionState
          section={register}
          isEmpty={register.data?.items?.length === 0}
          emptyText="No GST invoices in this period."
        >
          {register.data && (
            <>
              <div className="est-table-wrapper">
                <table className="ep-table est-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice No.</th>
                      <th>Customer</th>
                      <th>GSTIN</th>
                      <th>State</th>
                      <th className="num">Taxable</th>
                      <th className="num">CGST</th>
                      <th className="num">SGST</th>
                      <th className="num">IGST</th>
                      <th className="num">Round Off</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {register.data.items.map((row) => (
                      <tr
                        key={row._id}
                        className="est-row"
                        tabIndex={0}
                        onClick={() => navigate(`/admin/invoices/${row._id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate(`/admin/invoices/${row._id}`);
                          }
                        }}
                        aria-label={`Open invoice ${row.invoiceNumber}`}
                      >
                        <td data-label="Date">{formatDateOnly(row.invoiceDate)}</td>
                        <td className="est-cell-main">
                          <strong>{row.invoiceNumber}</strong>
                        </td>
                        <td data-label="Customer">{row.customerName || "-"}</td>
                        <td data-label="GSTIN">{row.gstin || "Unregistered"}</td>
                        <td data-label="State">{formatState(row.stateCode) || "-"}</td>
                        <td className="num est-money" data-label="Taxable">
                          {formatPaise(row.taxablePaise)}
                        </td>
                        <td className="num est-money" data-label="CGST">
                          {formatPaise(row.cgstPaise)}
                        </td>
                        <td className="num est-money" data-label="SGST">
                          {formatPaise(row.sgstPaise)}
                        </td>
                        <td className="num est-money" data-label="IGST">
                          {formatPaise(row.igstPaise)}
                        </td>
                        <td className="num est-money" data-label="Round Off">
                          {formatSignedPaise(row.roundOffPaise, formatPaise)}
                        </td>
                        <td className="num est-money est-cell-side">
                          {formatPaise(row.totalPaise)}
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
                  disabled={registerPage <= 1}
                  onClick={() => goToPage(registerPage - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {registerPage} of {register.data.totalPages} · {register.data.total} total
                </span>
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  disabled={registerPage >= register.data.totalPages}
                  onClick={() => goToPage(registerPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </SectionState>
      </section>

      {/* ---------- reversed ---------- */}
      {summary.state === "success" && report.reversed.count > 0 && (
        <section className="est-card">
          <div className="est-card-header">
            <div>
              <h2>Reversed Invoices (excluded)</h2>
              <p>
                Not counted anywhere above. "Reversed after period" means this period&apos;s numbers
                changed after it ended; a filed return may need a credit note.
              </p>
            </div>
          </div>
          <div className="est-table-wrapper">
            <table className="ep-table est-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Invoice Date</th>
                  <th>Reversed On</th>
                  <th className="num">Total</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {report.reversed.items.map((row) => (
                  <tr
                    key={row._id}
                    className="est-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/invoices/${row._id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/admin/invoices/${row._id}`);
                      }
                    }}
                    aria-label={`Open invoice ${row.invoiceNumber}`}
                  >
                    <td className="est-cell-main">
                      <strong>{row.invoiceNumber}</strong>
                    </td>
                    <td data-label="Invoice Date">{formatDateOnly(row.invoiceDate)}</td>
                    <td data-label="Reversed On">{formatTimestamp(row.reversedAt)}</td>
                    <td className="num est-money est-cell-side">{formatPaise(row.totalPaise)}</td>
                    <td data-label="Note">
                      {row.reversedAfterPeriod ? (
                        <span className="gst-badge warn">Reversed after period</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.reversed.count > report.reversed.items.length && (
            <p className="gst-note">
              Showing the first {report.reversed.items.length} of {report.reversed.count}.
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default GstReportPage;
