import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../config/axios";

import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaWallet,
  FaBoxes,
  FaArrowRight,
} from "react-icons/fa";

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

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="landing-page">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">

      <section className="admin-portal">

        <div className="container">

          <div className="dashboard-header">

            <h1>Employee Management Dashboard</h1>

            <p>

            Manage employees, attendance, customers and salary from one place.

            </p>

            </div>

          {/* =======================
              Statistics Cards
          ========================== */}

          <div className="dashboard-grid">

            <div className="dashboard-card blue">

              <div className="card-icon">
              <FaUsers />
              </div>

              <div>

              <h4>Total Employees</h4>

              <h2>{stats.totalEmployees}</h2>

              </div>

              </div>

            <div className="dashboard-card green">

              <div className="card-icon">
              <FaUserCheck />
              </div>

              <div>

              <h4>Active Employees</h4>

              <h2>{stats.activeEmployees}</h2>

              </div>

              </div>

            <div className="dashboard-card purple">

              <div className="card-icon">
              <FaBoxes />
              </div>

              <div>

              <h4>Total Customers</h4>

              <h2>{stats.totalCustomers}</h2>

              </div>

              </div>

            <div className="dashboard-card orange">

              <div className="card-icon">
              <FaCalendarCheck />
              </div>

              <div>

              <h4>Present Today</h4>

              <h2>{stats.attendanceToday}</h2>

              </div>

              </div>

            <div className="dashboard-card red">

              <div className="card-icon">
              <FaUserTimes />
              </div>

              <div>

              <h4>Absent Today</h4>

              <h2>{stats.absentToday}</h2>

              </div>

              </div>

            <div className="dashboard-card teal">

              <div className="card-icon">
              <FaCalendarCheck />
              </div>

              <div>

              <h4>Attendance Marked</h4>

              <h2>{stats.attendanceMarked}</h2>

              </div>

              </div>

            <div className="dashboard-card salary">

              <div className="card-icon">
              <FaMoneyBillWave />
              </div>

              <div>

              <h4>Salary Paid</h4>

              <h2>₹{stats.monthSalary.toLocaleString()}</h2>

              </div>

              </div>

            <div className="dashboard-card advance">

            <div className="card-icon">
            <FaWallet />
            </div>

            <div>

            <h4>Advance Given</h4>

            <h2>₹{stats.monthAdvance.toLocaleString()}</h2>

            </div>

            </div>

          </div>

          {/* =======================
              Quick Actions
          ========================== */}

          <h2 className="dashboard-subtitle">
            Quick Actions
            </h2>

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
              to="/admin/payout"
              className="home-link home-link-orange"
            >
              Payouts
            </Link>

          </div>

          {/* =======================
              Recent Employees
          ========================== */}

          <div className="dashboard-table">

            <h2>Recently Added Employees</h2>

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

                    <td colSpan="2">

                      No Employees Found

                    </td>

                  </tr>

                ) : (

                  stats.recentEmployees.map((emp) => (

                    <tr key={emp._id}>

                      <td>{emp.name}</td>

                      <td>₹{emp.baseDailySalary}</td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </section>

    </div>
  );
};

export default AdminPortalPage;