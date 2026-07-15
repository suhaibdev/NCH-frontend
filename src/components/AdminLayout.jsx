import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const AdminLayout = () => {
  return (
    <div className="app-layout">

      <Navbar />

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} New Calcutta Handloom.
          All rights reserved.
        </p>
      </footer>

    </div>
  );
};

export default AdminLayout;