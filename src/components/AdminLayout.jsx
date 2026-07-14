import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../pages/Navbar'; // Assuming Navbar.jsx is in src/pages

const AdminLayout = () => {
  return (
    <div>
      <Navbar />
      <Outlet /> {/* Child routes will render here */}
    </div>
  );
};

export default AdminLayout;