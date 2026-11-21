import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../config/axios";
import {
  STATE_OPTIONS,
  formatState,
  isValidGstin,
  isValidStateCode,
  stateCodeFromGstin,
} from "../../utils/gst";

import "../AdminCommon.css";
import "./CustomersPage.css";

const initialFormState = {
  name: "",
  billingName: "",
  email: "",
  contactPerson: "",
  contactNumber: "",
  gst: "",
  stateCode: "",
  billingLine1: "",
  billingLine2: "",
  billingCity: "",
  billingPincode: "",
  shippingSameAsBilling: true,
  shippingLine1: "",
  shippingLine2: "",
  shippingCity: "",
  shippingPincode: "",
  shippingStateCode: "",
  isActive: true,
};

const toFormState = (customer) => {
  const billing = customer.billingAddress || {};
  const shipping = customer.shippingAddress || {};
  return {
    name: customer.name || "",
    billingName: customer.billingName || "",
    email: customer.email || "",
    contactPerson: customer.contactPerson || "",
    contactNumber:
      customer.contactNumber === undefined || customer.contactNumber === null
        ? ""
        : String(customer.contactNumber),
    gst: customer.gst || "",
    stateCode: customer.stateCode || "",
    billingLine1: billing.line1 || "",
    billingLine2: billing.line2 || "",
    billingCity: billing.city || "",
    billingPincode: billing.pincode || "",
    shippingSameAsBilling: customer.shippingSameAsBilling !== false,
    shippingLine1: shipping.line1 || "",
    shippingLine2: shipping.line2 || "",
    shippingCity: shipping.city || "",
    shippingPincode: shipping.pincode || "",
    shippingStateCode: shipping.stateCode || "",
    isActive: customer.isActive !== false,
  };
};

const CustomersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState(initialFormState);
  const [editId, setEditId] = useState(null);

  const [searchName, setSearchName] = useState("");
  const [searchGst, setSearchGst] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const gstinState = stateCodeFromGstin(formData.gst);
  const stateLocked = Boolean(gstinState);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const res = await api.get("/customers");

      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching customers:", err);

      setLoadError(err.response?.data?.message || "Unable to load customers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditId(null);
  };

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const startEdit = useCallback((customer) => {
    setMessage("");
    setError("");
    setEditId(customer._id);
    setFormData(toFormState(customer));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* Opened from the detail page's "Edit Customer" button. */
  const editCustomerId = location.state?.editCustomerId;

  useEffect(() => {
    if (!editCustomerId || isLoading) return;

    const customer = customers.find((entry) => entry._id === editCustomerId);

    if (customer) {
      startEdit(customer);
    } else {
      setError("Customer not found.");
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [editCustomerId, isLoading, customers, startEdit, navigate, location.pathname]);

  const validateForm = () => {
    if (!formData.name.trim()) return "Customer name is required.";
    if (!formData.email.trim()) return "Customer email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return "Please enter a valid email address.";
    }
    if (formData.contactNumber && !/^\d{10}$/.test(formData.contactNumber)) {
      return "Contact number must be exactly 10 digits.";
    }
    if (formData.gst && !isValidGstin(formData.gst)) {
      return "GSTIN must be a valid 15-character GST number.";
    }
    if (!formData.gst && !isValidStateCode(formData.stateCode)) {
      return "Select the customer's state when there is no GSTIN.";
    }
    if (formData.billingPincode && !/^\d{6}$/.test(formData.billingPincode)) {
      return "Billing PIN code must be exactly 6 digits.";
    }
    if (!formData.shippingSameAsBilling) {
      if (!formData.shippingLine1.trim()) return "Shipping address line 1 is required.";
      if (formData.shippingPincode && !/^\d{6}$/.test(formData.shippingPincode)) {
        return "Shipping PIN code must be exactly 6 digits.";
      }
      if (!isValidStateCode(formData.shippingStateCode)) return "Select the shipping state.";
    }
    return "";
  };

  const handleAddOrUpdate = async (event) => {
    event.preventDefault();

    clearMessages();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      billingName: formData.billingName.trim(),
      email: formData.email.trim(),
      contactPerson: formData.contactPerson.trim(),
      contactNumber: formData.contactNumber.trim(),
      gst: formData.gst.trim(),
      stateCode: gstinState || formData.stateCode,
      billingAddress: {
        line1: formData.billingLine1.trim(),
        line2: formData.billingLine2.trim(),
        city: formData.billingCity.trim(),
        pincode: formData.billingPincode.trim(),
      },
      shippingSameAsBilling: formData.shippingSameAsBilling,
      shippingAddress: formData.shippingSameAsBilling
        ? null
        : {
            line1: formData.shippingLine1.trim(),
            line2: formData.shippingLine2.trim(),
            city: formData.shippingCity.trim(),
            pincode: formData.shippingPincode.trim(),
            stateCode: formData.shippingStateCode,
          },
    };

    if (editId) {
      payload.isActive = formData.isActive;
    }

    try {
      setIsSaving(true);

      if (editId) {
        await api.put(`/customers/${editId}`, payload);

        setMessage("Customer updated successfully.");
      } else {
        await api.post("/customers", payload);

        setMessage("Customer added successfully.");
      }

      resetForm();

      await fetchCustomers();
    } catch (err) {
      console.error("Error saving customer:", err);

      setError(err.response?.data?.message || "Failed to save customer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${customer.name || "this customer"}?`
    );

    if (!confirmed) {
      return;
    }

    clearMessages();

    try {
      setDeletingId(customer._id);

      await api.delete(`/customers/${customer._id}`);

      setMessage("Customer deleted successfully.");

      if (editId === customer._id) {
        resetForm();
      }

      await fetchCustomers();
    } catch (err) {
      console.error("Error deleting customer:", err);

      setError(err.response?.data?.message || "Failed to delete customer.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    let processedValue = type === "checkbox" ? checked : value;

    if (name === "gst") {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    if (["contactNumber", "billingPincode", "shippingPincode"].includes(name)) {
      processedValue = value.replace(/\D/g, "");
    }

    setFormData((previous) => {
      const next = { ...previous, [name]: processedValue };

      if (name === "gst") {
        const derived = stateCodeFromGstin(processedValue);
        if (derived) next.stateCode = derived;
      }

      return next;
    });
  };

  const clearFilters = () => {
    setSearchName("");
    setSearchGst("");
    setStatusFilter("all");
  };

  const filteredCustomers = useMemo(() => {
    const nameQuery = searchName.trim().toLowerCase();

    const gstQuery = searchGst.trim().toLowerCase();

    return customers.filter((customer) => {
      const customerName = `${customer.name || ""} ${customer.billingName || ""}`.toLowerCase();

      const customerGst = customer.gst?.toLowerCase() || "";

      const isActive = customer.isActive !== false;

      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? isActive : !isActive);

      return customerName.includes(nameQuery) && customerGst.includes(gstQuery) && matchesStatus;
    });
  }, [customers, searchName, searchGst, statusFilter]);

  const openCustomer = (customerId) => {
    navigate(`/admin/customers/${customerId}`);
  };

  const handleRowKeyDown = (event, customerId) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCustomer(customerId);
    }
  };

  const renderTextField = (id, name, label, options = {}) => (
    <div className={`customers-field${options.wide ? " customers-field-wide" : ""}`}>
      <label htmlFor={id}>
        {label}
        {options.required && <span>*</span>}
      </label>

      <input
        id={id}
        type={options.type || "text"}
        name={name}
        value={formData[name]}
        onChange={handleFormChange}
        placeholder={options.placeholder || ""}
        className={`ep-input${options.uppercase ? " customers-uppercase" : ""}`}
        maxLength={options.maxLength}
        inputMode={options.inputMode}
        autoComplete={options.autoComplete || "off"}
      />

      {options.hint && <small className="customers-field-hint">{options.hint}</small>}
    </div>
  );

  const renderStateSelect = (id, name, label, { disabled = false, hint = "" } = {}) => (
    <div className="customers-field">
      <label htmlFor={id}>
        {label}
        <span>*</span>
      </label>

      <select
        id={id}
        name={name}
        value={formData[name]}
        onChange={handleFormChange}
        className="ep-input"
        disabled={disabled}
      >
        <option value="">Select state</option>

        {STATE_OPTIONS.map(([code, stateName]) => (
          <option key={code} value={code}>
            {code} - {stateName}
          </option>
        ))}
      </select>

      {hint && <small className="customers-field-hint">{hint}</small>}
    </div>
  );

  return (
    <div className="ep-container customers-page">
      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="customers-header">
        <div>
          <h1>Customers</h1>

          <p>Add, update, search and manage customer records.</p>
        </div>

        <div className="customers-count">
          <span>Total Customers</span>

          <strong>{isLoading ? "…" : customers.length}</strong>
        </div>
      </div>

      {/* =====================================
          STATUS MESSAGES
      ====================================== */}

      {message && <div className="customers-message success">{message}</div>}

      {error && <div className="customers-message error">{error}</div>}

      {/* =====================================
          CUSTOMER FORM
      ====================================== */}

      <div className="customers-card">
        <div className="customers-card-header">
          <div>
            <h2>{editId ? "Edit Customer" : "Add Customer"}</h2>

            <p>
              {editId
                ? "Update the selected customer's details."
                : "Enter customer information below."}
            </p>
          </div>

          {editId && <span className="customers-edit-badge">Editing</span>}
        </div>

        <form className="customers-form" onSubmit={handleAddOrUpdate} noValidate>
          <h3 className="customers-form-section">Basic Details</h3>

          {renderTextField("customer-name", "name", "Name", {
            required: true,
            placeholder: "Enter customer name",
            maxLength: 150,
            autoComplete: "name",
          })}

          {renderTextField("customer-billing-name", "billingName", "Billing Name", {
            placeholder: "Legal name for invoices (optional)",
            maxLength: 150,
          })}

          {renderTextField("customer-email", "email", "Email", {
            required: true,
            type: "email",
            placeholder: "Enter email address",
            maxLength: 160,
            autoComplete: "email",
          })}

          {renderTextField("customer-contact-person", "contactPerson", "Contact Person", {
            placeholder: "Optional",
            maxLength: 100,
          })}

          {renderTextField("customer-contact", "contactNumber", "Contact Number", {
            type: "tel",
            inputMode: "numeric",
            maxLength: 10,
            placeholder: "10 digit number",
            autoComplete: "tel",
          })}

          <h3 className="customers-form-section">Tax Details</h3>

          {renderTextField("customer-gst", "gst", "GSTIN", {
            maxLength: 15,
            uppercase: true,
            placeholder: "15 character GSTIN (optional)",
            hint:
              formData.gst && !isValidGstin(formData.gst)
                ? "Enter a valid 15-character GSTIN."
                : "Leave empty if the customer has no GSTIN.",
          })}

          {renderStateSelect("customer-state", "stateCode", "State", {
            disabled: stateLocked,
            hint: stateLocked ? "From GSTIN" : "Choose manually when there is no GSTIN.",
          })}

          <h3 className="customers-form-section">Billing Address</h3>

          {renderTextField("customer-billing-line1", "billingLine1", "Address Line 1", {
            maxLength: 200,
            placeholder: "Building, street",
          })}

          {renderTextField("customer-billing-line2", "billingLine2", "Address Line 2", {
            maxLength: 200,
            placeholder: "Area, landmark (optional)",
          })}

          {renderTextField("customer-billing-city", "billingCity", "City", {
            maxLength: 80,
          })}

          {renderTextField("customer-billing-pincode", "billingPincode", "PIN Code", {
            inputMode: "numeric",
            maxLength: 6,
            placeholder: "6 digits",
          })}

          <h3 className="customers-form-section">Shipping Address</h3>

          <label className="customers-checkbox customers-field-wide">
            <input
              type="checkbox"
              name="shippingSameAsBilling"
              checked={formData.shippingSameAsBilling}
              onChange={handleFormChange}
            />
            Same as billing address
          </label>

          {!formData.shippingSameAsBilling && (
            <>
              {renderTextField("customer-shipping-line1", "shippingLine1", "Address Line 1", {
                required: true,
                maxLength: 200,
              })}

              {renderTextField("customer-shipping-line2", "shippingLine2", "Address Line 2", {
                maxLength: 200,
              })}

              {renderTextField("customer-shipping-city", "shippingCity", "City", {
                maxLength: 80,
              })}

              {renderTextField("customer-shipping-pincode", "shippingPincode", "PIN Code", {
                inputMode: "numeric",
                maxLength: 6,
                placeholder: "6 digits",
              })}

              {renderStateSelect("customer-shipping-state", "shippingStateCode", "State")}
            </>
          )}

          {editId && (
            <label className="customers-checkbox customers-field-wide">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleFormChange}
              />
              Active customer
            </label>
          )}

          <div className="customers-form-actions">
            <button type="submit" disabled={isSaving} className="ep-btn ep-btn-primary">
              {isSaving
                ? editId
                  ? "Updating..."
                  : "Adding..."
                : editId
                  ? "Update Customer"
                  : "Add Customer"}
            </button>

            {editId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="ep-btn ep-btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* =====================================
          CUSTOMER LIST
      ====================================== */}

      <div className="customers-card customers-list-card">
        <div className="customers-list-header">
          <div>
            <h2>Customer List</h2>

            <p>Open a customer to manage product prices.</p>
          </div>
        </div>

        {/* ===================================
            FILTERS
        ==================================== */}

        <div className="customers-filters customers-filters-status">
          <div className="customers-search-field">
            <label htmlFor="search-customer">Search Name</label>

            <input
              id="search-customer"
              type="text"
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              placeholder="Search by name"
              className="ep-input"
            />
          </div>

          <div className="customers-search-field">
            <label htmlFor="search-gst">Search GST</label>

            <input
              id="search-gst"
              type="text"
              value={searchGst}
              onChange={(event) =>
                setSearchGst(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder="Search by GST"
              className="ep-input customers-uppercase"
            />
          </div>

          <div className="customers-search-field">
            <label htmlFor="search-status">Status</label>

            <select
              id="search-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="ep-input"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            type="button"
            className="ep-btn ep-btn-secondary customers-clear-btn"
            onClick={clearFilters}
            disabled={!searchName && !searchGst && statusFilter === "all"}
          >
            Clear Filters
          </button>
        </div>

        {/* ===================================
            LOADING / ERROR / EMPTY / TABLE
        ==================================== */}

        {isLoading ? (
          <div className="customers-state">Loading customers...</div>
        ) : loadError ? (
          <div className="customers-state customers-error-state">
            <p>{loadError}</p>

            <button type="button" className="ep-btn ep-btn-secondary" onClick={fetchCustomers}>
              Retry
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="customers-state">No customers added yet.</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="customers-state">No matching customers found.</div>
        ) : (
          <div className="customers-table-wrapper">
            <table className="ep-table customers-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>GSTIN</th>
                  <th>State</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const isActive = customer.isActive !== false;

                  return (
                    <tr
                      key={customer._id}
                      className="customers-row"
                      tabIndex={0}
                      onClick={() => openCustomer(customer._id)}
                      onKeyDown={(event) => handleRowKeyDown(event, customer._id)}
                      aria-label={`Open ${customer.name || "customer"}`}
                    >
                      <td className="customers-cell-index">{index + 1}</td>

                      <td className="customers-cell-name">
                        <strong>{customer.name || "-"}</strong>

                        {customer.billingName && customer.billingName !== customer.name && (
                          <small className="customers-subtext">{customer.billingName}</small>
                        )}
                      </td>

                      <td data-label="GSTIN">
                        <span className="customers-gst-value">{customer.gst || "-"}</span>
                      </td>

                      <td data-label="State">{formatState(customer.stateCode) || "-"}</td>

                      <td data-label="Contact">
                        {customer.contactNumber ? String(customer.contactNumber) : "-"}
                      </td>

                      <td className="customers-cell-status">
                        <span
                          className={`customers-status-badge ${isActive ? "active" : "inactive"}`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="customers-cell-actions">
                        <div className="customers-actions">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              startEdit(customer);
                            }}
                            className="ep-btn ep-btn-edit"
                            disabled={deletingId === customer._id}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteCustomer(customer);
                            }}
                            className="ep-btn ep-btn-delete"
                            disabled={deletingId === customer._id}
                          >
                            {deletingId === customer._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
