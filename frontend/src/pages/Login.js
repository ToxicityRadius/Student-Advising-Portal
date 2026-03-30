import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Alert } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getHomePathForRole } from '../utils/roleRedirect';
import StudentIdModal from '../components/StudentIdModal';
import studentIcon from '../assets/images/student yellow.png';
import teacherIcon from '../assets/images/teacher yellow.png';
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

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStudentIdModal, setShowStudentIdModal] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(
    () => sessionStorage.getItem('loginRole') || null,
  );

  const navigate = useNavigate();
  const { login } = useAuth();

  const selectRole = (role) => {
    sessionStorage.setItem('loginRole', role);
    setSelectedRole(role);
  };

  const clearRole = () => {
    sessionStorage.removeItem('loginRole');
    setSelectedRole(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailLower = formData.email.toLowerCase();
    if (selectedRole === 'faculty' && !emailLower.endsWith('.cpe@tip.edu.ph')) {
      setError('Faculty/Admin login requires a department email (e.g. lastname.cpe@tip.edu.ph).');
      return;
    }
    if (selectedRole === 'student' && emailLower.endsWith('.cpe@tip.edu.ph')) {
      setError('Please use the Faculty login for department email addresses.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
        selectedRole,
      });

      const data = response.data;

      if (data.requiresVerification) {
        sessionStorage.removeItem('loginRole');
        navigate('/verify-code', {
          state: { userId: data.userId, email: formData.email },
        });
      } else if (data.mustChangePassword) {
        sessionStorage.removeItem('loginRole');
        navigate('/change-password', {
          state: { token: data.token, oldPassword: formData.password },
        });
      } else if (data.mustChangeEmail) {
        sessionStorage.removeItem('loginRole');
        sessionStorage.setItem('forceEmailChangeToken', data.token);
        navigate('/change-email');
      } else {
        sessionStorage.removeItem('loginRole');
        const result = await login(data.token);
        navigate(getHomePathForRole(result?.role || data.user?.role));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const decoded = jwtDecode(credentialResponse.credential);
      const emailLower = decoded.email.toLowerCase();

      if (!emailLower.endsWith('@tip.edu.ph')) {
        setError('Only TIP email addresses (@tip.edu.ph) are allowed to sign in.');
        setLoading(false);
        return;
      }

      if (selectedRole === 'faculty' && !emailLower.endsWith('.cpe@tip.edu.ph')) {
        setError('Faculty/Admin login requires a department email (e.g. lastname.cpe@tip.edu.ph).');
        setLoading(false);
        return;
      }

      if (selectedRole === 'student' && emailLower.endsWith('.cpe@tip.edu.ph')) {
        setError('Please use the Faculty login for department email addresses.');
        setLoading(false);
        return;
      }

      const response = await api.post('/auth/google', {
        token: credentialResponse.credential,
        email: decoded.email,
        name: decoded.name,
        selectedRole,
      });

      const data = response.data;

      if (data.requiresVerification) {
        sessionStorage.removeItem('loginRole');
        navigate('/verify-code', {
          state: { userId: data.userId, email: decoded.email },
        });
      } else if (data.mustChangePassword) {
        sessionStorage.removeItem('loginRole');
        setError('This account must change password via email/password sign-in before continuing.');
      } else if (data.user && data.user.role === 'student' && !data.user.studentId) {
        setPendingGoogleUser({ userId: data.user.id, email: decoded.email, token: data.token });
        setShowStudentIdModal(true);
      } else {
        sessionStorage.removeItem('loginRole');
        const result = await login(data.token);
        navigate(getHomePathForRole(result?.role || data.user?.role));
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
      localStorage.setItem('token', pendingGoogleUser.token);
      await api.patch('/users/update-student-id', { studentId });

      setShowStudentIdModal(false);
      setPendingGoogleUser(null);
      const result = await login(pendingGoogleUser.token);
      navigate(getHomePathForRole(result?.role));
    } catch (err) {
      localStorage.removeItem('token');
      throw new Error(err.response?.data?.message || 'Failed to update Student Number');
    }
  };

  /* ── Role Selection Screen ── */
  if (!selectedRole) {
    return (
      <div className="auth-page">
        <div className="auth-bg" style={{ backgroundImage: `url(${bgImage})` }}>
          <div className="auth-role-container">
            <div className="auth-role-card">
              <img src={studentAdvisingLogo} alt="Student Advising" className="auth-role-logo" />
              <h1 className="auth-role-title">Welcome Back</h1>
              <p className="auth-role-subtitle">Choose your role to continue</p>
              <div className="auth-role-options">
                <div
                  className="auth-role-option"
                  role="button"
                  tabIndex={0}
                  aria-label="Login as Student"
                  onClick={() => selectRole('student')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectRole('student');
                    }
                  }}
                >
                  <img src={studentIcon} alt="Student" className="auth-role-icon" />
                  <div className="auth-role-label">Student</div>
                </div>
                <div
                  className="auth-role-option"
                  role="button"
                  tabIndex={0}
                  aria-label="Login as Faculty"
                  onClick={() => selectRole('faculty')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectRole('faculty');
                    }
                  }}
                >
                  <img src={teacherIcon} alt="Faculty" className="auth-role-icon" />
                  <div className="auth-role-label">Faculty</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Login Form Screen ── */
  return (
    <div className="auth-page">
      {showStudentIdModal && pendingGoogleUser && (
        <StudentIdModal onSubmit={handleStudentIdSubmit} userEmail={pendingGoogleUser.email} />
      )}

      <div className="auth-bg" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="auth-card">
          <img src={studentAdvisingLogo} alt="Student Advising" className="auth-card-logo" />

          <button
            className="auth-back-btn"
            onClick={clearRole}
            type="button"
            aria-label="Go back to role selection"
          >
            <BackArrow />
            Back to role selection
          </button>

          <h2 className="auth-form-title">
            {selectedRole === 'faculty' ? 'Faculty Sign In' : 'Student Sign In'}
          </h2>
          <p className="auth-form-desc">Enter your credentials to access your account</p>

          {error && (
            <Alert
              className="auth-alert"
              variant="danger"
              dismissible
              onClose={() => setError('')}
              role="alert"
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-email">Email Address</label>
              <Form.Control
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Email Address"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <Form.Control
                id="login-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Password"
              />
            </div>

            <Link to="/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              <span>{loading ? 'Signing in…' : 'Sign In'}</span>
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-google-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              theme="outline"
              size="large"
            />
          </div>

          <p className="auth-footer-text">
            New to Student Advising Portal?{' '}
            <Link to="/register" state={{ role: selectedRole }}>
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
