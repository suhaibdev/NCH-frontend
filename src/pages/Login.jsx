import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { isAuthenticated } from '../config/auth';
import './AdminCommon.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate(location.state?.from?.pathname || '/admin/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to log in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="ep-container" style={{ maxWidth: '420px', margin: '64px auto' }}>
      <h2 className="ep-title">Admin Login</h2>
      <form className="ep-form" onSubmit={handleSubmit}>
        <input className="ep-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required />
        <input className="ep-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required />
        {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        <button className="ep-btn ep-btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  );
};

export default Login;
