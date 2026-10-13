import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../config/axios";
import { toTitleCaseInput } from "../../utils/text";
import "./ProcessGoodsPage.css";

const WasherDetailFixed = () => {
  const { washerId } = useParams();
  const [washer, setWasher] = useState(null);
  const [types, setTypes] = useState([]);
  const [rates, setRates] = useState([]);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("");
  const [addingOutput, setAddingOutput] = useState(false);
  const [showOutputForm, setShowOutputForm] = useState(false);

  const load = async () => {
    try {
      const [washerResponse, typeResponse] = await Promise.all([
        api.get(`/washers/${washerId}`),
        api.get("/stock/types", { params: { category: "washed_raw_material" } }),
      ]);
      setWasher(washerResponse.data.washer);
      setRates(washerResponse.data.washer.washingRates || []);
      setTypes(
        (typeResponse.data || []).filter((type) => type.requiresSupplier && type.requiresSize)
      );
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load washer detail.");
    }
  };

  useEffect(() => {
    load();
  }, [washerId]);

  const getRate = (stockType) =>
    rates.find((rate) => String(rate.stockType) === String(stockType))?.ratePerPiece || "";
  const setRate = (stockType, ratePerPiece) =>
    setRates((previous) => [
      ...previous.filter((rate) => String(rate.stockType) !== String(stockType)),
      { stockType: String(stockType), ratePerPiece },
    ]);
  const saveRates = async () => {
    const hasInvalidRate = rates.some(
      (rate) =>
        rate.ratePerPiece === "" ||
        !Number.isFinite(Number(rate.ratePerPiece)) ||
        Number(rate.ratePerPiece) < 0
    );

    if (hasInvalidRate) {
      setError("Rate per PCS must be a non-negative number.");
      return;
    }

    try {
      await api.put(`/washers/${washerId}`, {
        washingRates: rates.map((rate) => ({
          stockType: rate.stockType,
          ratePerPiece: rate.ratePerPiece,
        })),
      });
      load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save rates.");
    }
  };

  const addOutputType = async (event) => {
    event.preventDefault();
    try {
      setAddingOutput(true);
      await api.post("/stock/types", {
        name: outputName,
        category: "washed_raw_material",
        requiresSupplier: true,
        requiresSize: true,
      });
      setOutputName("");
      setShowOutputForm(false);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to add Washed Output Type.");
    } finally {
      setAddingOutput(false);
    }
  };

  return (
    <main className="process-page">
      <div className="process-container">
        <Link className="back-button" to="/admin/washers">
          Back
        </Link>
        <header className="process-header">
          <div>
            <p className="process-eyebrow">WASHER DETAIL</p>
            <h1>{washer?.name || "Washer"}</h1>
            <p>
              {washer?.phone || "No phone"} · {washer?.address || "No address"} ·{" "}
              {washer?.isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </header>
        {error && <p className="process-error">{error}</p>}
        <section className="process-card washing-rates-card">
          <div className="process-card-heading washing-rates-heading">
            <div>
              <h2>Washing Rates</h2>
              <p>Set the washing charge for each eligible Washed Output Type.</p>
            </div>
            <button type="button" onClick={() => setShowOutputForm((visible) => !visible)}>
              {showOutputForm ? "Cancel" : "+ Add Output Type"}
            </button>
          </div>
          {showOutputForm && (
            <form className="process-form washing-output-form" onSubmit={addOutputType}>
              <label>
                Output Type Name *
                <input
                  value={outputName}
                  onChange={(event) => setOutputName(toTitleCaseInput(event.target.value))}
                  required
                  maxLength="100"
                />
              </label>
              <div className="process-actions">
                <button type="submit" disabled={addingOutput}>
                  {addingOutput ? "Adding..." : "Add Output Type"}
                </button>
              </div>
            </form>
          )}
          {types.length ? (
            <div className="washing-rates-list">
              <div className="washing-rates-table-header" aria-hidden="true">
                <span>Output Type</span>
                <span>Rate / PCS</span>
              </div>
              {types.map((type) => (
                <label className="washing-rate-row" key={type._id}>
                  <span className="washing-rate-name">{type.name}</span>
                  <span className="washing-rate-control">
                    ₹{" "}
                    <input
                      className="washing-rate-input"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={getRate(type._id)}
                      onChange={(event) => setRate(type._id, event.target.value)}
                    />{" "}
                    <span className="washing-rate-unit">/ PCS</span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="process-state">No Washed Output Types added yet.</p>
          )}
          {types.length > 0 && (
            <div className="washing-rates-actions">
              <button type="button" onClick={saveRates}>
                Save Rates
              </button>
            </div>
          )}
        </section>
        <section className="process-card washer-account-card">
          <h2>Washer Account</h2>
          <p>
            Advance, Payout, Payout History and Process History are available in the washer account.
          </p>
          <Link className="back-button" to={`/admin/washers/${washerId}/account`}>
            Open Account
          </Link>
        </section>
      </div>
    </main>
  );
};

export default WasherDetailFixed;
