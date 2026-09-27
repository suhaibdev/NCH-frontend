import React, { useEffect, useMemo, useState } from "react";
import api from "../../config/axios";

import "../AdminCommon.css";
import "./CustomersPage.css";

const initialFormState = {
  name: "",
  email: "",
  contactNumber: "",
  gst: "",
};

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState(initialFormState);
  const [editId, setEditId] = useState(null);

  const [searchName, setSearchName] = useState("");
  const [searchGst, setSearchGst] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError("");

      const res = await api.get("/customers");

      setCustomers(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (err) {
      console.error("Error fetching customers:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load customers."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditId(null);
  };

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Customer name is required.");
      return false;
    }

    if (!formData.email.trim()) {
      setError("Customer email is required.");
      return false;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (
      formData.contactNumber &&
      formData.contactNumber.length !== 10
    ) {
      setError(
        "Contact number must contain 10 digits."
      );
      return false;
    }

    if (
      formData.gst &&
      formData.gst.length !== 15
    ) {
      setError(
        "GST number must contain 15 characters."
      );
      return false;
    }

    return true;
  };

  const handleAddOrUpdate = async (event) => {
    event.preventDefault();

    clearMessages();

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      contactNumber: formData.contactNumber.trim(),
      gst: formData.gst.trim(),
    };

    try {
      setIsSaving(true);

      if (editId) {
        await api.put(
          `/customers/${editId}`,
          payload
        );

        setMessage(
          "Customer updated successfully."
        );
      } else {
        await api.post(
          "/customers",
          payload
        );

        setMessage(
          "Customer added successfully."
        );
      }

      resetForm();

      await fetchCustomers();
    } catch (err) {
      console.error(
        "Error saving customer:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to save customer."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (customer) => {
    clearMessages();

    setEditId(customer._id);

    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      contactNumber:
        customer.contactNumber || "",
      gst: customer.gst || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteCustomer = async (
    customer
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${
        customer.name || "this customer"
      }?`
    );

    if (!confirmed) {
      return;
    }

    clearMessages();

    try {
      setDeletingId(customer._id);

      await api.delete(
        `/customers/${customer._id}`
      );

      setMessage(
        "Customer deleted successfully."
      );

      if (editId === customer._id) {
        resetForm();
      }

      await fetchCustomers();
    } catch (err) {
      console.error(
        "Error deleting customer:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to delete customer."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    let processedValue = value;

    if (name === "gst") {
      processedValue = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    }

    if (name === "contactNumber") {
      processedValue =
        value.replace(/\D/g, "");
    }

    setFormData((previous) => ({
      ...previous,
      [name]: processedValue,
    }));
  };

  const clearFilters = () => {
    setSearchName("");
    setSearchGst("");
  };

  const filteredCustomers = useMemo(() => {
    const nameQuery =
      searchName.trim().toLowerCase();

    const gstQuery =
      searchGst.trim().toLowerCase();

    return customers.filter((customer) => {
      const customerName =
        customer.name?.toLowerCase() || "";

      const customerGst =
        customer.gst?.toLowerCase() || "";

      const matchesName =
        customerName.includes(nameQuery);

      const matchesGst =
        customerGst.includes(gstQuery);

      return matchesName && matchesGst;
    });
  }, [
    customers,
    searchName,
    searchGst,
  ]);

  return (
    <div className="ep-container customers-page">

      {/* =====================================
          PAGE HEADER
      ====================================== */}

      <div className="customers-header">
        <div>
          <h1>Customers</h1>

          <p>
            Add, update, search and manage
            customer records.
          </p>
        </div>

        <div className="customers-count">
          <span>Total Customers</span>

          <strong>
            {customers.length}
          </strong>
        </div>
      </div>

      {/* =====================================
          STATUS MESSAGES
      ====================================== */}

      {message && (
        <div className="customers-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="customers-message error">
          {error}
        </div>
      )}

      {/* =====================================
          CUSTOMER FORM
      ====================================== */}

      <div className="customers-card">

        <div className="customers-card-header">
          <div>
            <h2>
              {editId
                ? "Edit Customer"
                : "Add Customer"}
            </h2>

            <p>
              {editId
                ? "Update the selected customer's details."
                : "Enter customer information below."}
            </p>
          </div>

          {editId && (
            <span className="customers-edit-badge">
              Editing
            </span>
          )}
        </div>

        <form
          className="customers-form"
          onSubmit={handleAddOrUpdate}
        >

          <div className="customers-field">
            <label htmlFor="customer-name">
              Name
              <span>*</span>
            </label>

            <input
              id="customer-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Enter customer name"
              className="ep-input"
              autoComplete="name"
            />
          </div>

          <div className="customers-field">
            <label htmlFor="customer-email">
              Email
              <span>*</span>
            </label>

            <input
              id="customer-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              placeholder="Enter email address"
              className="ep-input"
              autoComplete="email"
            />
          </div>

          <div className="customers-field">
            <label htmlFor="customer-contact">
              Contact Number
            </label>

            <input
              id="customer-contact"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleFormChange}
              placeholder="10 digit number"
              className="ep-input"
              autoComplete="tel"
            />
          </div>

          <div className="customers-field">
            <label htmlFor="customer-gst">
              GST Number
            </label>

            <input
              id="customer-gst"
              type="text"
              maxLength={15}
              name="gst"
              value={formData.gst}
              onChange={handleFormChange}
              placeholder="15 character GST"
              className="ep-input customers-uppercase"
            />
          </div>

          <div className="customers-form-actions">

            <button
              type="submit"
              disabled={isSaving}
              className="ep-btn ep-btn-primary"
            >
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

            <p>
              Search and manage existing
              customer records.
            </p>
          </div>
        </div>

        {/* ===================================
            FILTERS
        ==================================== */}

        <div className="customers-filters">

          <div className="customers-search-field">
            <label htmlFor="search-customer">
              Search Name
            </label>

            <input
              id="search-customer"
              type="text"
              value={searchName}
              onChange={(event) =>
                setSearchName(
                  event.target.value
                )
              }
              placeholder="Search by name"
              className="ep-input"
            />
          </div>

          <div className="customers-search-field">
            <label htmlFor="search-gst">
              Search GST
            </label>

            <input
              id="search-gst"
              type="text"
              value={searchGst}
              onChange={(event) =>
                setSearchGst(
                  event.target.value
                    .toUpperCase()
                    .replace(
                      /[^A-Z0-9]/g,
                      ""
                    )
                )
              }
              placeholder="Search by GST"
              className="ep-input customers-uppercase"
            />
          </div>

          <button
            type="button"
            className="ep-btn ep-btn-secondary customers-clear-btn"
            onClick={clearFilters}
            disabled={
              !searchName &&
              !searchGst
            }
          >
            Clear Filters
          </button>

        </div>

        {/* ===================================
            LOADING / EMPTY / TABLE
        ==================================== */}

        {isLoading ? (

          <div className="customers-state">
            Loading customers...
          </div>

        ) : customers.length === 0 ? (

          <div className="customers-state">
            No customers added yet.
          </div>

        ) : filteredCustomers.length === 0 ? (

          <div className="customers-state">
            No matching customers found.
          </div>

        ) : (

          <div className="customers-table-wrapper">

            <table className="ep-table customers-table">

              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>GST</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredCustomers.map(
                  (customer, index) => (

                    <tr key={customer._id}>

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {customer.name || "-"}
                        </strong>
                      </td>

                      <td>
                        {customer.email || "-"}
                      </td>

                      <td>
                        {customer.contactNumber ||
                          "-"}
                      </td>

                      <td>
                        <span className="customers-gst-value">
                          {customer.gst || "-"}
                        </span>
                      </td>

                      <td>
                        <div className="customers-actions">

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                customer
                              )
                            }
                            className="ep-btn ep-btn-edit"
                            disabled={
                              deletingId ===
                              customer._id
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCustomer(
                                customer
                              )
                            }
                            className="ep-btn ep-btn-delete"
                            disabled={
                              deletingId ===
                              customer._id
                            }
                          >
                            {deletingId ===
                            customer._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};

export default CustomersPage;