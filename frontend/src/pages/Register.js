import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Form, Alert } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getHomePathForRole } from '../utils/roleRedirect';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';
import bgImage from '../assets/images/bg.png';
import './Auth.css';

const BackArrow = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const Register = () => {
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || 'student';
  const isFaculty = role === 'faculty';
  const { register, login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isFaculty && !/^\d{7}$/.test(formData.studentId)) {
      setError('Student Number must be exactly 7 digits');
      return;
    }

    if (isFaculty && !formData.email.toLowerCase().endsWith('.cpe@tip.edu.ph')) {
      setError('Faculty email must end with .cpe@tip.edu.ph');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        studentId: isFaculty ? null : formData.studentId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender || null,
        email: formData.email,
        password: formData.password,
        role: isFaculty ? 'adviser' : 'student',
      });

      setSuccess(response.message);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const decoded = jwtDecode(credentialResponse.credential);

      if (!decoded.email.toLowerCase().endsWith('@tip.edu.ph')) {
        setError('Only TIP email addresses (@tip.edu.ph) are allowed to sign in.');
        setLoading(false);
        return;
      }

      const { data } = await api.post('/auth/google', {
        token: credentialResponse.credential,
        email: decoded.email,
        name: decoded.name,
      });

      const result = await login(data.token);
      navigate(getHomePathForRole(result?.role));
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError(
        err.response?.data?.message || 'An error occurred during Google Sign-In. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="auth-card">
          <img src={studentAdvisingLogo} alt="Student Advising" className="auth-card-logo" />

          <Link to="/login" className="auth-back-btn" aria-label="Back to sign in">
            <BackArrow />
            Back to sign in
          </Link>

          <h2 className="auth-form-title">
            {isFaculty ? 'Faculty Registration' : 'Create an Account'}
          </h2>
          <p className="auth-form-desc">
            {isFaculty
              ? 'Register with your department email to get started'
              : 'Fill in your details to join the portal'}
          </p>

          {error && (
            <Alert className="auth-alert" variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              className="auth-alert"
              variant="success"
              dismissible
              onClose={() => setSuccess('')}
            >
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {!isFaculty && (
              <div className="auth-field">
                <label htmlFor="reg-studentId">Student Number</label>
                <Form.Control
                  id="reg-studentId"
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                  placeholder="Student Number (7 digits)"
                  pattern="\d{7}"
                  maxLength="7"
                  title="Student Number must be exactly 7 digits"
                />
              </div>
            )}

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="reg-firstName">First Name</label>
                <Form.Control
                  id="reg-firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="First Name"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="reg-lastName">Last Name</label>
                <Form.Control
                  id="reg-lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-gender">Gender</label>
              <Form.Select
                id="reg-gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Gender (Optional)</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </Form.Select>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email Address</label>
              <Form.Control
                id="reg-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Email Address"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <Form.Control
                id="reg-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Password"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-confirmPassword">Confirm Password</label>
              <Form.Control
                id="reg-confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm Password"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              <span>{loading ? 'Creating Account…' : 'Register'}</span>
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-google-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signup_with"
              theme="outline"
              size="large"
            />
          </div>

          <p className="auth-footer-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
