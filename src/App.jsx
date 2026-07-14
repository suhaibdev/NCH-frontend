import React from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import Login from "./pages/Login";

import AdminPortalPage from "./pages/AdminPortalPage";
import EmployeesPage from "./pages/Employees/EmployeesPage";
import CustomersPage from "./pages/Customer/CustomersPage";
import AttendancePage from "./pages/Employees/Attendance";
import PayoutPage from "./pages/Employees/PayoutPage";

import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<Login />} />


        {/* Redirect /admin to dashboard */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        
        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminPortalPage />} />
          <Route path="/admin/employees" element={<EmployeesPage />} />
          <Route path="/admin/customers" element={<CustomersPage />} />
          <Route path="/admin/attendance" element={<AttendancePage />} />
          <Route path="/admin/payout" element={<PayoutPage />} />
        </Route>
        
        
        {/* Old URLs redirect */}
        <Route
          path="/employees"
          element={<Navigate to="/admin/employees" replace />}
        />

        <Route
          path="/customers"
          element={<Navigate to="/admin/customers" replace />}
        />

        <Route
          path="/employees/attendance"
          element={<Navigate to="/admin/attendance" replace />}
        />

        <Route
          path="/employees/payout"
          element={<Navigate to="/admin/payout" replace />}
        />


        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
