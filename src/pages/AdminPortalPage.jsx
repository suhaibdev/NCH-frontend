import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/axios';
import './HomePage.css';

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

          <h2 className="section-title">
            Employee Management Dashboard
          </h2>

          {/* =======================
              Statistics Cards
          ========================== */}

          <div className="dashboard-grid">

            <div className="dashboard-card blue">
              <h3>Total Employees</h3>
              <h1>{stats.totalEmployees}</h1>
            </div>

            <div className="dashboard-card green">
              <h3>Active Employees</h3>
              <h1>{stats.activeEmployees}</h1>
            </div>

            <div className="dashboard-card purple">
              <h3>Total Customers</h3>
              <h1>{stats.totalCustomers}</h1>
            </div>

            <div className="dashboard-card orange">
              <h3>Present Today</h3>
              <h1>{stats.attendanceToday}</h1>
            </div>

            <div className="dashboard-card red">
              <h3>Absent Today</h3>
              <h1>{stats.absentToday}</h1>
            </div>

            <div className="dashboard-card teal">
              <h3>Attendance Marked</h3>
              <h1>{stats.attendanceMarked}</h1>
            </div>

            <div className="dashboard-card salary">
              <h3>Salary Paid (Month)</h3>
              <h1>₹{stats.monthSalary.toLocaleString()}</h1>
            </div>

            <div className="dashboard-card advance">
              <h3>Advance Given (Month)</h3>
              <h1>₹{stats.monthAdvance.toLocaleString()}</h1>
            </div>

          </div>

          {/* =======================
              Quick Actions
          ========================== */}

          <h2
            className="section-title"
            style={{ marginTop: 50 }}
          >
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