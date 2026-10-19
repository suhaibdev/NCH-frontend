import React from "react";
import { Link } from "react-router-dom";
import { FiDroplet, FiGitBranch } from "react-icons/fi";
import "./FactoryFlowPage.css";

const FactoryFlowPage = () => (
  <main className="factory-flow-page">
    <div className="factory-flow-container">
      <Link className="factory-flow-back" to="/admin/dashboard">
        Back
      </Link>

      <header className="factory-flow-header">
        <p>Operations</p>
        <h1>Factory Flow</h1>
        <span>Continue controlled processing and manufacturing workflows.</span>
      </header>

      <section className="factory-flow-cards" aria-label="Factory workflows">
        <Link to="/admin/stock/process-goods" className="factory-flow-card">
          <FiDroplet aria-hidden="true" />
          <h2>Process Goods</h2>
          <p>Move tracked Raw Material through washing into matching Washed stock.</p>
        </Link>

        <Link to="/admin/stock/manufacturing" className="factory-flow-card">
          <FiGitBranch aria-hidden="true" />
          <h2>Manufacturing</h2>
          <p>Use approved materials to record one Finished Goods output.</p>
        </Link>
      </section>
    </div>
  </main>
);

export default FactoryFlowPage;
