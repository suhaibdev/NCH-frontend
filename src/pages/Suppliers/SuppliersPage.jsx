import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../../config/axios";

import "../AdminCommon.css";
import "./SuppliersPage.css";


const EMPTY_FORM = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
  notes: "",
};


const SuppliersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestController = useRef(null);
  const requestId = useRef(0);

  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = requestId.current + 1;

    requestId.current = currentRequest;

    if (requestController.current) {
      requestController.current.abort();
    }

    requestController.current = controller;

    const loadSuppliers = async () => {
      try {
        setListError("");
        setIsListLoading(true);

        const response = await api.get(
          "/suppliers",
          {
            params: {
              page,
              limit: 25,
              search: search.trim(),
            },
            signal: controller.signal,
          }
        );

        if (requestId.current !== currentRequest) {
          return;
        }

        setSuppliers(
          Array.isArray(response.data?.items)
            ? response.data.items
            : []
        );
        setPagination(
          response.data?.pagination || {
            page,
            limit: 25,
            totalItems: 0,
            totalPages: 0,
          }
        );
      } catch (err) {
        if (
          err.code === "ERR_CANCELED" ||
          controller.signal.aborted ||
          requestId.current !== currentRequest
        ) {
          return;
        }

        console.error(
          "Load suppliers error:",
          err
        );
        setSuppliers([]);
        setListError(
          err.response?.data?.message ||
            "Unable to load suppliers."
        );
      } finally {
        if (requestId.current === currentRequest) {
          setIsInitialLoading(false);
          setIsListLoading(false);
        }
      }
    };

    const timeoutId = window.setTimeout(
      loadSuppliers,
      search.trim() ? 350 : 0
    );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, search, reloadVersion]);


  const resetForm = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setIsFormLoading(false);
  };


  const openAdd = () => {
    setMessage("");
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };


  const openEdit = async (supplierId) => {
    try {
      setMessage("");
      setFormError("");
      setShowForm(true);
      setIsFormLoading(true);

      const response = await api.get(
        `/suppliers/${supplierId}`
      );
      const supplier = response.data;

      setEditingSupplier(supplier);
      setForm({
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        gstNumber: supplier.gstNumber || "",
        notes: supplier.notes || "",
      });
    } catch (err) {
      console.error(
        "Load supplier for edit error:",
        err
      );
      setFormError(
        err.response?.data?.message ||
          "Unable to load supplier details."
      );
    } finally {
      setIsFormLoading(false);
    }
  };


  useEffect(() => {
    const supplierId =
      location.state?.editSupplierId;

    if (!supplierId) {
      return;
    }

    navigate("/admin/suppliers", {
      replace: true,
    });
    openEdit(supplierId);
  }, [location.state, navigate]);


  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const handleSave = async (event) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (!form.name.trim()) {
      setFormError("Supplier Name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");

      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        gstNumber: form.gstNumber.trim(),
        notes: form.notes.trim(),
      };

      if (editingSupplier) {
        await api.put(
          `/suppliers/${editingSupplier._id}`,
          payload
        );
        setMessage("Supplier updated successfully.");
      } else {
        await api.post("/suppliers", payload);
        setMessage("Supplier added successfully.");
      }

      resetForm();
      setPage(1);
      setReloadVersion(
        (previous) => previous + 1
      );
    } catch (err) {
      console.error("Save supplier error:", err);
      setFormError(
        err.response?.data?.message ||
          "Unable to save supplier."
      );
    } finally {
      setIsSaving(false);
    }
  };


  const retryList = () => {
    setReloadVersion(
      (previous) => previous + 1
    );
  };


  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };


  const startItemNumber =
    (pagination.page - 1) * pagination.limit;

  return (
    <div className="ep-container suppliers-page">
      <div className="suppliers-header">
        <div>
          <h1>Suppliers</h1>
          <p>
            Manage supplier master information for future purchasing workflows.
          </p>
        </div>

        <button
          type="button"
          className="ep-btn ep-btn-primary"
          onClick={openAdd}
        >
          + Add Supplier
        </button>
      </div>

      {message && (
        <div className="suppliers-message success">
          {message}
        </div>
      )}

      <section className="suppliers-card">
        <div className="suppliers-list-header">
          <div>
            <h2>Supplier List</h2>
            <p>Search by supplier, contact person, phone or GST number.</p>
          </div>
          <span className="suppliers-count">
            {pagination.totalItems} total
          </span>
        </div>

        <div className="suppliers-toolbar">
          <label className="suppliers-search-field">
            <span>Search suppliers</span>
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search supplier, contact, phone or GSTIN"
              className="ep-input"
            />
          </label>
        </div>

        {isInitialLoading ? (
          <div className="suppliers-state">
            Loading suppliers...
          </div>
        ) : listError ? (
          <div className="suppliers-state suppliers-error-state">
            <p>{listError}</p>
            <button
              type="button"
              className="ep-btn ep-btn-secondary"
              onClick={retryList}
            >
              Retry
            </button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="suppliers-state">
            <p>
              {search.trim()
                ? "No suppliers match your search."
                : "No suppliers have been added yet."}
            </p>
            {!search.trim() && (
              <button
                type="button"
                className="ep-btn ep-btn-primary"
                onClick={openAdd}
              >
                Add Supplier
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="suppliers-table-wrapper">
              <table className="ep-table suppliers-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Supplier Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>GSTIN</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier, index) => (
                    <tr key={supplier._id}>
                      <td>{startItemNumber + index + 1}</td>
                      <td><strong>{supplier.name}</strong></td>
                      <td>{supplier.contactPerson || "-"}</td>
                      <td>{supplier.phone || "-"}</td>
                      <td className="suppliers-gstin">
                        {supplier.gstNumber || "-"}
                      </td>
                      <td>
                        <div className="suppliers-actions">
                          <Link
                            to={`/admin/suppliers/${supplier._id}`}
                            className="ep-btn ep-btn-secondary"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            className="ep-btn ep-btn-edit"
                            onClick={() => openEdit(supplier._id)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="suppliers-pagination">
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                disabled={
                  isListLoading ||
                  pagination.page <= 1
                }
                onClick={() =>
                  setPage((previous) => previous - 1)
                }
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="ep-btn ep-btn-secondary"
                disabled={
                  isListLoading ||
                  pagination.page >= pagination.totalPages
                }
                onClick={() =>
                  setPage((previous) => previous + 1)
                }
              >
                Next
              </button>
            </div>
          </>
        )}

        {isListLoading && !isInitialLoading && (
          <div className="suppliers-list-loading">
            Loading suppliers...
          </div>
        )}
      </section>

      {showForm && (
        <div className="suppliers-modal-backdrop">
          <div className="suppliers-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-form-title">
            <div className="suppliers-modal-header">
              <div>
                <h2 id="supplier-form-title">
                  {editingSupplier ? "Edit Supplier" : "Add Supplier"}
                </h2>
                <p>Supplier master details only. Purchase and payment records are added later.</p>
              </div>
              <button
                type="button"
                className="suppliers-close"
                onClick={resetForm}
                disabled={isSaving}
                aria-label="Close supplier form"
              >
                x
              </button>
            </div>

            {isFormLoading ? (
              <div className="suppliers-state">Loading supplier...</div>
            ) : (
              <form className="suppliers-form" onSubmit={handleSave}>
                {formError && <div className="suppliers-message error">{formError}</div>}
                <label className="suppliers-field">
                  <span>Supplier Name *</span>
                  <input type="text" name="name" value={form.name} onChange={handleFormChange} maxLength="150" autoFocus />
                </label>
                <label className="suppliers-field">
                  <span>Contact Person</span>
                  <input type="text" name="contactPerson" value={form.contactPerson} onChange={handleFormChange} maxLength="100" />
                </label>
                <label className="suppliers-field">
                  <span>Phone</span>
                  <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} maxLength="30" />
                </label>
                <label className="suppliers-field">
                  <span>Email</span>
                  <input type="email" name="email" value={form.email} onChange={handleFormChange} maxLength="160" />
                </label>
                <label className="suppliers-field suppliers-field-wide">
                  <span>Address</span>
                  <textarea name="address" value={form.address} onChange={handleFormChange} rows="3" maxLength="500" />
                </label>
                <label className="suppliers-field">
                  <span>GST Number</span>
                  <input type="text" name="gstNumber" value={form.gstNumber} onChange={handleFormChange} maxLength="30" />
                </label>
                <label className="suppliers-field suppliers-field-wide">
                  <span>Notes</span>
                  <textarea name="notes" value={form.notes} onChange={handleFormChange} rows="3" maxLength="1000" />
                </label>
                <div className="suppliers-form-actions">
                  <button type="button" className="ep-btn ep-btn-secondary" onClick={resetForm} disabled={isSaving}>Cancel</button>
                  <button type="submit" className="ep-btn ep-btn-primary" disabled={isSaving}>
                    {isSaving ? "Saving..." : editingSupplier ? "Save Changes" : "Add Supplier"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
