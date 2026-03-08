import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

const FacultyRegister = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    validateInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateInvitation = async () => {
    try {
      const { data } = await api.get(`/auth/validate-invitation/${token}`);
      setInvitation(data.invitation);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired invitation link');
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post(`/auth/register-faculty/${token}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password
      });

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center position-relative" 
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        
        {/* Yellow rectangle - left side, top overlap */}
        <div 
          className="position-absolute" 
          style={{ 
            left: 0,
            top: '10.5%',
            width: '550px',
            height: '60px',
            backgroundColor: '#FFC107',
            zIndex: 2,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
          }}
        />
        
        {/* Yellow rectangle - right side, bottom overlap */}
        <div 
          className="position-absolute" 
          style={{ 
            right: 0,
            bottom: '10.5%',
            width: '1500px',
            height: '60px',
            backgroundColor: '#FFC107',
            zIndex: 1,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
          }}
        />
      <div className="login-container" style={{ position: 'relative', zIndex: 3 }}>
        <div className="login-card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '18px', color: '#666' }}>Validating invitation...</p>
          </div>
        </div>
      </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center position-relative" 
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        
        {/* Yellow rectangle - left side, top overlap */}
        <div 
          className="position-absolute" 
          style={{ 
            left: 0,
            top: '10.5%',
            width: '550px',
            height: '60px',
            backgroundColor: '#FFC107',
            zIndex: 2,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
          }}
        />
        
        {/* Yellow rectangle - right side, bottom overlap */}
        <div 
          className="position-absolute" 
          style={{ 
            right: 0,
            bottom: '10.5%',
            width: '1500px',
            height: '60px',
            backgroundColor: '#FFC107',
            zIndex: 1,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
          }}
        />
      <div className="login-container" style={{ position: 'relative', zIndex: 3 }}>
        <div className="login-card">
          <div className="login-logo">
            <img src={studentAdvisingLogo} alt="Student Advising Logo" />
          </div>
          <h2 className="login-title" style={{ color: '#dc3545' }}>Invalid Invitation</h2>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8d7da', 
            borderRadius: '8px',
            border: '2px solid #dc3545',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#721c24', margin: 0, textAlign: 'center' }}>
              ⚠️ {error}
            </p>
          </div>
          <p style={{ textAlign: 'center', color: '#666' }}>
            The invitation link may have expired or been used already.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-continue"
            style={{ marginTop: '20px' }}
          >
            Go to Login
          </button>
        </div>
      </div>
      </div>
    );
  }

  const getRoleTitle = (role) => {
    return role === 'admin' ? 'Program Chair' : 'Adviser';
  };

  const getRoleBadgeColor = (role) => {
    return role === 'admin' ? '#dc3545' : '#ffc107';
  };

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center position-relative" 
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      
      {/* Yellow rectangle - left side, top overlap */}
      <div 
        className="position-absolute" 
        style={{ 
          left: 0,
          top: '10.5%',
          width: '550px',
          height: '60px',
          backgroundColor: '#FFC107',
          zIndex: 2,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
        }}
      />
      
      {/* Yellow rectangle - right side, bottom overlap */}
      <div 
        className="position-absolute" 
        style={{ 
          right: 0,
          bottom: '10.5%',
          width: '1500px',
          height: '60px',
          backgroundColor: '#FFC107',
          zIndex: 1,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
        }}
      />
    <div className="login-container" style={{ position: 'relative', zIndex: 3 }}>
      {error && invitation && (
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
            <img src={studentAdvisingLogo} alt="Student Advising Logo" />
          </div>
          
          <h2 className="login-title">Faculty Registration</h2>
        
        <div style={{
          backgroundColor: '#FFC107',
          padding: '15px',
          borderRadius: '8px',
          border: '2px solid #000',
          marginBottom: '25px',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#000', fontWeight: '600' }}>
            You're registering as:
          </p>
          <span style={{
            display: 'inline-block',
            padding: '8px 20px',
            backgroundColor: getRoleBadgeColor(invitation?.role),
            color: invitation?.role === 'admin' ? '#fff' : '#000',
            borderRadius: '5px',
            fontWeight: '700',
            border: '2px solid #000',
            fontSize: '16px'
          }}>
            {getRoleTitle(invitation?.role)}
          </span>
          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#000' }}>
            📧 {invitation?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="First Name"
              className="login-input"
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Last Name"
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

          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm Password"
              className="login-input"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-continue" 
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Complete Registration'}
          </button>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '10px 0' }}>
              ⏰ This invitation expires on:<br />
              <strong>{invitation && new Date(invitation.expiresAt).toLocaleString()}</strong>
            </p>
            <p style={{ fontSize: '13px', color: '#666' }}>
              Already have an account? <a href="/login" style={{ color: '#FFC107', fontWeight: '600' }}>Sign in</a>
            </p>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default FacultyRegister;
