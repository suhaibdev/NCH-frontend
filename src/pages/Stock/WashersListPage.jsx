import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/axios";
import "./ProcessGoodsPage.css";

const WashersListPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    api
      .get("/washers", { params: { page: 1, limit: 100 } })
      .then((response) => {
        if (mounted) setItems(response.data.items || []);
      })
      .catch((requestError) => {
        if (mounted) {
          setError(requestError.response?.data?.message || "Unable to load washers.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="process-page">
      <div className="process-container">
        <header className="process-header">
          <div>
            <p className="process-eyebrow">NCH Factory Management</p>
            <h1>Washers</h1>
            <p>Open a washer to configure rates, advances, and payouts.</p>
          </div>
          <button type="button" onClick={() => navigate("/admin/washers/new")}>
            Add Washer
          </button>
        </header>

        {error && <p className="process-error">{error}</p>}

        <section className="process-card">
          <h2>Washer Directory</h2>
          {loading ? (
            <p className="process-state">Loading washers…</p>
          ) : items.length ? (
            <div className="process-table-scroll">
              <table className="process-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((washer) => (
                    <tr key={washer._id}>
                      <td>{washer.name}</td>
                      <td>{washer.phone || "—"}</td>
                      <td>{washer.isActive ? "Active" : "Inactive"}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary-button compact-button"
                          onClick={() => navigate(`/admin/washers/${washer._id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="process-state">
              No washers found. Add a washer from the existing admin form.
            </p>
          )}
        </section>
      </div>
    </main>
  );
};

export default WashersListPage;
