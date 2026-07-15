import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const AdminPortalPage = () => {
  return (
    <div className="landing-page">

      <main 
        style={{ 
          minHeight: 'calc(100vh - 140px)', 
          display: 'flex', 
          alignItems: 'center' 
        }}
      >
        <section 
          className="admin-portal" 
          style={{ width: '100%', backgroundColor: 'transparent' }}
        >
          <div className="container">

            <h2 className="section-title">
              Employee & Admin Portal
            </h2>

            <div className="home-links">
              <Link to="/admin/employees" className="home-link home-link-blue">
                Employees
              </Link>

              <Link to="/admin/attendance" className="home-link home-link-purple">
                Attendance
              </Link>

              <Link to="/admin/customers" className="home-link home-link-green">
                Customers
              </Link>

              <Link to="/admin/payout" className="home-link home-link-green">
                Payouts
              </Link>
            </div>

          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          &copy; {new Date().getFullYear()} New Calcutta Handloom.
          All rights reserved.
        </p>
      </footer>

    </div>
  );
};

export default AdminPortalPage;