import React from "react";
import { Outlet } from "react-router-dom";
import AdminShell from "./AdminShell";

const AdminLayout = () => {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
};

export default AdminLayout;
