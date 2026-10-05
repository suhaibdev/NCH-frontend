import React, {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  Link,
} from "react-router-dom";

import api from "../../config/axios";

import "./StockTypeProductsPage.css";


const CATEGORY_LABELS = {
  raw_material: "Raw Material",
  washed_raw_material:
    "Washed Raw Material",
  finished_goods:
    "Finished Goods",
};


const EMPTY_FORM = {
  productName: "",
  supplier: "",
  size: {
    lengthValue: "",
    lengthUnit: "m",
    widthValue: "",
    widthUnit: "cm",
  },
  unit: "pcs",
  openingStock: 0,
  minimumStock: 0,
  notes: "",
};


const StockTypeProductsPage = () => {
  const {
    typeId,
  } = useParams();

  const [
    stockType,
    setStockType,
  ] = useState(null);

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState("");

  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState("");


  /* =========================================================
     LOAD PAGE
  ========================================================= */

  useEffect(() => {
    loadPage();
  }, [typeId]);

  useEffect(() => {
    if (!showAddForm || !stockType?.requiresSupplier) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSuppliersLoading(true);
        setSuppliersError("");
        const response = await api.get("/suppliers", {
          params: { search: supplierQuery.trim(), page: 1, limit: 20 },
          signal: controller.signal,
        });
        setSupplierOptions(
          Array.isArray(response.data?.items) ? response.data.items : []
        );
      } catch (err) {
        if (err.code !== "ERR_CANCELED") {
          setSuppliersError(err.response?.data?.message || "Unable to load suppliers.");
        }
      } finally {
        if (!controller.signal.aborted) setSuppliersLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [showAddForm, stockType?._id, stockType?.requiresSupplier, supplierQuery]);


  const loadPage =
    async () => {
      try {
        setLoading(true);

        /*
         * We currently have GET /stock/types,
         * so find this Stock Type from that list.
         */
        const typesResponse =
          await api.get(
            "/stock/types"
          );

        const types =
          Array.isArray(
            typesResponse.data
          )
            ? typesResponse.data
            : [];

        const selectedType =
          types.find(
            (type) =>
              type._id ===
              typeId
          );

        if (
          !selectedType
        ) {
          setStockType(
            null
          );

          setProducts(
            []
          );

          showError(
            "Stock Type not found."
          );

          return;
        }

        setStockType(
          selectedType
        );

        await loadProducts(
          ""
        );
      } catch (err) {
        console.error(
          "Load Stock Type page error:",
          err
        );

        showError(
          err.response?.data
            ?.message ||
            "Unable to load Stock Type."
        );
      } finally {
        setLoading(false);
      }
    };


  /* =========================================================
     LOAD PRODUCTS FOR THIS TYPE
  ========================================================= */

  const loadProducts =
    async (
      searchText =
        search
    ) => {
      try {
        const params = {
          stockType:
            typeId,
        };

        if (
          searchText.trim()
        ) {
          params.search =
            searchText.trim();
        }

        const response =
          await api.get(
            "/stock",
            {
              params,
            }
          );

        setProducts(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );
      } catch (err) {
        console.error(
          "Load Stock Type products error:",
          err
        );

        showError(
          err.response?.data
            ?.message ||
            "Unable to load products."
        );
      }
    };


  /* =========================================================
     MESSAGES
  ========================================================= */

  const showSuccess = (
    text
  ) => {
    setMessage(text);
    setMessageType(
      "success"
    );
  };


  const showError = (
    text
  ) => {
    setMessage(text);
    setMessageType(
      "error"
    );
  };


  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearchSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      await loadProducts(
        search
      );
    };


  const clearSearch =
    async () => {
      setSearch("");

      await loadProducts(
        ""
      );
    };


  /* =========================================================
     ADD PRODUCT
  ========================================================= */

  const openAddForm =
    () => {
      setForm(
        EMPTY_FORM
      );

      setSupplierQuery("");
      setSupplierOptions([]);

      setMessage("");

      setShowAddForm(
        true
      );
    };


  const closeAddForm =
    () => {
      if (saving) {
        return;
      }

      setShowAddForm(
        false
      );

      setForm(
        EMPTY_FORM
      );
    };


  const handleFormChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setForm(
        (previous) => ({
          ...previous,
          ...(name.startsWith("size.")
            ? {
                size: {
                  ...previous.size,
                  [name.replace("size.", "")]: value,
                },
              }
            : { [name]: value }),
        })
      );
    };


  const handleAddProduct =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        !stockType ||
        saving
      ) {
        return;
      }

      const productName =
        form.productName
          .trim();

      if (
        !productName
      ) {
        showError(
          "Product name is required."
        );

        return;
      }

      if (stockType.requiresSupplier && !form.supplier) {
        showError("Select a supplier for this Stock Type.");
        return;
      }

      const openingStock =
        Number(
          form.openingStock
        );

      const minimumStock =
        Number(
          form.minimumStock
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

            /*
             * Automatically taken from
             * this dedicated page.
             */
            category:
              stockType.category,

            stockType:
              stockType._id,

            supplier:
              form.supplier || null,

            size:
              stockType.requiresSize
                ? form.size
                : null,

            unit:
              form.unit,

            openingStock,

            minimumStock,

            notes:
              form.notes
                .trim(),
          }
        );

        setShowAddForm(
          false
        );

        setForm(
          EMPTY_FORM
        );

        showSuccess(
          `${productName} added to ${stockType.name}.`
        );

        await loadProducts(
          search
        );
      } catch (err) {
        showError(
          err.response?.data
            ?.message ||
            "Unable to add product."
        );
      } finally {
        setSaving(false);
      }
    };


  /* =========================================================
     STATUS
  ========================================================= */

  const getStatus = (
    product
  ) => {
    if (
      product.currentStock ===
      0
    ) {
      return {
        label:
          "Out of Stock",
        className:
          "out",
      };
    }

    if (
      product.minimumStock >
        0 &&
      product.currentStock <=
        product.minimumStock
    ) {
      return {
        label:
          "Low Stock",
        className:
          "low",
      };
    }

    return {
      label:
        "In Stock",
      className:
        "good",
    };
  };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="stock-type-products-page">
        <div className="stock-type-products-container">
          <div className="stock-type-products-loading">
            Loading Stock Type...
          </div>
        </div>
      </div>
    );
  }


  if (!stockType) {
    return (
      <div className="stock-type-products-page">
        <div className="stock-type-products-container">

          <div className="stock-type-not-found">

            <h2>
              Stock Type Not Found
            </h2>

            <p>
              The requested Stock Type
              could not be found.
            </p>

            <Link
              to="/admin/stock/types"
            >
              Back to Stock Types
            </Link>

          </div>

        </div>
      </div>
    );
  }


  return (
    <div className="stock-type-products-page">

      <div className="stock-type-products-container">

        {/* ===============================================
            HEADER
        ================================================ */}

        <div className="stock-type-products-header">

          <div>

            <div className="stock-type-breadcrumb">
              <Link
                to="/admin/stock/types"
              >
                Stock Types
              </Link>

              <span>
                /
              </span>

              <span>
                {stockType.name}
              </span>
            </div>

            <h1>
              {stockType.name}
            </h1>

            <p>
              {
                CATEGORY_LABELS[
                  stockType.category
                ] ||
                stockType.category
              }
            </p>

          </div>


          <button
            type="button"
            className="stock-type-add-product-btn"
            onClick={
              openAddForm
            }
          >
            + Add Product
          </button>

        </div>


        {/* ===============================================
            MESSAGE
        ================================================ */}

        {message && (
          <div
            className={`stock-type-products-message ${messageType}`}
          >
            {message}
          </div>
        )}


        {/* ===============================================
            SUMMARY
        ================================================ */}

        <div className="stock-type-summary">

          <div className="stock-type-summary-card">
            <span>
              Stock Type
            </span>

            <strong>
              {stockType.name}
            </strong>
          </div>


          <div className="stock-type-summary-card">
            <span>
              Main Category
            </span>

            <strong>
              {
                CATEGORY_LABELS[
                  stockType.category
                ]
              }
            </strong>
          </div>


          <div className="stock-type-summary-card">
            <span>
              Products
            </span>

            <strong>
              {products.length}
            </strong>
          </div>

        </div>


        {/* ===============================================
            SEARCH
        ================================================ */}

        <form
          className="stock-type-product-search"
          onSubmit={
            handleSearchSubmit
          }
        >

          <div>

            <label>
              Search in {stockType.name}
            </label>

            <input
              type="text"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder={`Search ${stockType.name} products...`}
            />

          </div>


          <button
            type="submit"
            className="stock-type-search-btn"
          >
            Search
          </button>


          {search && (
            <button
              type="button"
              className="stock-type-clear-btn"
              onClick={
                clearSearch
              }
            >
              Clear
            </button>
          )}

        </form>


        {/* ===============================================
            PRODUCTS TABLE
        ================================================ */}

        <div className="stock-type-products-card">

          <div className="stock-type-products-card-header">

            <div>
              <h2>
                {stockType.name} Products
              </h2>

              <p>
                Products assigned to this Stock Type.
              </p>
            </div>

          </div>


          <div className="stock-type-products-table-scroll">

            <table className="stock-type-products-table">

              <thead>
                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    Current Stock
                  </th>

                  <th>
                    Minimum Stock
                  </th>

                  <th>
                    Unit
                  </th>

                  <th>
                    Status
                  </th>

                </tr>
              </thead>


              <tbody>

                {products.length ===
                0 ? (
                  <tr>

                    <td
                      colSpan="5"
                      className="stock-type-products-empty"
                    >
                      No products found in{" "}
                      <strong>
                        {stockType.name}
                      </strong>
                      .
                    </td>

                  </tr>
                ) : (
                  products.map(
                    (
                      product
                    ) => {
                      const status =
                        getStatus(
                          product
                        );

                      return (
                        <tr
                          key={
                            product._id
                          }
                        >

                          <td>
                            <div className="stock-type-product-name">
                              {
                                product.productName
                              }
                            </div>

                            {product.supplier && (
                              <div className="stock-type-product-note">
                                Supplier: {product.supplier.name}
                              </div>
                            )}

                            {product.size?.lengthValue && (
                              <div className="stock-type-product-note">
                                Size: {product.size.lengthValue} {product.size.lengthUnit} × {product.size.widthValue} {product.size.widthUnit}
                              </div>
                            )}

                            {product.notes && (
                              <div className="stock-type-product-note">
                                {
                                  product.notes
                                }
                              </div>
                            )}
                          </td>


                          <td>
                            <strong>
                              {
                                product.currentStock
                              }
                            </strong>
                          </td>


                          <td>
                            {
                              product.minimumStock
                            }
                          </td>


                          <td>
                            {product.unit ===
                            "dozen"
                              ? "Dozen"
                              : "PCS"}
                          </td>


                          <td>
                            <span
                              className={`stock-type-status ${status.className}`}
                            >
                              {
                                status.label
                              }
                            </span>
                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>


      {/* ===============================================
          ADD PRODUCT MODAL
      ================================================ */}

      {showAddForm && (
        <div className="stock-type-product-modal-backdrop">

          <div className="stock-type-product-modal">

            <div className="stock-type-product-modal-header">

              <div>
                <h2>
                  Add {stockType.name} Product
                </h2>

                <p>
                  This product will automatically
                  be assigned to{" "}
                  <strong>
                    {stockType.name}
                  </strong>
                  .
                </p>
              </div>


              <button
                type="button"
                className="stock-type-product-close"
                onClick={
                  closeAddForm
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleAddProduct
              }
            >

              <div className="stock-type-product-fixed-info">

                <div>
                  <span>
                    Main Category
                  </span>

                  <strong>
                    {
                      CATEGORY_LABELS[
                        stockType.category
                      ]
                    }
                  </strong>
                </div>


                <div>
                  <span>
                    Stock Type
                  </span>

                  <strong>
                    {
                      stockType.name
                    }
                  </strong>
                </div>

              </div>


              <div className="stock-type-product-field">

                <label>
                  Product Name *
                </label>

                <input
                  type="text"
                  name="productName"
                  value={
                    form.productName
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Enter product name"
                  autoFocus
                />

              </div>


              <div className="stock-type-product-field">

                <label>
                  Unit *
                </label>

                <select
                  name="unit"
                  value={
                    form.unit
                  }
                  onChange={
                    handleFormChange
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


              {stockType.requiresSupplier && (
                <div className="stock-type-product-field">
                  <label>Supplier *</label>
                  <input
                    type="search"
                    value={supplierQuery}
                    onChange={(event) => setSupplierQuery(event.target.value)}
                    placeholder="Search suppliers"
                  />
                  <select
                    name="supplier"
                    value={form.supplier}
                    onChange={handleFormChange}
                    disabled={suppliersLoading}
                  >
                    <option value="">
                      {suppliersLoading ? "Loading suppliers..." : "Select supplier"}
                    </option>
                    {supplierOptions.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {suppliersError && <small>{suppliersError}</small>}
                  {!suppliersLoading && !suppliersError && supplierOptions.length === 0 && (
                    <small>No suppliers found. Add a supplier first.</small>
                  )}
                </div>
              )}


              {stockType.requiresSize && (
                <div className="stock-type-product-field">
                  <label>Structured Size *</label>
                  <div className="stock-type-product-form-row">
                    <input type="number" min="0.01" step="0.01" name="size.lengthValue" value={form.size.lengthValue} onChange={handleFormChange} placeholder="Length" />
                    <select name="size.lengthUnit" value={form.size.lengthUnit} onChange={handleFormChange}>
                      <option value="m">m</option><option value="cm">cm</option><option value="inch">inch</option><option value="ft">ft</option>
                    </select>
                    <input type="number" min="0.01" step="0.01" name="size.widthValue" value={form.size.widthValue} onChange={handleFormChange} placeholder="Width" />
                    <select name="size.widthUnit" value={form.size.widthUnit} onChange={handleFormChange}>
                      <option value="m">m</option><option value="cm">cm</option><option value="inch">inch</option><option value="ft">ft</option>
                    </select>
                  </div>
                  <small>Values and units are stored exactly as entered.</small>
                </div>
              )}


              <div className="stock-type-product-form-row">

                <div className="stock-type-product-field">

                  <label>
                    Opening Stock
                  </label>

                  <input
                    type="number"
                    name="openingStock"
                    min="0"
                    step="1"
                    value={
                      form.openingStock
                    }
                    onChange={
                      handleFormChange
                    }
                  />

                </div>


                <div className="stock-type-product-field">

                  <label>
                    Minimum Stock
                  </label>

                  <input
                    type="number"
                    name="minimumStock"
                    min="0"
                    step="1"
                    value={
                      form.minimumStock
                    }
                    onChange={
                      handleFormChange
                    }
                  />

                </div>

              </div>


              <div className="stock-type-product-field">

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
                    handleFormChange
                  }
                  placeholder="Optional notes"
                />

              </div>


              <div className="stock-type-product-modal-actions">

                <button
                  type="button"
                  className="stock-type-product-cancel"
                  onClick={
                    closeAddForm
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="stock-type-add-product-btn"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Adding..."
                    : "Add Product"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};


export default StockTypeProductsPage;
