import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getHomePathForRole } from '../utils/roleRedirect';
import { isGoogleOAuthConfigured } from '../utils/googleOAuthConfig';
import { needsAcademicInfo, needsStudentNumber } from '../utils/studentProfileCompletion';
import StudentIdModal from '../components/StudentIdModal';
import AcademicInfoModal from '../components/AcademicInfoModal';
import backgroundImage from '../assets/images/bg.png';
import studentIcon from '../assets/images/student yellow.png';
import teacherIcon from '../assets/images/teacher yellow.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';
import { EyeIcon, EyeSlashIcon } from '../components/EyeIcons';

const FACULTY_EMAIL_WHITELIST = ['jennifer.enriquez@tip.edu.ph'];

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStudentIdModal, setShowStudentIdModal] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [pendingNavRole, setPendingNavRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(
    () => sessionStorage.getItem('loginRole') || null,
  );

  const selectRole = (role) => {
    sessionStorage.setItem('loginRole', role);
    setSelectedRole(role);
  };

  const clearRole = () => {
    sessionStorage.removeItem('loginRole');
    setSelectedRole(null);
  };

  const navigate = useNavigate();
  const { refreshUser, setUser, user, loading: authLoading } = useAuth();

  const currentUserNeedsStudentNumber = needsStudentNumber(user);
  const currentUserNeedsAcademicInfo = needsAcademicInfo(user);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    if (currentUserNeedsStudentNumber) {
      setPendingNavRole(user.role || 'student');
      setPendingGoogleUser({
        email: user.email || '',
        role: user.role || 'student',
      });
      setShowAcademicModal(false);
      setShowStudentIdModal(true);
      return;
    }

    if (currentUserNeedsAcademicInfo) {
      setPendingNavRole(user.role || 'student');
      setShowStudentIdModal(false);
      setPendingGoogleUser(null);
      setShowAcademicModal(true);
      return;
    }

    navigate(getHomePathForRole(user.role), { replace: true });
  }, [authLoading, currentUserNeedsAcademicInfo, currentUserNeedsStudentNumber, navigate, user]);

  const proceedAfterLogin = async (role, fallbackEmail = '') => {
    const resolvedUser = await refreshUser();
    const resolvedRole = resolvedUser?.role || role;

    if (needsStudentNumber(resolvedUser)) {
      setPendingNavRole(resolvedRole);
      setPendingGoogleUser({
        email: resolvedUser?.email || fallbackEmail,
        role: resolvedRole,
      });
      setShowStudentIdModal(true);
      return;
    }

    if (needsAcademicInfo(resolvedUser)) {
      setPendingNavRole(resolvedRole);
      setShowAcademicModal(true);
    } else {
      navigate(getHomePathForRole(resolvedRole));
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailLower = formData.email.toLowerCase();
    if (
      selectedRole === 'faculty' &&
      !emailLower.endsWith('.cpe@tip.edu.ph') &&
      !FACULTY_EMAIL_WHITELIST.includes(emailLower)
    ) {
      setError('Faculty, Program Chair, or Super Admin login requires a department email.');
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
          state: {
            userId: data.userId,
            email: formData.email,
            verificationSessionId: data.verificationSessionId,
          },
        });
      } else if (data.mustChangePassword) {
        sessionStorage.removeItem('loginRole');
        navigate('/change-password');
      } else if (data.mustChangeEmail) {
        sessionStorage.removeItem('loginRole');
        navigate('/change-email');
      } else {
        sessionStorage.removeItem('loginRole');
        await proceedAfterLogin(data.user?.role, formData.email);
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
      // Decode the JWT token from Google
      const decoded = jwtDecode(credentialResponse.credential);
      const emailLower = decoded.email.toLowerCase();

      // Check if email ends with @tip.edu.ph
      if (!emailLower.endsWith('@tip.edu.ph')) {
        setError('Only TIP email addresses (@tip.edu.ph) are allowed to sign in.');
        setLoading(false);
        return;
      }

      // Faculty, Program Chair, and Super Admin use department email addresses.
      if (
        selectedRole === 'faculty' &&
        !emailLower.endsWith('.cpe@tip.edu.ph') &&
        !FACULTY_EMAIL_WHITELIST.includes(emailLower)
      ) {
        setError('Faculty, Program Chair, or Super Admin login requires a department email.');
        setLoading(false);
        return;
      }

      // Students must NOT use a faculty department address
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
          state: {
            userId: data.userId,
            email: decoded.email,
            verificationSessionId: data.verificationSessionId,
          },
        });
      } else if (data.mustChangePassword) {
        sessionStorage.removeItem('loginRole');
        setError('This account must change password via email/password sign-in before continuing.');
      } else if (needsStudentNumber(data.user)) {
        // Student without a Student Number — show the modal.
        setPendingGoogleUser({
          email: data.user?.email || decoded.email,
          role: data.user?.role || 'student',
        });
        setShowStudentIdModal(true);
      } else {
        sessionStorage.removeItem('loginRole');
        await proceedAfterLogin(data.user?.role, decoded.email);
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Google Sign-In error:', err);
      }
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
      const roleForRedirect = pendingGoogleUser?.role || user?.role || 'student';

      const response = await api.patch('/users/update-student-id', {
        studentId,
      });
      const data = response.data;

      setShowStudentIdModal(false);
      setPendingGoogleUser(null);
      await proceedAfterLogin(data.user?.role || roleForRedirect);
    } catch (err) {
      throw new Error(
        err.response?.data?.message || err.message || 'Failed to update Student Number',
      );
    }
  };

  // Role selector screen
  if (!selectedRole && !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(160deg, rgba(13,27,42,0.93) 0%, rgba(27,45,69,0.86) 50%, rgba(27,45,69,0.82) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'white',
            borderRadius: '22px',
            padding: 'clamp(24px, 6vw, 60px) clamp(18px, 7vw, 70px)',
            textAlign: 'center',
            maxWidth: '720px',
            width: 'min(92vw, 720px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <img
            src={studentAdvisingLogo}
            alt="Student Advising"
            style={{ width: '220px', marginBottom: '22px' }}
          />
          <h2
            style={{
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 6.5vw, 2.4rem)',
              marginBottom: 'clamp(20px, 5vw, 40px)',
              color: '#222',
            }}
          >
            Welcome Back!
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'clamp(12px, 4vw, 28px)',
              justifyContent: 'center',
              maxWidth: '560px',
              margin: '0 auto',
            }}
          >
            <div
              onClick={() => selectRole('student')}
              role="button"
              tabIndex={0}
              aria-label="Login as Student"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectRole('student');
                }
              }}
              style={{
                cursor: 'pointer',
                padding: 'clamp(22px, 5vw, 36px) clamp(18px, 4vw, 30px) clamp(18px, 4vw, 26px)',
                borderRadius: '18px',
                border: '2px solid #eee',
                width: '100%',
                maxWidth: '240px',
                margin: '0 auto',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#F5B800';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#eee';
              }}
              onFocus={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#F5B800';
              }}
              onBlur={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#eee';
              }}
            >
              <img
                src={studentIcon}
                alt="Student"
                style={{ width: '110px', height: '110px', objectFit: 'contain' }}
              />
              <p
                style={{
                  color: '#D4A000',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  marginTop: '18px',
                  letterSpacing: '0.5px',
                  marginBottom: 0,
                }}
              >
                LOGIN AS STUDENT
              </p>
            </div>
            <div
              onClick={() => selectRole('faculty')}
              role="button"
              tabIndex={0}
              aria-label="Login as Faculty"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectRole('faculty');
                }
              }}
              style={{
                cursor: 'pointer',
                padding: 'clamp(22px, 5vw, 36px) clamp(18px, 4vw, 30px) clamp(18px, 4vw, 26px)',
                borderRadius: '18px',
                border: '2px solid #eee',
                width: '100%',
                maxWidth: '240px',
                margin: '0 auto',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#F5B800';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#eee';
              }}
              onFocus={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#F5B800';
              }}
              onBlur={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#eee';
              }}
            >
              <img
                src={teacherIcon}
                alt="Instructor"
                style={{ width: '110px', height: '110px', objectFit: 'contain' }}
              />
              <p
                style={{
                  color: '#D4A000',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  marginTop: '18px',
                  letterSpacing: '0.5px',
                  marginBottom: 0,
                }}
              >
                LOGIN AS FACULTY
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center position-relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(160deg, rgba(13,27,42,0.93) 0%, rgba(27,45,69,0.86) 50%, rgba(27,45,69,0.82) 100%)',
          zIndex: 0,
        }}
      />

      {showStudentIdModal && pendingGoogleUser && (
        <StudentIdModal onSubmit={handleStudentIdSubmit} userEmail={pendingGoogleUser.email} />
      )}

      {showAcademicModal && (
        <AcademicInfoModal
          onComplete={async (updatedUser) => {
            setShowAcademicModal(false);
            try {
              await refreshUser();
            } catch {
              if (updatedUser && typeof setUser === 'function') {
                const normalized = {
                  ...updatedUser,
                  firstName: updatedUser.firstName ?? updatedUser.first_name,
                  lastName: updatedUser.lastName ?? updatedUser.last_name,
                  yearLevel:
                    updatedUser.yearLevel ??
                    updatedUser.year_level ??
                    updatedUser.current_year_level,
                };
                setUser(normalized);
                localStorage.setItem('user', JSON.stringify(normalized));
              }
            }
            navigate(getHomePathForRole(pendingNavRole || 'student'));
          }}
        />
      )}

      <Container className="position-relative" style={{ zIndex: 1 }}>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5} style={{ maxWidth: '380px' }}>
            <Card
              className="shadow-lg border-0"
              style={{ position: 'relative', zIndex: 3, borderRadius: '20px', overflow: 'hidden' }}
            >
              <Card.Body className="p-3 p-md-4">
                <div
                  className="text-center mb-3"
                  style={{ marginTop: '30px', marginBottom: '30px' }}
                >
                  <img
                    src={studentAdvisingLogo}
                    alt="Student Advising Logo"
                    style={{
                      maxWidth: '300px',
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                </div>

                <div className="text-start mb-2">
                  <button
                    onClick={() => clearRole()}
                    type="button"
                    style={{
                      cursor: 'pointer',
                      color: '#666',
                      fontSize: '0.8rem',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                    aria-label="Go back to role selection"
                  >
                    ← Back
                  </button>
                </div>
                <h2 className="mb-3 text-start" style={{ fontSize: '1.3rem' }}>
                  Sign in{selectedRole === 'faculty' ? ' as Faculty / Chair' : ' as Student'}
                </h2>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')} role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Email Address"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" style={{ position: 'relative' }}>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Password"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#888',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </Form.Group>

                  <div className="text-end mb-3">
                    <Link
                      to="/forgot-password"
                      className="text-decoration-none"
                      style={{ fontSize: '0.82rem' }}
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    variant="warning"
                    size="lg"
                    className="w-100 fw-bold mb-3 login-button"
                    disabled={loading}
                    style={{
                      backgroundColor: '#FFC107',
                      borderColor: '#FFC107',
                      color: '#000',
                    }}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>

                  <div className="position-relative text-center mb-3">
                    <hr />
                    <span
                      className="position-absolute top-50 start-50 translate-middle bg-white px-3"
                      style={{ color: '#666' }}
                    >
                      or
                    </span>
                  </div>

                  <div className="d-flex justify-content-center">
                    {isGoogleOAuthConfigured ? (
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        text="signin_with"
                        theme="outline"
                        size="large"
                      />
                    ) : (
                      <Alert variant="warning" className="mb-0 py-2 text-center" role="status">
                        Google Sign-In is currently unavailable. Please use email and password.
                      </Alert>
                    )}
                  </div>

                  <div className="text-center mt-3" style={{ fontSize: '0.82rem' }}>
                    <span className="text-muted">New to Student Advising Portal? </span>
                    <Link
                      to="/register"
                      state={{ role: selectedRole }}
                      className="text-decoration-none fw-bold"
                    >
                      Create an Account
                    </Link>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
