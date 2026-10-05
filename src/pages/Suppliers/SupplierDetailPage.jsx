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

  return (
    <div className="ep-container suppliers-page">
      <div className="suppliers-header">
        <div>
          <Link to="/admin/suppliers" className="suppliers-back-link">Back to Suppliers</Link>
          <h1>{supplier.name}</h1>
          <p>Supplier master details.</p>
        </div>
        <button
          type="button"
          className="ep-btn ep-btn-primary"
          onClick={() => navigate("/admin/suppliers", { state: { editSupplierId: supplier._id } })}
        >
          Edit Supplier
        </button>
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
    </div>
  );
};

export default SupplierDetailPage;
