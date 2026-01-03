import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import backgroundImage from '../sys-bg-img1.d66192ea.jpg';
import tipLogo from '../tip logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail('');
      } else {
        setError(data.message || 'An error occurred. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      {error && (
        <div className="error-popup-overlay">
          <div className="error-popup">
            <div className="error-popup-content">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
            <button className="error-close-btn" onClick={() => setError('')}>×</button>
          </div>
        </div>
      )}
      {message && (
        <div className="error-popup-overlay">
          <div className="error-popup" style={{ borderColor: '#4CAF50' }}>
            <div className="error-popup-content">
              <span className="error-icon" style={{ color: '#4CAF50' }}>✓</span>
              <p>{message}</p>
            </div>
            <button className="error-close-btn" onClick={() => setMessage('')}>×</button>
          </div>
        </div>
      )}
      <div className="login-card">
        <div className="login-logo">
          <img src={tipLogo} alt="TIP Logo" />
        </div>
        <h2 className="login-title">Forgot Password?</h2>
        <p style={{ textAlign: 'left', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email Address"
              className="login-input"
            />
          </div>
          <button type="submit" className="btn btn-continue" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/login" style={{ color: '#667eea', textDecoration: 'none', fontSize: '14px' }}>
              ← Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
