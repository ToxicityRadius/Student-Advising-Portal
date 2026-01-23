import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import StudentIdModal from '../components/StudentIdModal';
import backgroundImage from '../sys-bg-img1.d66192ea.jpg';
import tipLogo from '../tip logo.png';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStudentIdModal, setShowStudentIdModal] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresVerification) {
          // Redirect to verification page
          navigate('/verify-code', { 
            state: { 
              userId: data.userId,
              email: formData.email 
            } 
          });
        } else {
          // This shouldn't happen with 2FA enabled
          navigate('/dashboard');
        }
      } else {
        setError(data.message || 'Invalid Credentials. Please try again.');
      }
    } catch (err) {
      setError('Invalid Credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      // Decode the JWT token from Google
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Check if email ends with @tip.edu.ph
      if (!decoded.email.toLowerCase().endsWith('@tip.edu.ph')) {
        setError('Only TIP email addresses (@tip.edu.ph) are allowed to sign in.');
        setLoading(false);
        return;
      }

      // Send the Google token to your backend for verification and login
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: credentialResponse.credential,
          email: decoded.email,
          name: decoded.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresStudentId) {
          // Show student ID modal
          setPendingGoogleUser({
            userId: data.userId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName
          });
          setShowStudentIdModal(true);
          setLoading(false);
          return;
        }
        
        if (data.requiresVerification) {
          // Redirect to verification page
          navigate('/verify-code', { 
            state: { 
              userId: data.userId,
              email: decoded.email 
            } 
          });
        } else {
          // Fallback if 2FA is not enabled
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.message || 'Google Sign-In failed. Please try again.');
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError('An error occurred during Google Sign-In. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  const handleStudentIdSubmit = async (studentId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${pendingGoogleUser.userId}/update-student-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId })
      });

      const data = await response.json();

      if (response.ok) {
        setShowStudentIdModal(false);
        setPendingGoogleUser(null);
        
        // Redirect to dashboard with token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
      } else {
        throw new Error(data.message || 'Failed to update Student Number');
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="login-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      {showStudentIdModal && pendingGoogleUser && (
        <StudentIdModal
          onSubmit={handleStudentIdSubmit}
          userEmail={pendingGoogleUser.email}
        />
      )}
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
      <div className="login-card">
        <div className="login-logo">
          <img src={tipLogo} alt="TIP Logo" />
        </div>
        <h2 className="login-title">Sign in</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Email Address"
              className="login-input"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Password"
              className="login-input"
            />
          </div>
          <div className="forgot-password">
            <Link to="/forgot-password">Forgot your password?</Link>
          </div>
          <button type="submit" className="btn btn-continue" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <div className="or-divider">
            <span>or</span>
          </div>
          <div className="google-signin-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              theme="outline"
              size="large"
            />
          </div>
          <div className="create-account-link">
            <span>New to Student Advising Portal? </span>
            <Link to="/register">Create an Account</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
