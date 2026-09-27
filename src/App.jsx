import React, { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import SalarySlip from "./pages/Employees/SalarySlip";
import AdminPortalPage from "./pages/AdminPortalPage";
import EmployeesPage from "./pages/Employees/EmployeesPage";
import CustomersPage from "./pages/Customer/CustomersPage";
import AttendancePage from "./pages/Employees/Attendance";
import PayoutPage from "./pages/Employees/PayoutPage";
import StockPage from "./pages/Stock/StockPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";


const App = () => {

  /* =========================================================
     GLOBAL NUMBER INPUT SCROLL PROTECTION
  ========================================================= */

  useEffect(() => {
    const handleNumberInputWheel = () => {
      const activeElement =
        document.activeElement;

      if (
        activeElement instanceof HTMLInputElement &&
        activeElement.type === "number"
      ) {
        activeElement.blur();
      }
    };

    document.addEventListener(
      "wheel",
      handleNumberInputWheel,
      {
        capture: true,
      }
    );

    return () => {
      document.removeEventListener(
        "wheel",
        handleNumberInputWheel,
        {
          capture: true,
        }
      );
    };
  }, []);


  return (
    <BrowserRouter>

      <Routes>

        {/* ================================
            PUBLIC ROUTES
        ================================= */}

        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/login"
          element={<Login />}
        />


        {/* ================================
            ADMIN REDIRECT
        ================================= */}

        <Route
          path="/admin"
          element={
            <Navigate
              to="/admin/dashboard"
              replace
            />
          }
        />


        {/* ================================
            PROTECTED ADMIN ROUTES
        ================================= */}

        <Route
          element={<ProtectedRoute />}
        >

          <Route
            element={<AdminLayout />}
          >

            <Route
              path="/admin/dashboard"
              element={
                <AdminPortalPage />
              }
            />

            <Route
              path="/admin/employees"
              element={
                <EmployeesPage />
              }
            />

            <Route
              path="/admin/customers"
              element={
                <CustomersPage />
              }
            />

            <Route
              path="/admin/attendance"
              element={
                <AttendancePage />
              }
            />

            <Route
              path="/admin/payout"
              element={
                <PayoutPage />
              }
            />

            <Route
              path="/admin/stock"
              element={
                <StockPage />
              }
            />

            <Route
              path="/admin/salary-slip"
              element={
                <SalarySlip />
              }
            />

          </Route>

        </Route>


        {/* ================================
            OLD URL REDIRECTS
        ================================= */}

        <Route
          path="/employees"
          element={
            <Navigate
              to="/admin/employees"
              replace
            />
          }
        />

        <Route
          path="/customers"
          element={
            <Navigate
              to="/admin/customers"
              replace
            />
          }
        />

        <Route
          path="/employees/attendance"
          element={
            <Navigate
              to="/admin/attendance"
              replace
            />
          }
        />

        <Route
          path="/employees/payout"
          element={
            <Navigate
              to="/admin/payout"
              replace
            />
          }
        />


        {/* ================================
            UNKNOWN URL
        ================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
};

export default App;