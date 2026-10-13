import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../../config/axios";

import "../AdminCommon.css";
import "./SuppliersPage.css";

const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["bank_transfer", "Bank Transfer"],
  ["upi", "UPI"],
  ["cheque", "Cheque"],
  ["other", "Other"],
];
const formatRupees = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);

const SupplierDetailPage = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [receipts, setReceipts] = useState([]);
  const [receiptPagination, setReceiptPagination] = useState(null);
  const [receiptsState, setReceiptsState] = useState("loading");
  const [receiptsError, setReceiptsError] = useState("");
  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptsReload, setReceiptsReload] = useState(0);
  const [summary, setSummary] = useState(null);
  const [accountState, setAccountState] = useState("loading");
  const [accountError, setAccountError] = useState("");
  const [accountReload, setAccountReload] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [ledgerState, setLedgerState] = useState("loading");
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerPagination, setLedgerPagination] = useState(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerReload, setLedgerReload] = useState(0);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: today(),
    method: "cash",
    reference: "",
    notes: "",
  });
  const [paymentError, setPaymentError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadSupplier = async () => {
      try {
        setState("loading");
        setError("");

        const response = await api.get(`/suppliers/${supplierId}`, { signal: controller.signal });

        setSupplier(response.data);
        setState("success");
      } catch (err) {
        if (err.code === "ERR_CANCELED" || controller.signal.aborted) {
          return;
        }

        if (err.response?.status === 404) {
          setState("notFound");
          return;
        }

        setError(err.response?.data?.message || "Unable to load supplier.");
        setState("error");
      }
    };

    loadSupplier();

    return () => controller.abort();
  }, [supplierId, reloadVersion]);

  useEffect(() => {
    const controller = new AbortController();

    const loadReceipts = async () => {
      try {
        setReceiptsState("loading");
        setReceiptsError("");
        const response = await api.get("/material-receipts", {
          params: { supplier: supplierId, page: receiptPage, limit: 10 },
          signal: controller.signal,
        });
        setReceipts(Array.isArray(response.data?.items) ? response.data.items : []);
        setReceiptPagination(response.data?.pagination || null);
        setReceiptsState("success");
      } catch (err) {
        if (err.code === "ERR_CANCELED" || controller.signal.aborted) return;
        setReceipts([]);
        setReceiptsError(err.response?.data?.message || "Unable to load material receipts.");
        setReceiptsState("error");
      }
    };

    loadReceipts();
    return () => controller.abort();
  }, [supplierId, receiptPage, receiptsReload]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/suppliers/${supplierId}/account-summary`, { signal: controller.signal })
      .then((response) => {
        setSummary(response.data);
        setAccountState("success");
      })
      .catch((err) => {
        if (err.code === "ERR_CANCELED" || controller.signal.aborted) return;
        setAccountError(err.response?.data?.message || "Unable to load supplier account.");
        setAccountState("error");
      });
    return () => controller.abort();
  }, [supplierId, accountReload]);

  useEffect(() => {
    const controller = new AbortController();
    setLedgerState("loading");
    api
      .get(`/suppliers/${supplierId}/ledger`, {
        params: { page: ledgerPage, limit: 20 },
        signal: controller.signal,
      })
      .then((response) => {
        setLedger(Array.isArray(response.data?.items) ? response.data.items : []);
        setLedgerPagination(response.data?.pagination || null);
        setLedgerState("success");
      })
      .catch((err) => {
        if (err.code === "ERR_CANCELED" || controller.signal.aborted) return;
        setLedgerError(err.response?.data?.message || "Unable to load supplier ledger.");
        setLedgerState("error");
      });
    return () => controller.abort();
  }, [supplierId, ledgerPage, ledgerReload]);

  const recordPayment = async (event) => {
    event.preventDefault();
    const match = /^\d+(?:\.\d{1,2})?$/.test(paymentForm.amount.trim());
    const amountPaise = match ? Math.round(Number(paymentForm.amount) * 100) : 0;
    if (!amountPaise) return setPaymentError("Enter a payment amount greater than zero.");
    if (amountPaise > summary.outstandingPaise)
      return setPaymentError(
        `Payment cannot exceed the outstanding balance of ${formatRupees(summary.outstandingPaise)}.`
      );
    try {
      setIsRecording(true);
      setPaymentError("");
      const response = await api.post("/supplier-payments", {
        supplier: supplierId,
        ...paymentForm,
      });
      setSummary((current) => ({ ...current, ...response.data.summary }));
      setShowPaymentForm(false);
      setMessage(
        `Payment recorded successfully. Updated outstanding: ${formatRupees(response.data.summary.outstandingPaise)}.`
      );
      setLedgerPage(1);
      setLedgerReload((value) => value + 1);
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Unable to record payment.");
      setAccountReload((value) => value + 1);
    } finally {
      setIsRecording(false);
    }
  };

  if (state === "loading") {
    return <div className="ep-container suppliers-page suppliers-state">Loading supplier...</div>;
  }

  if (state === "notFound") {
    return (
      <div className="ep-container suppliers-page suppliers-state">
        <p>Supplier not found.</p>
        <Link to="/admin/suppliers" className="ep-btn ep-btn-secondary">
          Back
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="ep-container suppliers-page suppliers-state suppliers-error-state">
        <p>{error}</p>
        <button
          type="button"
          className="ep-btn ep-btn-secondary"
          onClick={() => setReloadVersion((value) => value + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  const details = [
    ["Contact Person", supplier.contactPerson],
    ["Phone", supplier.phone],
    ["Email", supplier.email],
    ["Address", supplier.address],
    ["GST Number", supplier.gstNumber],
    ["Notes", supplier.notes],
  ];

  return (
    <div className="ep-container suppliers-page">
      <div className="suppliers-header">
        <div>
          <Link to="/admin/suppliers" className="suppliers-back-link">
            Back
          </Link>
          <h1>{supplier.name}</h1>
          <p>Supplier master details.</p>
        </div>
        <div className="supplier-detail-actions">
          <Link className="ep-btn ep-btn-primary" to={`/admin/suppliers/${supplier._id}/receive`}>
            Receive Material
          </Link>
          <button
            type="button"
            className="ep-btn ep-btn-secondary"
            onClick={() =>
              navigate("/admin/suppliers", { state: { editSupplierId: supplier._id } })
            }
          >
            Edit Supplier
          </button>
        </div>
      </div>

      {message && <div className="suppliers-message success">{message}</div>}

      <section className="suppliers-card supplier-account-card">
        <div className="suppliers-list-header">
          <div>
            <h2>Account Summary</h2>
            <p>Derived from material receipts and permanent payments.</p>
          </div>
          {accountState === "success" && summary.outstandingPaise > 0 && (
            <button
              type="button"
              className="ep-btn ep-btn-primary"
              onClick={() => {
                setPaymentError("");
                setShowPaymentForm(true);
              }}
            >
              Record Payment
            </button>
          )}
        </div>
        {accountState === "loading" ? (
          <div className="suppliers-state">Loading account...</div>
        ) : accountState === "error" ? (
          <div className="suppliers-state suppliers-error-state">
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
            <div className="supplier-summary-grid">
              <div>
                <span>Total Purchases</span>
                <strong>{formatRupees(summary.totalPurchasesPaise)}</strong>
              </div>
              <div>
                <span>Total Paid</span>
                <strong>{formatRupees(summary.totalPaidPaise)}</strong>
              </div>
              <div>
                <span>Outstanding</span>
                <strong>{formatRupees(summary.outstandingPaise)}</strong>
              </div>
            </div>
            {summary.outstandingPaise <= 0 && (
              <p className="supplier-no-outstanding">No outstanding payment.</p>
            )}
          </>
        )}
      </section>

      <section className="suppliers-card supplier-detail-card">
        <h2>Supplier Details</h2>
        <dl className="supplier-details-grid">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "-"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="suppliers-card supplier-ledger-card">
        <div className="suppliers-list-header">
          <div>
            <h2>Supplier Ledger</h2>
            <p>Purchases increase what is owed; payments reduce it.</p>
          </div>
        </div>
        {ledgerState === "loading" ? (
          <div className="suppliers-state">Loading ledger...</div>
        ) : ledgerState === "error" ? (
          <div className="suppliers-state suppliers-error-state">
            <p>{ledgerError}</p>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={() => setLedgerReload((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : ledger.length === 0 ? (
          <div className="suppliers-state">No purchase or payment activity has been recorded.</div>
        ) : (
          <>
            <div className="suppliers-table-wrapper">
              <table className="ep-table supplier-ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Purchase</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={`${entry.type}-${entry._id}`}>
                      <td>{new Date(entry.effectiveDate).toLocaleDateString("en-IN")}</td>
                      <td>{entry.type === "purchase" ? "Purchase" : "Payment"}</td>
                      <td>
                        {entry.type === "purchase"
                          ? `${entry.stockTypeName} · ${entry.quantity} ${entry.unit?.toUpperCase()}${entry.supplierBillNumber ? ` · Bill ${entry.supplierBillNumber}` : ""}`
                          : `${PAYMENT_METHODS.find(([value]) => value === entry.method)?.[1] || entry.method}${entry.reference ? ` · ${entry.reference}` : ""}`}
                      </td>
                      <td>
                        {entry.type === "purchase" ? `+ ${formatRupees(entry.amountPaise)}` : "-"}
                      </td>
                      <td>
                        {entry.type === "payment" ? `- ${formatRupees(entry.amountPaise)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ledgerPagination?.totalPages > 1 && (
              <div className="suppliers-pagination">
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  disabled={ledgerPage <= 1}
                  onClick={() => setLedgerPage((value) => value - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {ledgerPagination.page} of {ledgerPagination.totalPages}
                </span>
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  disabled={ledgerPage >= ledgerPagination.totalPages}
                  onClick={() => setLedgerPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="suppliers-card supplier-receipts-card">
        <div className="suppliers-list-header">
          <div>
            <h2>Recent Material Receipts</h2>
            <p>Operational receipt history.</p>
          </div>
        </div>

        {receiptsState === "loading" ? (
          <div className="suppliers-state">Loading receipts...</div>
        ) : receiptsState === "error" ? (
          <div className="suppliers-state suppliers-error-state">
            <p>{receiptsError}</p>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={() => setReceiptsReload((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="suppliers-state">
            No material receipts have been recorded for this supplier.
          </div>
        ) : (
          <>
            <div className="suppliers-table-wrapper">
              <table className="ep-table supplier-receipts-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Condition</th>
                    <th>Stock Type</th>
                    <th>Size</th>
                    <th>Quantity</th>
                    <th>Price / PCS</th>
                    <th>Amount</th>
                    <th>Bill No.</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt._id}>
                      <td>{new Date(receipt.receivedDate).toLocaleDateString("en-IN")}</td>
                      <td>
                        {receipt.materialCondition === "already_washed"
                          ? "Already Washed"
                          : "Not Washed"}
                      </td>
                      <td>
                        <strong>{receipt.stockTypeName}</strong>
                      </td>
                      <td>
                        {receipt.size.lengthValue} {receipt.size.lengthUnit} ×{" "}
                        {receipt.size.widthValue} {receipt.size.widthUnit}
                      </td>
                      <td>{receipt.quantity} PCS</td>
                      <td>{formatRupees(receipt.pricePerPiecePaise)}</td>
                      <td>{formatRupees(receipt.totalAmountPaise)}</td>
                      <td>{receipt.supplierBillNumber || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {receiptPagination?.totalPages > 1 && (
              <div className="suppliers-pagination">
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  disabled={receiptPage <= 1}
                  onClick={() => setReceiptPage((value) => value - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {receiptPagination.page} of {receiptPagination.totalPages}
                </span>
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  disabled={receiptPage >= receiptPagination.totalPages}
                  onClick={() => setReceiptPage((value) => value + 1)}
                >
                  View More
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {showPaymentForm && summary && (
        <div className="suppliers-modal-backdrop">
          <div className="suppliers-modal" role="dialog" aria-modal="true">
            <div className="suppliers-modal-header">
              <div>
                <h2>Record Payment</h2>
                <p>
                  {supplier.name} · Outstanding {formatRupees(summary.outstandingPaise)}
                </p>
              </div>
              <button
                type="button"
                className="suppliers-close"
                onClick={() => setShowPaymentForm(false)}
                disabled={isRecording}
              >
                ×
              </button>
            </div>
            <form className="suppliers-form" onSubmit={recordPayment}>
              {paymentError && <div className="suppliers-message error">{paymentError}</div>}
              <label className="suppliers-field">
                <span>Supplier</span>
                <input value={supplier.name} disabled />
              </label>
              <label className="suppliers-field">
                <span>Current Outstanding</span>
                <input value={formatRupees(summary.outstandingPaise)} disabled />
              </label>
              <label className="suppliers-field">
                <span>Payment Amount *</span>
                <input
                  value={paymentForm.amount}
                  inputMode="decimal"
                  onChange={(event) =>
                    setPaymentForm((value) => ({ ...value, amount: event.target.value }))
                  }
                  disabled={isRecording}
                />
              </label>
              <label className="suppliers-field">
                <span>Payment Date *</span>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(event) =>
                    setPaymentForm((value) => ({ ...value, paymentDate: event.target.value }))
                  }
                  disabled={isRecording}
                />
              </label>
              <label className="suppliers-field">
                <span>Payment Method *</span>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((value) => ({ ...value, method: event.target.value }))
                  }
                  disabled={isRecording}
                >
                  {PAYMENT_METHODS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="suppliers-field">
                <span>Reference / Transaction No.</span>
                <input
                  value={paymentForm.reference}
                  maxLength="150"
                  onChange={(event) =>
                    setPaymentForm((value) => ({ ...value, reference: event.target.value }))
                  }
                  disabled={isRecording}
                />
              </label>
              <label className="suppliers-field suppliers-field-wide">
                <span>Notes</span>
                <textarea
                  value={paymentForm.notes}
                  rows="3"
                  maxLength="500"
                  onChange={(event) =>
                    setPaymentForm((value) => ({ ...value, notes: event.target.value }))
                  }
                  disabled={isRecording}
                />
              </label>
              <div className="suppliers-form-actions">
                <button
                  type="button"
                  className="ep-btn ep-btn-secondary"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={isRecording}
                >
                  Cancel
                </button>
                <button type="submit" className="ep-btn ep-btn-primary" disabled={isRecording}>
                  {isRecording ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetailPage;
