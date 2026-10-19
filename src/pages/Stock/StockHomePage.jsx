import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../config/axios";
import "./StockHomePage.css";

const CATEGORY_LABELS = {
  raw_material: "Raw Material",
  washed_raw_material: "Washed Raw Material",
  finished_goods: "Finished Goods",
};

const getStockStatus = (item) => {
  if (item.currentStock === 0) return { label: "Out of Stock", className: "out" };
  if (item.currentStock <= item.minimumStock) return { label: "Low Stock", className: "low" };
  return { label: "In Stock", className: "in" };
};

const StockHomePage = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const searchText = search.trim();

    if (!searchText) {
      setResults([]);
      setError("");
      setHasSearched(false);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/stock", {
          params: { search: searchText },
          signal: controller.signal,
        });
        setResults(response.data || []);
        setHasSearched(true);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        console.error("Universal stock search error:", err);
        setResults([]);
        setHasSearched(true);
        setError(
          err.response?.data?.message || "Unable to search stock right now. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [search]);

  return (
    <main className="stock-home-page">
      <div className="stock-home-container">
        <Link className="stock-home-back" to="/admin/dashboard">
          Back
        </Link>

        <header className="stock-home-header">
          <h1>STOCK</h1>
          <p>Search inventory across every category or manage stock setup.</p>
        </header>

        <section className="stock-home-search-panel" aria-labelledby="stock-search-heading">
          <div>
            <h2 id="stock-search-heading">Universal Stock Search</h2>
            <p>Search by product name or Stock Type.</p>
          </div>
          <label className="stock-home-search-field">
            <span>Search all stock</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="For example: cotton, label, wrapper..."
            />
          </label>
          {loading && <p className="stock-home-search-state">Searching stock...</p>}
          {error && <p className="stock-home-search-error">{error}</p>}
          {hasSearched && !loading && !error && (
            <div className="stock-home-results">
              <div className="stock-home-results-heading">
                <h3>Results</h3>
                <span>
                  {results.length} product{results.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="stock-home-table-scroll">
                <table className="stock-home-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Main Category</th>
                      <th>Stock Type</th>
                      <th>Current Stock</th>
                      <th>Minimum Stock</th>
                      <th>Unit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="stock-home-empty">
                          No products found for “{search.trim()}”.
                        </td>
                      </tr>
                    ) : (
                      results.map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <tr key={item._id}>
                            <td>
                              <strong>{item.productName}</strong>
                            </td>
                            <td>{CATEGORY_LABELS[item.category] || item.category}</td>
                            <td>{item.stockType?.name || "Unassigned"}</td>
                            <td>{item.currentStock}</td>
                            <td>{item.minimumStock}</td>
                            <td>{String(item.unit || "").toUpperCase()}</td>
                            <td>
                              <span className={`stock-home-status ${status.className}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="stock-home-navigation" aria-labelledby="stock-navigation-heading">
          <div className="stock-home-section-heading">
            <h2 id="stock-navigation-heading">Stock Areas</h2>
            <p>Manage inventory records and stock classifications.</p>
          </div>
          <div className="stock-home-cards">
            <Link to="/admin/stock/manage" className="stock-home-card">
              <span className="stock-home-card-kicker">Inventory</span>
              <h3>Stock Management</h3>
              <p>Manage Raw Material, Washed Raw Material and Finished Goods.</p>
            </Link>
            <Link to="/admin/stock/types" className="stock-home-card">
              <span className="stock-home-card-kicker">Organisation</span>
              <h3>Stock Types</h3>
              <p>Manage stock classifications and their tracking rules.</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export default StockHomePage;
