// File: client/src/pages/CustomersPage.js
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../../config/api';

import '../AdminCommon.css';

const initialFormState = {
  name: '',
  email: '',
  contactNumber: '',
  gst: ''
};

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchGst, setSearchGst] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/customers`);
      setCustomers(res.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditId(null);
  };

  const handleAddOrUpdate = async () => {
    if (!formData.name || !formData.email) {
      alert('Name and Email are required');
      return;
    }

    try {
      setIsLoading(true);
      if (editId) {
        await axios.put(`${API_BASE_URL}/customers/${editId}`, formData);
        alert('Customer updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/customers`, formData);
        alert('Customer added successfully');
      }
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert(`Failed to save customer: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${API_BASE_URL}/customers/${id}`);
        fetchCustomers();
        alert('Customer deleted successfully');
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert(`Failed to delete customer: ${error.response?.data?.message || error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEdit = (customer) => {
    setEditId(customer._id);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      contactNumber: customer.contactNumber || '',
      gst: customer.gst || ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'name') {
        processedValue = value.replace(/\b\w/g, char => char.toUpperCase());
    } else if (name === 'gst') {
        processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else if (name === 'contactNumber') {
        processedValue = value.replace(/\D/g, '');
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  // Filter logic for Name and GST Number
  const filteredCustomers = useMemo(() => customers.filter(cust => {
    const matchName = cust.name?.toLowerCase().includes(searchName.toLowerCase());
    const custGst = cust.gst || '';
    const matchGst = custGst.toLowerCase().includes(searchGst.toLowerCase());
    return matchName && matchGst;
  }), [customers, searchName, searchGst]);

  return (
    <div className="ep-container">
      <h2 className="ep-title">Customers</h2>
      <Link to="/admin" className="ep-btn ep-btn-primary" style={{ marginBottom: '16px', display: 'inline-block', textDecoration: 'none' }}>
        Back
      </Link>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Name" className="ep-input" />
        <input name="email" value={formData.email} onChange={handleFormChange} placeholder="Email" className="ep-input" />
        <input
          maxLength="15"
          name="gst"
          value={formData.gst}
          onChange={handleFormChange}
          placeholder="GST"
          className="ep-input"
        />
        <input
          type="tel"
          maxLength="10"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleFormChange}
          placeholder="Contact Number"
          className="ep-input"
        />
        <button onClick={handleAddOrUpdate} disabled={isLoading} className="ep-btn ep-btn-primary" style={{ margin: 0 }}>
          {editId ? 'Update' : 'Add'}
        </button>
        {editId && (
          <button
            onClick={resetForm}
            disabled={isLoading}
            className="ep-btn ep-btn-secondary"
            style={{ margin: 0 }}
          >
            Cancel
          </button>
        )}
      </div>

      {customers.length === 0 && !isLoading ? (
        <p style={{ marginTop: '24px', color: '#888' }}>No customers yet</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', margin: '24px 0 16px', flexWrap: 'wrap' }}>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search by Name"
              className="ep-input"
            />
            <input
              value={searchGst}
              onChange={(e) => setSearchGst(e.target.value)}
              placeholder="Search by GST"
              className="ep-input"
            />
            <button 
              className="ep-btn ep-btn-primary" 
              onClick={() => { setSearchName(''); setSearchGst(''); }}
              style={{ margin: 0 }}
            >
              Clear Filters
            </button>
          </div>

          {isLoading ? <p>Loading...</p> : filteredCustomers.length === 0 ? (
            <p style={{ color: '#888' }}>No matching customers found.</p>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="ep-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>GST</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((cust, idx) => (
                    <tr key={cust._id}>
                      <td>{idx + 1}</td>
                      <td>{cust.name}</td>
                      <td>{cust.email}</td>
                      <td>{cust.contactNumber}</td>
                      <td>{cust.gst}</td>
                      <td style={{ display: 'flex' }}>
                        <button 
                          onClick={() => handleEdit(cust)} 
                          className="ep-btn ep-btn-edit"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(cust._id)} 
                          className="ep-btn ep-btn-delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomersPage;