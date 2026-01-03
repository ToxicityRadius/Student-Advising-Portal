import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import backgroundImage from '../sys-bg-img1.d66192ea.jpg';
import tipLogo from '../tip logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(null);
  const navigate = useNavigate();
  const { token } = useParams();

  React.useEffect(() => {
    if (successCountdown !== null && successCountdown > 0) {
      const timer = setTimeout(() => setSuccessCountdown(successCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (successCountdown === 0) {
      navigate('/login');
    }
  }, [successCountdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccessCountdown(3);
      } else {
        setError(data.message || 'Failed to reset password. Please try again.');
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
      {successCountdown !== null && (
        <div className="error-popup-overlay">
          <div className="error-popup" style={{ borderColor: '#4CAF50' }}>
            <div className="error-popup-content">
              <span className="error-icon" style={{ fontSize: '48px' }}>✓</span>
              <h3 style={{ color: '#4CAF50', marginBottom: '10px' }}>Password Reset Successful!</h3>
              <p>Redirecting to Login in {successCountdown}...</p>
            </div>
          </div>
        </div>
      )}
      <div className="login-card">
        <div className="login-logo">
          <img src={tipLogo} alt="TIP Logo" />
        </div>
        <h2 className="login-title">Reset Password</h2>
        <p style={{ textAlign: 'left', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Enter your new password below.
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="New Password"
              className="login-input"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm New Password"
              className="login-input"
            />
          </div>
          <button type="submit" className="btn btn-continue" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
