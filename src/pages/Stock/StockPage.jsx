import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../config/axios";

import "./StockPage.css";


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


const EMPTY_ADD_FORM = {
  productName: "",
  stockType: "",
  unit: "pcs",
  openingStock: "",
  minimumStock: "",
  notes: "",
};


const StockPage = () => {
  const [activeCategory, setActiveCategory] =
    useState("raw_material");

  const [items, setItems] = useState([]);

  const [lowStockItems, setLowStockItems] =
    useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [addForm, setAddForm] =
    useState(EMPTY_ADD_FORM);

  const [saving, setSaving] =
    useState(false);

  const [stockTypes, setStockTypes] =
    useState([]);

  const [stockTypesCategory, setStockTypesCategory] =
    useState("");

  const [stockTypesLoading, setStockTypesLoading] =
    useState(false);

  const [stockTypesError, setStockTypesError] =
    useState("");


  /* =========================================================
     STOCK ACTION STATE
  ========================================================= */

  const [actionItem, setActionItem] =
    useState(null);

  const [actionType, setActionType] =
    useState("");

  const [actionQuantity, setActionQuantity] =
    useState("");

  const [actionReason, setActionReason] =
    useState("");

  const [actionNotes, setActionNotes] =
    useState("");

  const [actionSaving, setActionSaving] =
    useState(false);


  /* =========================================================
     EDIT STATE
  ========================================================= */

  const [editItem, setEditItem] =
    useState(null);

  const [editForm, setEditForm] =
    useState({
      productName: "",
      stockType: "",
      minimumStock: "",
      notes: "",
    });


  /* =========================================================
     HISTORY STATE
  ========================================================= */

  const [historyItem, setHistoryItem] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);


  /* =========================================================
     LOAD STOCK
  ========================================================= */

  useEffect(() => {
    loadStock();
  }, [activeCategory]);


  useEffect(() => {
    loadLowStock();
  }, []);


  const stockTypeCategory =
    showAddForm
      ? activeCategory
      : editItem?.category;

  const compatibleStockTypes =
    stockTypesCategory ===
    stockTypeCategory
      ? stockTypes
      : [];


  useEffect(() => {
    if (!stockTypeCategory) {
      return undefined;
    }

    let cancelled = false;

    const loadStockTypes =
      async () => {
        try {
          setStockTypesLoading(true);
          setStockTypesError("");

          const res = await api.get(
            "/stock/types",
            {
              params: {
                category:
                  stockTypeCategory,
              },
            }
          );

          if (!cancelled) {
            setStockTypes(
              Array.isArray(res.data)
                ? res.data.filter(
                    (type) =>
                      type.category ===
                      stockTypeCategory
                  )
                : []
            );

            setStockTypesCategory(
              stockTypeCategory
            );
          }
        } catch (err) {
          if (!cancelled) {
            console.error(
              "Load Stock Types error:",
              err
            );

            setStockTypes([]);
            setStockTypesError(
              err.response?.data?.message ||
                "Unable to load Stock Types. You can still leave this product unassigned."
            );
          }
        } finally {
          if (!cancelled) {
            setStockTypesLoading(false);
          }
        }
      };

    loadStockTypes();

    return () => {
      cancelled = true;
    };
  }, [stockTypeCategory]);


  const loadStock = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await api.get(
        "/stock",
        {
          params: {
            category:
              activeCategory,
          },
        }
      );

      setItems(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (err) {
      console.error(
        "Load stock error:",
        err
      );

      setMessage(
        err.response?.data?.message ||
          "Unable to load stock."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };


  const loadLowStock = async () => {
    try {
      const res =
        await api.get(
          "/stock/low-stock"
        );

      setLowStockItems(
        Array.isArray(
          res.data?.items
        )
          ? res.data.items
          : []
      );
    } catch (err) {
      console.error(
        "Low stock error:",
        err
      );
    }
  };


  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return items;
      }

      return items.filter(
        (item) =>
          item.productName
            ?.toLowerCase()
            .includes(query)
      );
    }, [items, search]);


  /* =========================================================
     HELPERS
  ========================================================= */

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


  const getUnitLabel = (
    unit
  ) => {
    return unit === "dozen"
      ? "Dozen"
      : "PCS";
  };


  const isLowStock = (
    item
  ) => {
    return (
      Number(
        item.minimumStock || 0
      ) > 0 &&
      Number(
        item.currentStock || 0
      ) <=
        Number(
          item.minimumStock || 0
        )
    );
  };


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


  /* =========================================================
     ADD PRODUCT
  ========================================================= */

  const handleAddChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setAddForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };


  const handleCreateItem =
    async (event) => {
      event.preventDefault();

      if (saving) return;

      const productName =
        addForm.productName.trim();

      if (!productName) {
        showError(
          "Product name is required."
        );
        return;
      }

      const openingStock =
        addForm.openingStock === ""
          ? 0
          : Number(
              addForm.openingStock
            );

      const minimumStock =
        addForm.minimumStock === ""
          ? 0
          : Number(
              addForm.minimumStock
            );

      if (
        !Number.isInteger(
          openingStock
        ) ||
        openingStock < 0
      ) {
        showError(
          "Opening stock must be a whole number."
        );
        return;
      }

      if (
        !Number.isInteger(
          minimumStock
        ) ||
        minimumStock < 0
      ) {
        showError(
          "Minimum stock must be a whole number."
        );
        return;
      }

      try {
        setSaving(true);

        await api.post(
          "/stock",
          {
            productName,
            category:
              activeCategory,
            stockType:
              addForm.stockType ||
              null,
            unit:
              addForm.unit,
            openingStock,
            minimumStock,
            notes:
              addForm.notes.trim(),
          }
        );

        setAddForm(
          EMPTY_ADD_FORM
        );

        setShowAddForm(
          false
        );

        showSuccess(
          "Stock product created successfully."
        );

        await Promise.all([
          loadStock(),
          loadLowStock(),
        ]);
      } catch (err) {
        showError(
          err.response?.data?.message ||
            "Unable to create stock product."
        );
      } finally {
        setSaving(false);
      }
    };


  /* =========================================================
     STOCK IN / OUT
  ========================================================= */

  const openStockAction = (
    item,
    type
  ) => {
    setActionItem(item);
    setActionType(type);

    setActionQuantity("");
    setActionReason("");
    setActionNotes("");

    setMessage("");
  };


  const closeStockAction =
    () => {
      setActionItem(null);
      setActionType("");
      setActionQuantity("");
      setActionReason("");
      setActionNotes("");
    };


  const handleStockAction =
    async (event) => {
      event.preventDefault();

      if (
        !actionItem ||
        actionSaving
      ) {
        return;
      }

      const quantity =
        Number(
          actionQuantity
        );

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        showError(
          "Quantity must be a whole number greater than 0."
        );
        return;
      }

      try {
        setActionSaving(
          true
        );

        const endpoint =
          actionType === "in"
            ? `/stock/${actionItem._id}/in`
            : `/stock/${actionItem._id}/out`;

        const res =
          await api.post(
            endpoint,
            {
              quantity,
              reason:
                actionReason.trim(),
              notes:
                actionNotes.trim(),
            }
          );

        closeStockAction();

        showSuccess(
          res.data?.message ||
            "Stock updated successfully."
        );

        await Promise.all([
          loadStock(),
          loadLowStock(),
        ]);
      } catch (err) {
        showError(
          err.response?.data?.message ||
            "Unable to update stock."
        );
      } finally {
        setActionSaving(
          false
        );
      }
    };


  /* =========================================================
     EDIT PRODUCT
  ========================================================= */

  const openEdit = (
    item
  ) => {
    setEditItem(item);

    setEditForm({
      productName:
        item.productName || "",
      stockType:
        item.stockType?._id ||
        "",
      minimumStock:
        item.minimumStock ?? 0,
      notes:
        item.notes || "",
    });

    setMessage("");
  };


  const closeEdit = () => {
    setEditItem(null);
  };


  const handleEditChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setEditForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };


  const handleUpdateItem =
    async (event) => {
      event.preventDefault();

      if (
        !editItem ||
        saving
      ) {
        return;
      }

      const productName =
        editForm.productName.trim();

      const minimumStock =
        Number(
          editForm.minimumStock
        );

      if (!productName) {
        showError(
          "Product name is required."
        );
        return;
      }

      if (
        !Number.isInteger(
          minimumStock
        ) ||
        minimumStock < 0
      ) {
        showError(
          "Minimum stock must be a whole number."
        );
        return;
      }

      try {
        setSaving(true);

        await api.put(
          `/stock/${editItem._id}`,
          {
            productName,
            stockType:
              editForm.stockType ||
              null,
            minimumStock,
            notes:
              editForm.notes.trim(),
          }
        );

        closeEdit();

        showSuccess(
          "Stock product updated successfully."
        );

        await Promise.all([
          loadStock(),
          loadLowStock(),
        ]);
      } catch (err) {
        showError(
          err.response?.data?.message ||
            "Unable to update stock product."
        );
      } finally {
        setSaving(false);
      }
    };


  /* =========================================================
     HISTORY
  ========================================================= */

  const openHistory =
    async (item) => {
      try {
        setHistoryItem(
          item
        );

        setHistory([]);
        setHistoryLoading(
          true
        );

        const res =
          await api.get(
            `/stock/${item._id}/history`
          );

        setHistory(
          Array.isArray(
            res.data?.history
          )
            ? res.data.history
            : []
        );
      } catch (err) {
        showError(
          err.response?.data?.message ||
            "Unable to load stock history."
        );
      } finally {
        setHistoryLoading(
          false
        );
      }
    };


  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };


  return (
    <div className="stock-page">

      <div className="stock-container">

        {/* ==================================================
            HEADER
        =================================================== */}

        <div className="stock-page-header">

          <div>
            <h1>
              Stock Management
            </h1>

            <p>
              Manage raw materials,
              washed raw materials
              and finished goods.
            </p>
          </div>

          <button
            type="button"
            className="stock-primary-btn"
            onClick={() => {
              setShowAddForm(
                true
              );

              setMessage("");
            }}
          >
            + Add Product
          </button>

        </div>


        {/* ==================================================
            LOW STOCK ALERT
        =================================================== */}

        {lowStockItems.length >
          0 && (
          <div className="stock-low-alert">

            <div>
              <strong>
                ⚠ Low Stock Alert
              </strong>

              <span>
                {
                  lowStockItems.length
                }{" "}
                product
                {lowStockItems.length !==
                1
                  ? "s"
                  : ""}{" "}
                need attention.
              </span>
            </div>

          </div>
        )}


        {/* ==================================================
            MESSAGE
        =================================================== */}

        {message && (
          <div
            className={`stock-message ${
              messageType ===
              "success"
                ? "success"
                : "error"
            }`}
          >
            {message}
          </div>
        )}


        {/* ==================================================
            CATEGORY TABS
        =================================================== */}

        <div className="stock-tabs">

          {CATEGORIES.map(
            (category) => (
              <button
                key={
                  category.value
                }
                type="button"
                className={
                  activeCategory ===
                  category.value
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setActiveCategory(
                    category.value
                  );

                  setSearch("");
                  setMessage("");
                }}
              >
                {
                  category.label
                }
              </button>
            )
          )}

        </div>


        {/* ==================================================
            TOOLBAR
        =================================================== */}

        <div className="stock-toolbar">

          <div className="stock-search">

            <label>
              Search Product
            </label>

            <input
              type="text"
              value={search}
              placeholder="Search product name..."
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

          <div className="stock-category-title">

            <span>
              Category
            </span>

            <strong>
              {getCategoryLabel(
                activeCategory
              )}
            </strong>

          </div>

        </div>


        {/* ==================================================
            STOCK TABLE
        =================================================== */}

        <div className="stock-table-card">

          {loading ? (
            <div className="stock-loading">
              Loading stock...
            </div>
          ) : (
            <div className="stock-table-scroll">

              <table className="stock-table">

                <thead>
                  <tr>
                    <th>
                      Product
                    </th>

                    <th>
                      Current Stock
                    </th>

                    <th>
                      Minimum
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredItems.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="stock-empty"
                      >
                        No stock products
                        found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(
                      (item) => {
                        const low =
                          isLowStock(
                            item
                          );

                        return (
                          <tr
                            key={
                              item._id
                            }
                            className={
                              low
                                ? "stock-low-row"
                                : ""
                            }
                          >

                            <td>
                              <div className="stock-product-name">
                                <strong>
                                  {
                                    item.productName
                                  }
                                </strong>

                                <span>
                                  {getUnitLabel(
                                    item.unit
                                  )}
                                </span>

                                {item.notes && (
                                  <small>
                                    {
                                      item.notes
                                    }
                                  </small>
                                )}
                              </div>
                            </td>

                            <td>
                              <strong className="stock-current">
                                {Number(
                                  item.currentStock ||
                                    0
                                ).toLocaleString(
                                  "en-IN"
                                )}{" "}
                                {getUnitLabel(
                                  item.unit
                                )}
                              </strong>
                            </td>

                            <td>
                              {Number(
                                item.minimumStock ||
                                  0
                              ).toLocaleString(
                                "en-IN"
                              )}{" "}
                              {getUnitLabel(
                                item.unit
                              )}
                            </td>

                            <td>
                              <span
                                className={`stock-status ${
                                  low
                                    ? "low"
                                    : "ok"
                                }`}
                              >
                                {low
                                  ? "Low Stock"
                                  : "In Stock"}
                              </span>
                            </td>

                            <td>
                              <div className="stock-actions">

                                <button
                                  type="button"
                                  className="stock-in-btn"
                                  onClick={() =>
                                    openStockAction(
                                      item,
                                      "in"
                                    )
                                  }
                                >
                                  Stock In
                                </button>

                                <button
                                  type="button"
                                  className="stock-out-btn"
                                  onClick={() =>
                                    openStockAction(
                                      item,
                                      "out"
                                    )
                                  }
                                >
                                  Stock Out
                                </button>

                                <button
                                  type="button"
                                  className="stock-secondary-btn"
                                  onClick={() =>
                                    openEdit(
                                      item
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="stock-secondary-btn"
                                  onClick={() =>
                                    openHistory(
                                      item
                                    )
                                  }
                                >
                                  History
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      }
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>


      {/* ====================================================
          ADD PRODUCT MODAL
      ===================================================== */}

      {showAddForm && (
        <div className="stock-modal-backdrop">

          <div className="stock-modal">

            <div className="stock-modal-header">

              <div>
                <h2>
                  Add Stock Product
                </h2>

                <p>
                  {
                    getCategoryLabel(
                      activeCategory
                    )
                  }
                </p>
              </div>

              <button
                type="button"
                className="stock-close-btn"
                onClick={() =>
                  setShowAddForm(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleCreateItem
              }
            >

              <div className="stock-form-grid">

                <div className="stock-field stock-field-wide">
                  <label>
                    Product Name *
                  </label>

                  <input
                    type="text"
                    name="productName"
                    value={
                      addForm.productName
                    }
                    onChange={
                      handleAddChange
                    }
                    placeholder="Example: ABC Cotton Bandage 10cm x 4m"
                    autoFocus
                  />
                </div>


                <div className="stock-field">
                  <label>
                    Stock Type (Optional)
                  </label>

                  <select
                    name="stockType"
                    value={
                      addForm.stockType
                    }
                    onChange={
                      handleAddChange
                    }
                    disabled={
                      stockTypesLoading
                    }
                  >
                    <option value="">
                      No Stock Type
                    </option>

                    {compatibleStockTypes.map(
                      (type) => (
                        <option
                          key={type._id}
                          value={type._id}
                        >
                          {type.name}
                        </option>
                      )
                    )}
                  </select>

                  {stockTypesLoading && (
                    <small>
                      Loading compatible Stock Types...
                    </small>
                  )}

                  {stockTypesError && (
                    <small className="stock-field-error">
                      {stockTypesError}
                    </small>
                  )}
                </div>


                <div className="stock-field">
                  <label>
                    Unit *
                  </label>

                  <select
                    name="unit"
                    value={
                      addForm.unit
                    }
                    onChange={
                      handleAddChange
                    }
                  >
                    <option value="pcs">
                      PCS
                    </option>

                    <option value="dozen">
                      Dozen
                    </option>
                  </select>
                </div>


                <div className="stock-field">
                  <label>
                    Opening Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="openingStock"
                    value={
                      addForm.openingStock
                    }
                    onChange={
                      handleAddChange
                    }
                    placeholder="0"
                  />
                </div>


                <div className="stock-field">
                  <label>
                    Minimum Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="minimumStock"
                    value={
                      addForm.minimumStock
                    }
                    onChange={
                      handleAddChange
                    }
                    placeholder="0"
                  />
                </div>


                <div className="stock-field stock-field-wide">
                  <label>
                    Notes
                  </label>

                  <textarea
                    name="notes"
                    value={
                      addForm.notes
                    }
                    onChange={
                      handleAddChange
                    }
                    rows="3"
                    placeholder="Optional notes"
                  />
                </div>

              </div>


              <div className="stock-modal-actions">

                <button
                  type="button"
                  className="stock-cancel-btn"
                  onClick={() =>
                    setShowAddForm(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="stock-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Add Product"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ====================================================
          STOCK IN / OUT MODAL
      ===================================================== */}

      {actionItem && (
        <div className="stock-modal-backdrop">

          <div className="stock-modal stock-small-modal">

            <div className="stock-modal-header">

              <div>
                <h2>
                  {actionType ===
                  "in"
                    ? "Stock In"
                    : "Stock Out"}
                </h2>

                <p>
                  {
                    actionItem.productName
                  }
                </p>
              </div>

              <button
                type="button"
                className="stock-close-btn"
                onClick={
                  closeStockAction
                }
              >
                ×
              </button>

            </div>


            <div className="stock-balance-box">

              <span>
                Current Stock
              </span>

              <strong>
                {actionItem.currentStock}{" "}
                {getUnitLabel(
                  actionItem.unit
                )}
              </strong>

            </div>


            <form
              onSubmit={
                handleStockAction
              }
            >

              <div className="stock-field">
                <label>
                  Quantity *
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    actionQuantity
                  }
                  onChange={(
                    event
                  ) =>
                    setActionQuantity(
                      event.target
                        .value
                    )
                  }
                  placeholder={`Enter quantity in ${getUnitLabel(
                    actionItem.unit
                  )}`}
                  autoFocus
                />
              </div>


              <div className="stock-field">
                <label>
                  Reason
                </label>

                <input
                  type="text"
                  value={
                    actionReason
                  }
                  onChange={(
                    event
                  ) =>
                    setActionReason(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional reason"
                />
              </div>


              <div className="stock-field">
                <label>
                  Notes
                </label>

                <textarea
                  rows="3"
                  value={
                    actionNotes
                  }
                  onChange={(
                    event
                  ) =>
                    setActionNotes(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional notes"
                />
              </div>


              <div className="stock-modal-actions">

                <button
                  type="button"
                  className="stock-cancel-btn"
                  onClick={
                    closeStockAction
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    actionType ===
                    "in"
                      ? "stock-in-submit"
                      : "stock-out-submit"
                  }
                  disabled={
                    actionSaving
                  }
                >
                  {actionSaving
                    ? "Saving..."
                    : actionType ===
                      "in"
                    ? "Add Stock"
                    : "Remove Stock"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ====================================================
          EDIT MODAL
      ===================================================== */}

      {editItem && (
        <div className="stock-modal-backdrop">

          <div className="stock-modal stock-small-modal">

            <div className="stock-modal-header">

              <div>
                <h2>
                  Edit Product
                </h2>

                <p>
                  {
                    getCategoryLabel(
                      editItem.category
                    )
                  }
                </p>
              </div>

              <button
                type="button"
                className="stock-close-btn"
                onClick={
                  closeEdit
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleUpdateItem
              }
            >

              <div className="stock-field">
                <label>
                  Product Name *
                </label>

                <input
                  type="text"
                  name="productName"
                  value={
                    editForm.productName
                  }
                  onChange={
                    handleEditChange
                  }
                />
              </div>


              <div className="stock-field">
                <label>
                  Stock Type (Optional)
                </label>

                <select
                  name="stockType"
                  value={
                    editForm.stockType
                  }
                  onChange={
                    handleEditChange
                  }
                  disabled={
                    stockTypesLoading
                  }
                >
                  <option value="">
                    No Stock Type
                  </option>

                  {compatibleStockTypes.map(
                    (type) => (
                      <option
                        key={type._id}
                        value={type._id}
                      >
                        {type.name}
                      </option>
                    )
                  )}
                </select>

                {stockTypesLoading && (
                  <small>
                    Loading compatible Stock Types...
                  </small>
                )}

                {stockTypesError && (
                  <small className="stock-field-error">
                    {stockTypesError}
                  </small>
                )}
              </div>


              <div className="stock-field">
                <label>
                  Minimum Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  name="minimumStock"
                  value={
                    editForm.minimumStock
                  }
                  onChange={
                    handleEditChange
                  }
                />
              </div>


              <div className="stock-field">
                <label>
                  Unit
                </label>

                <input
                  type="text"
                  value={
                    getUnitLabel(
                      editItem.unit
                    )
                  }
                  disabled
                />

                <small>
                  Unit cannot be changed after stock activity starts.
                </small>
              </div>


              <div className="stock-field">
                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  rows="3"
                  value={
                    editForm.notes
                  }
                  onChange={
                    handleEditChange
                  }
                />
              </div>


              <div className="stock-modal-actions">

                <button
                  type="button"
                  className="stock-cancel-btn"
                  onClick={
                    closeEdit
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="stock-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ====================================================
          HISTORY MODAL
      ===================================================== */}

      {historyItem && (
        <div className="stock-modal-backdrop">

          <div className="stock-modal stock-history-modal">

            <div className="stock-modal-header">

              <div>
                <h2>
                  Stock History
                </h2>

                <p>
                  {
                    historyItem.productName
                  }
                </p>
              </div>

              <button
                type="button"
                className="stock-close-btn"
                onClick={() =>
                  setHistoryItem(
                    null
                  )
                }
              >
                ×
              </button>

            </div>


            {historyLoading ? (
              <div className="stock-loading">
                Loading history...
              </div>
            ) : (
              <div className="stock-table-scroll">

                <table className="stock-table stock-history-table">

                  <thead>
                    <tr>
                      <th>
                        Date
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Quantity
                      </th>

                      <th>
                        Before
                      </th>

                      <th>
                        After
                      </th>

                      <th>
                        Reason
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {history.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="stock-empty"
                        >
                          No stock history
                          found.
                        </td>
                      </tr>
                    ) : (
                      history.map(
                        (
                          movement
                        ) => (
                          <tr
                            key={
                              movement._id
                            }
                          >
                            <td>
                              {formatDate(
                                movement.movementDate
                              )}
                            </td>

                            <td>
                              <span
                                className={`stock-history-direction ${
                                  movement.direction ===
                                  "in"
                                    ? "in"
                                    : "out"
                                }`}
                              >
                                {movement.direction ===
                                "in"
                                  ? "IN"
                                  : "OUT"}
                              </span>
                            </td>

                            <td>
                              {movement.direction ===
                              "in"
                                ? "+"
                                : "-"}
                              {
                                movement.quantity
                              }{" "}
                              {getUnitLabel(
                                movement.unit
                              )}
                            </td>

                            <td>
                              {
                                movement.balanceBefore
                              }
                            </td>

                            <td>
                              {
                                movement.balanceAfter
                              }
                            </td>

                            <td>
                              {movement.reason ||
                                "-"}
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

        </div>
      )}

    </div>
  );
};

export default StockPage;
