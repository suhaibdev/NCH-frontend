import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import api from "../../config/axios";

import "./StockTypesPage.css";


const CATEGORIES = [
  {
    value: "raw_material",
    label: "Raw Material",
  },
  {
    value: "washed_raw_material",
    label: "Washed Raw Material",
  },
  {
    value: "finished_goods",
    label: "Finished Goods",
  },
];


const EMPTY_FORM = {
  name: "",
  category: "raw_material",
  notes: "",
  requiresSupplier: false,
  requiresSize: false,
};


const StockTypesPage = () => {
  const [types, setTypes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingType, setEditingType] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");


  /* =========================================================
     LOAD STOCK TYPES
  ========================================================= */

  useEffect(() => {
    loadTypes();
  }, []);


  const loadTypes = async () => {
    try {
      setLoading(true);

      const res =
        await api.get(
          "/stock/types"
        );

      setTypes(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (err) {
      console.error(
        "Load stock types error:",
        err
      );

      showError(
        err.response?.data?.message ||
          "Unable to load Stock Types."
      );
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     HELPERS
  ========================================================= */

  const showSuccess = (
    text
  ) => {
    setMessage(text);
    setMessageType("success");
  };


  const showError = (
    text
  ) => {
    setMessage(text);
    setMessageType("error");
  };


  const getCategoryLabel = (
    value
  ) => {
    return (
      CATEGORIES.find(
        (category) =>
          category.value === value
      )?.label || value
    );
  };


  /* =========================================================
     FILTER
  ========================================================= */

  const filteredTypes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return types.filter(
        (type) => {
          const matchesCategory =
            categoryFilter ===
              "all" ||
            type.category ===
              categoryFilter;

          const matchesSearch =
            !query ||
            type.name
              ?.toLowerCase()
              .includes(query) ||
            type.notes
              ?.toLowerCase()
              .includes(query);

          return (
            matchesCategory &&
            matchesSearch
          );
        }
      );
    }, [
      types,
      search,
      categoryFilter,
    ]);


  /* =========================================================
     OPEN ADD
  ========================================================= */

  const openAdd = () => {
    setEditingType(null);

    setForm(
      EMPTY_FORM
    );

    setMessage("");

    setShowForm(true);
  };


  /* =========================================================
     OPEN EDIT
  ========================================================= */

  const openEdit = (
    type
  ) => {
    setEditingType(type);

    setForm({
      name:
        type.name || "",

      category:
        type.category ||
        "raw_material",

      notes:
        type.notes || "",

      requiresSupplier:
        Boolean(type.requiresSupplier),

      requiresSize:
        Boolean(type.requiresSize),
    });

    setMessage("");

    setShowForm(true);
  };


  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingType(null);
    setForm(EMPTY_FORM);
  };


  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        ...(name === "category" && value === "finished_goods"
          ? {
              requiresSupplier: false,
              requiresSize: false,
            }
          : {}),
        [name]: type === "checkbox" ? checked : value,
      })
    );
  };


  /* =========================================================
     SAVE STOCK TYPE
  ========================================================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (saving) {
        return;
      }

      const name =
        form.name.trim();

      if (!name) {
        showError(
          "Stock Type name is required."
        );

        return;
      }

      try {
        setSaving(true);

        const payload = {
          name,

          category:
            form.category,

          notes:
            form.notes.trim(),

          requiresSupplier:
            form.category === "finished_goods"
              ? false
              : form.requiresSupplier,

          requiresSize:
            form.category === "finished_goods"
              ? false
              : form.requiresSize,
        };


        if (editingType) {
          await api.put(
            `/stock/types/${editingType._id}`,
            payload
          );

          showSuccess(
            "Stock Type updated successfully."
          );
        } else {
          await api.post(
            "/stock/types",
            payload
          );

          showSuccess(
            "Stock Type created successfully."
          );
        }


        setShowForm(false);
        setEditingType(null);
        setForm(EMPTY_FORM);

        await loadTypes();
      } catch (err) {
        showError(
          err.response?.data?.message ||
            "Unable to save Stock Type."
        );
      } finally {
        setSaving(false);
      }
    };


  /* =========================================================
     DELETE STOCK TYPE
  ========================================================= */

  const handleDelete =
    async (type) => {
      if (
        Number(
          type.productCount || 0
        ) > 0
      ) {
        showError(
          `Cannot delete "${type.name}". ${type.productCount} product${
            type.productCount === 1
              ? " is"
              : "s are"
          } using this Stock Type.`
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Delete Stock Type "${type.name}"?\n\nThis action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(
          type._id
        );

        await api.delete(
          `/stock/types/${type._id}`
        );

        showSuccess(
          `"${type.name}" deleted successfully.`
        );

        await loadTypes();
      } catch (err) {
        showError(
          err.response?.data?.message ||
            "Unable to delete Stock Type."
        );
      } finally {
        setDeletingId("");
      }
    };


  return (
    <div className="stock-types-page">

      <div className="stock-types-container">

        {/* ===============================================
            HEADER
        ================================================ */}

        <div className="stock-types-header">

          <div>
            <h1>
              Stock Types
            </h1>

            <p>
              Create custom Stock Types under Raw Material,
              Washed Raw Material and Finished Goods.
            </p>
          </div>

          <button
            type="button"
            className="stock-type-primary-btn"
            onClick={openAdd}
          >
            + Add Stock Type
          </button>

        </div>


        {/* ===============================================
            MESSAGE
        ================================================ */}

        {message && (
          <div
            className={`stock-type-message ${
              messageType ===
              "success"
                ? "success"
                : "error"
            }`}
          >
            {message}
          </div>
        )}


        {/* ===============================================
            FILTERS
        ================================================ */}

        <div className="stock-types-toolbar">

          <div className="stock-type-search">

            <label>
              Search Stock Type
            </label>

            <input
              type="text"
              value={search}
              placeholder="Search Label, Cotton, Wrapper..."
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
            />

          </div>


          <div className="stock-type-filter">

            <label>
              Main Category
            </label>

            <select
              value={
                categoryFilter
              }
              onChange={(
                event
              ) =>
                setCategoryFilter(
                  event.target
                    .value
                )
              }
            >

              <option value="all">
                All Categories
              </option>

              {CATEGORIES.map(
                (category) => (
                  <option
                    key={
                      category.value
                    }
                    value={
                      category.value
                    }
                  >
                    {
                      category.label
                    }
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* ===============================================
            TABLE
        ================================================ */}

        <div className="stock-types-card">

          {loading ? (
            <div className="stock-types-loading">
              Loading Stock Types...
            </div>
          ) : (
            <div className="stock-types-table-scroll">

              <table className="stock-types-table">

                <thead>
                  <tr>
                    <th>
                      Stock Type
                    </th>

                    <th>
                      Main Category
                    </th>

                    <th>
                      Products
                    </th>

                    <th>
                      Notes
                    </th>

                    <th>
                      Identity Rules
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>


                <tbody>

                  {filteredTypes.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="stock-types-empty"
                      >
                        No Stock Types found.
                      </td>
                    </tr>
                  ) : (
                    filteredTypes.map(
                      (type) => (
                        <tr
                          key={
                            type._id
                          }
                        >

                          <td>
                            <strong className="stock-type-name">
                              {
                                type.name
                              }
                            </strong>
                          </td>


                          <td>
                            <span className="stock-type-category">
                              {getCategoryLabel(
                                type.category
                              )}
                            </span>
                          </td>


                          <td>
                            <span className="stock-type-count">
                              {Number(
                                type.productCount ||
                                  0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>
                          </td>


                          <td>
                            <span className="stock-type-notes">
                              {type.notes ||
                                "-"}
                            </span>
                          </td>

                          <td>
                            {type.category === "finished_goods"
                              ? "-"
                              : [
                                  type.requiresSupplier && "Supplier",
                                  type.requiresSize && "Size",
                                ].filter(Boolean).join(" + ") || "None"}
                          </td>


                          <td>
                            <div className="stock-type-actions">

                                <Link
                                    to={`/admin/stock/type/${type._id}`}
                                    className="stock-type-open-btn"
                                >
                                    Open Products
                                </Link>

                                <button
                                    type="button"
                                    className="stock-type-edit-btn"
                                    onClick={() =>
                                    openEdit(
                                        type
                                    )
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    className="stock-type-delete-btn"
                                    disabled={
                                    deletingId ===
                                    type._id
                                    }
                                    onClick={() =>
                                    handleDelete(
                                        type
                                    )
                                    }
                                >
                                    {deletingId ===
                                    type._id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>

                                </div>
                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>


        {/* ===============================================
            INFORMATION
        ================================================ */}

        <div className="stock-types-info">

          <strong>
            How Stock Types work
          </strong>

          <p>
            Each Stock Type belongs to one fixed main category.
            For example, Label can belong to Raw Material.
            Products can then be assigned to that Stock Type.
          </p>

          <p>
            A Stock Type cannot be deleted while products are
            assigned to it.
          </p>

        </div>

      </div>


      {/* ===============================================
          ADD / EDIT MODAL
      ================================================ */}

      {showForm && (
        <div className="stock-type-modal-backdrop">

          <div className="stock-type-modal">

            <div className="stock-type-modal-header">

              <div>
                <h2>
                  {editingType
                    ? "Edit Stock Type"
                    : "Add Stock Type"}
                </h2>

                <p>
                  {editingType
                    ? "Update the Stock Type details."
                    : "Create a new Stock Type."}
                </p>
              </div>


              {form.category !== "finished_goods" && (
                <div className="stock-type-field">

                  <label>
                    Required product identity
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="requiresSupplier"
                      checked={form.requiresSupplier}
                      onChange={handleChange}
                    />
                    Require Supplier
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="requiresSize"
                      checked={form.requiresSize}
                      onChange={handleChange}
                    />
                    Require structured size
                  </label>

                </div>
              )}


              <button
                type="button"
                className="stock-type-close-btn"
                onClick={
                  closeForm
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="stock-type-field">

                <label>
                  Stock Type Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: Label"
                  autoFocus
                />

              </div>


              <div className="stock-type-field">

                <label>
                  Main Category *
                </label>

                <select
                  name="category"
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
                >

                  {CATEGORIES.map(
                    (category) => (
                      <option
                        key={
                          category.value
                        }
                        value={
                          category.value
                        }
                      >
                        {
                          category.label
                        }
                      </option>
                    )
                  )}

                </select>


                {editingType &&
                  Number(
                    editingType.productCount ||
                      0
                  ) > 0 && (
                    <small>
                      The backend will prevent changing the
                      main category while products use this
                      Stock Type.
                    </small>
                  )}

              </div>


              <div className="stock-type-field">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  rows="3"
                  value={
                    form.notes
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Optional notes"
                />

              </div>


              <div className="stock-type-modal-actions">

                <button
                  type="button"
                  className="stock-type-cancel-btn"
                  onClick={
                    closeForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="stock-type-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingType
                    ? "Save Changes"
                    : "Create Stock Type"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default StockTypesPage;
