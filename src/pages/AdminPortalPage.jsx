import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../config/axios";

import "./HomePage.css";
import "./AdminPortalPage.css";

const AdminPortalPage = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalCustomers: 0,
    attendanceToday: 0,
    absentToday: 0,
    attendanceMarked: 0,
    monthSalary: 0,
    monthAdvance: 0,
    recentEmployees: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setError("");

      const res = await api.get("/dashboard");

      setStats({
        totalEmployees: res.data.totalEmployees || 0,
        activeEmployees: res.data.activeEmployees || 0,
        totalCustomers: res.data.totalCustomers || 0,
        attendanceToday: res.data.attendanceToday || 0,
        absentToday: res.data.absentToday || 0,
        attendanceMarked: res.data.attendanceMarked || 0,
        monthSalary: res.data.monthSalary || 0,
        monthAdvance: res.data.monthAdvance || 0,
        recentEmployees: res.data.recentEmployees || [],
      });
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="landing-page">
      <section className="admin-portal">
        <div className="container">

          {/* =====================================
              DASHBOARD HEADER
          ====================================== */}

          <div className="dashboard-header">
            <div>
              <h1>Employee Management Dashboard</h1>

              <p>
                Manage employees, attendance, customers and salary
                from one place.
              </p>
            </div>
          </div>

          {/* =====================================
              ERROR MESSAGE
          ====================================== */}

          {error && (
            <div className="dashboard-error">
              <span>{error}</span>

              <button
                type="button"
                onClick={loadDashboard}
              >
                Retry
              </button>
            </div>
          )}

          {/* =====================================
              STATISTICS CARDS
          ====================================== */}

          <div className="dashboard-grid">

            <div className="dashboard-card blue">
              <div className="card-icon">
                👥
              </div>

              <div className="card-content">
                <h4>Total Employees</h4>
                <h2>{stats.totalEmployees}</h2>
              </div>
            </div>

            <div className="dashboard-card green">
              <div className="card-icon">
                ✓
              </div>

              <div className="card-content">
                <h4>Active Employees</h4>
                <h2>{stats.activeEmployees}</h2>
              </div>
            </div>

            <div className="dashboard-card purple">
              <div className="card-icon">
                👤
              </div>

              <div className="card-content">
                <h4>Total Customers</h4>
                <h2>{stats.totalCustomers}</h2>
              </div>
            </div>

            <div className="dashboard-card orange">
              <div className="card-icon">
                ✓
              </div>

              <div className="card-content">
                <h4>Present Today</h4>
                <h2>{stats.attendanceToday}</h2>
              </div>
            </div>

            <div className="dashboard-card red">
              <div className="card-icon">
                ✕
              </div>

              <div className="card-content">
                <h4>Absent Today</h4>
                <h2>{stats.absentToday}</h2>
              </div>
            </div>

            <div className="dashboard-card teal">
              <div className="card-icon">
                📅
              </div>

              <div className="card-content">
                <h4>Attendance Marked</h4>
                <h2>{stats.attendanceMarked}</h2>
              </div>
            </div>

            <div className="dashboard-card salary">
              <div className="card-icon">
                ₹
              </div>

              <div className="card-content">
                <h4>Salary Paid This Month</h4>

                <h2>
                  ₹{Number(stats.monthSalary || 0).toLocaleString("en-IN")}
                </h2>
              </div>
            </div>

            <div className="dashboard-card advance">
              <div className="card-icon">
                ₹
              </div>

              <div className="card-content">
                <h4>Advance Given This Month</h4>

                <h2>
                  ₹{Number(stats.monthAdvance || 0).toLocaleString("en-IN")}
                </h2>
              </div>
            </div>

          </div>

          {/* =====================================
              QUICK ACTIONS
          ====================================== */}

          <div className="dashboard-section-header">
            <h2 className="dashboard-subtitle">
              Quick Actions
            </h2>

            <p>
              Quickly access frequently used management pages.
            </p>
          </div>

          <div className="home-links">

            <Link
              to="/admin/employees"
              className="home-link home-link-blue"
            >
              Employees
            </Link>

            <Link
              to="/admin/attendance"
              className="home-link home-link-purple"
            >
              Attendance
            </Link>

            <Link
              to="/admin/customers"
              className="home-link home-link-green"
            >
              Customers
            </Link>

            <Link
              to="/admin/suppliers"
              className="home-link home-link-purple"
            >
              Suppliers
            </Link>

            <Link
              to="/admin/payout"
              className="home-link home-link-orange"
            >
              Payouts
            </Link>

            <Link
              to="/admin/stock"
              className="home-link home-link-blue"
            >
              Stock
            </Link>

          </div>

          {/* =====================================
              RECENT EMPLOYEES
          ====================================== */}

          <div className="dashboard-table">

            <div className="dashboard-table-header">
              <div>
                <h2>Recently Added Employees</h2>

                <p>
                  Latest employees added to the system.
                </p>
              </div>

              <Link
                to="/admin/employees"
                className="dashboard-view-all"
              >
                View All
              </Link>
            </div>

            <div className="dashboard-table-scroll">
              <table>

                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Daily Salary</th>
                  </tr>
                </thead>

                <tbody>

                  {stats.recentEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="2"
                        className="dashboard-empty"
                      >
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    stats.recentEmployees.map((emp) => (
                      <tr key={emp._id}>

                        <td>
                          <strong>
                            {emp.name}
                          </strong>
                        </td>

                        <td>
                          ₹{Number(
                            emp.baseDailySalary || 0
                          ).toLocaleString("en-IN")}
                        </td>

                      </tr>
                    ))
                  )}

                </tbody>

              </table>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
};

export default AdminPortalPage;
