import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, isAuthenticated, logout } from '../config/auth';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isAuthenticated();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h2>NCH</h2>
          </Link>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
          ☰
        </button>
        <nav className={`nav-links ${isOpen ? 'open' : ''}`}>
          <a href="/#hero" onClick={() => setIsOpen(false)}>Home</a>
          <a href="/#products" onClick={() => setIsOpen(false)}>Products</a>
          {loggedIn && user?.role === 'admin' ? (
            <>
              <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>Admin Dashboard</Link>
              <Link to="/admin/employees" onClick={() => setIsOpen(false)}>Employees</Link>
              <Link to="/admin/attendance" onClick={() => setIsOpen(false)}>Attendance</Link>
              <Link to="/admin/payout" onClick={() => setIsOpen(false)}>Payout</Link>
              <button type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setIsOpen(false)}>Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
