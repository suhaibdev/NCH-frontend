import React, { useState } from "react";
import "./Navbar.css";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  getUser,
  isAuthenticated,
  logout,
} from "../config/auth";


const Navbar = () => {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    stockMenuOpen,
    setStockMenuOpen,
  ] = useState(false);

  const navigate =
    useNavigate();

  const user =
    getUser();

  const loggedIn =
    isAuthenticated();


  /* =========================================================
     CLOSE MENUS
  ========================================================= */

  const closeMenus = () => {
    setIsOpen(false);
    setStockMenuOpen(false);
  };


  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    logout();
    closeMenus();
    navigate("/login");
  };


  return (
    <header className="navbar">

      <div className="nav-container">

        {/* ===============================================
            LOGO
        ================================================ */}

        <div className="nav-logo">

          <Link
            to="/"
            onClick={closeMenus}
          >
            <h2>NCH</h2>
          </Link>

        </div>


        {/* ===============================================
            MOBILE MENU BUTTON
        ================================================ */}

        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="Toggle navigation"
          onClick={() => {
            setIsOpen(
              (previous) =>
                !previous
            );

            setStockMenuOpen(
              false
            );
          }}
        >
          ☰
        </button>


        {/* ===============================================
            NAVIGATION
        ================================================ */}

        <nav
          className={`nav-links ${
            isOpen
              ? "open"
              : ""
          }`}
        >

          <a
            href="/#hero"
            onClick={
              closeMenus
            }
          >
            Home
          </a>

          <a
            href="/#products"
            onClick={
              closeMenus
            }
          >
            Products
          </a>


          {loggedIn &&
          user?.role ===
            "admin" ? (
            <>

              <Link
                to="/admin/dashboard"
                onClick={
                  closeMenus
                }
              >
                Admin Dashboard
              </Link>


              <Link
                to="/admin/employees"
                onClick={
                  closeMenus
                }
              >
                Employees
              </Link>


              <Link
                to="/admin/attendance"
                onClick={
                  closeMenus
                }
              >
                Attendance
              </Link>


              <Link
                to="/admin/payout"
                onClick={
                  closeMenus
                }
              >
                Payout
              </Link>


              <Link
                to="/admin/customers"
                onClick={
                  closeMenus
                }
              >
                Customers
              </Link>


              {/* =========================================
                  STOCK DROPDOWN
              ========================================== */}

              <div
                className={`stock-nav-menu ${
                  stockMenuOpen
                    ? "open"
                    : ""
                }`}
              >

                <button
                  type="button"
                  className="stock-menu-trigger"
                  aria-expanded={
                    stockMenuOpen
                  }
                  onClick={() =>
                    setStockMenuOpen(
                      (previous) =>
                        !previous
                    )
                  }
                >
                  <span>
                    Stock
                  </span>

                  <span
                    className="stock-menu-arrow"
                  >
                    ▾
                  </span>
                </button>


                <div className="stock-dropdown">

                  <Link
                    to="/admin/stock"
                    onClick={
                      closeMenus
                    }
                  >
                    Stock Home
                  </Link>

                  <Link
                    to="/admin/stock/manage"
                    onClick={
                      closeMenus
                    }
                  >
                    Stock Management
                  </Link>


                  <Link
                    to="/admin/stock/types"
                    onClick={
                      closeMenus
                    }
                  >
                    Stock Types
                  </Link>

                </div>

              </div>


              <button
                type="button"
                className="nav-logout-btn"
                onClick={
                  handleLogout
                }
              >
                Logout
              </button>

            </>
          ) : (
            <Link
              to="/login"
              onClick={
                closeMenus
              }
            >
              Login
            </Link>
          )}

        </nav>

      </div>

    </header>
  );
};


export default Navbar;
