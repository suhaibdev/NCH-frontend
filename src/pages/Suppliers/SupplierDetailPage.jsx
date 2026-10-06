import React, { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../../config/axios";

import "../AdminCommon.css";
import "./SuppliersPage.css";


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

  useEffect(() => {
    const controller = new AbortController();

    const loadSupplier = async () => {
      try {
        setState("loading");
        setError("");

        const response = await api.get(
          `/suppliers/${supplierId}`,
          { signal: controller.signal }
        );

        setSupplier(response.data);
        setState("success");
      } catch (err) {
        if (
          err.code === "ERR_CANCELED" ||
          controller.signal.aborted
        ) {
          return;
        }

        if (err.response?.status === 404) {
          setState("notFound");
          return;
        }

        setError(
          err.response?.data?.message ||
            "Unable to load supplier."
        );
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

  if (state === "loading") {
    return <div className="ep-container suppliers-page suppliers-state">Loading supplier...</div>;
  }

  if (state === "notFound") {
    return (
      <div className="ep-container suppliers-page suppliers-state">
        <p>Supplier not found.</p>
        <Link to="/admin/suppliers" className="ep-btn ep-btn-secondary">Back to Suppliers</Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="ep-container suppliers-page suppliers-state suppliers-error-state">
        <p>{error}</p>
        <button type="button" className="ep-btn ep-btn-secondary" onClick={() => setReloadVersion((value) => value + 1)}>Retry</button>
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

  const formatRupees = (paise) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);

  return (
    <div className="ep-container suppliers-page">
      <div className="suppliers-header">
        <div>
          <Link to="/admin/suppliers" className="suppliers-back-link">Back to Suppliers</Link>
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
            onClick={() => navigate("/admin/suppliers", { state: { editSupplierId: supplier._id } })}
          >
            Edit Supplier
          </button>
        </div>
      </div>

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

      <section className="suppliers-card supplier-receipts-card">
        <div className="suppliers-list-header">
          <div>
            <h2>Recent Material Receipts</h2>
            <p>Purchase history only. Supplier Accounting is not yet implemented.</p>
          </div>
        </div>

        {receiptsState === "loading" ? (
          <div className="suppliers-state">Loading receipts...</div>
        ) : receiptsState === "error" ? (
          <div className="suppliers-state suppliers-error-state"><p>{receiptsError}</p><button type="button" className="ep-btn ep-btn-secondary" onClick={() => setReceiptsReload((value) => value + 1)}>Retry</button></div>
        ) : receipts.length === 0 ? (
          <div className="suppliers-state">No material receipts have been recorded for this supplier.</div>
        ) : (
          <>
            <div className="suppliers-table-wrapper">
              <table className="ep-table supplier-receipts-table">
                <thead><tr><th>Date</th><th>Condition</th><th>Stock Type</th><th>Size</th><th>Quantity</th><th>Price / PCS</th><th>Amount</th><th>Bill No.</th></tr></thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt._id}>
                      <td>{new Date(receipt.receivedDate).toLocaleDateString("en-IN")}</td>
                      <td>{receipt.materialCondition === "already_washed" ? "Already Washed" : "Not Washed"}</td>
                      <td><strong>{receipt.stockTypeName}</strong></td>
                      <td>{receipt.size.lengthValue} {receipt.size.lengthUnit} × {receipt.size.widthValue} {receipt.size.widthUnit}</td>
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
                <button type="button" className="ep-btn ep-btn-secondary" disabled={receiptPage <= 1} onClick={() => setReceiptPage((value) => value - 1)}>Previous</button>
                <span>Page {receiptPagination.page} of {receiptPagination.totalPages}</span>
                <button type="button" className="ep-btn ep-btn-secondary" disabled={receiptPage >= receiptPagination.totalPages} onClick={() => setReceiptPage((value) => value + 1)}>View More</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default SupplierDetailPage;
