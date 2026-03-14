import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import AuthBackgroundShell from '../components/auth/AuthBackgroundShell';
import AuthPopupOverlay from '../components/auth/AuthPopupOverlay';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

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
      const { data } = await api.put(`/auth/reset-password/${token}`, { password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccessCountdown(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackgroundShell backgroundImage={backgroundImage}>
    <div className="login-container">
      {error && (
        <AuthPopupOverlay message={error} onClose={() => setError('')} />
      )}
      {successCountdown !== null && (
        <AuthPopupOverlay
          icon="✓"
          iconStyle={{ fontSize: '48px' }}
          title="Password Reset Successful!"
          message={`Redirecting to Login in ${successCountdown}...`}
          borderColor="#4CAF50"
        />
      )}
      <div className="login-card">
        <div className="login-logo">
          <img src={studentAdvisingLogo} alt="Student Advising Logo" />
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
    </AuthBackgroundShell>
  );
};

export default ResetPassword;
