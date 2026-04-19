import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { isGoogleOAuthConfigured } from '../utils/googleOAuthConfig';
import api from '../utils/api';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';
import { EyeIcon, EyeSlashIcon } from '../components/EyeIcons';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || 'student';
  const isFaculty = role === 'faculty';
  const { register, refreshUser } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!isFaculty && !/^\d{7}$/.test(formData.studentId)) {
      setError('Student Number must be exactly 7 digits');
      return;
    }

    // Faculty email validation
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
      // Decode the JWT token from Google
      const decoded = jwtDecode(credentialResponse.credential);

      // Check if email ends with @tip.edu.ph
      if (!decoded.email.toLowerCase().endsWith('@tip.edu.ph')) {
        setError('Only TIP email addresses (@tip.edu.ph) are allowed to sign in.');
        setLoading(false);
        return;
      }

      // Send the Google token to your backend for verification and login
      const { data } = await api.post('/auth/google', {
        token: credentialResponse.credential,
        email: decoded.email,
        name: decoded.name,
      });

      if (data.requiresVerification) {
        navigate('/verify-code', {
          state: {
            userId: data.userId,
            email: decoded.email,
          },
        });
        return;
      }

      // Route through AuthContext so inactivity timer and state are properly set up
      await refreshUser();

      // Navigate to dashboard
      navigate('/dashboard');
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
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center position-relative py-5"
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

      <Container className="position-relative" style={{ zIndex: 1 }}>
        <Row className="justify-content-center">
          <Col xs={12} sm={9} md={7} lg={6} xl={5} style={{ maxWidth: '380px' }}>
            <Card
              className="shadow-lg border-0"
              style={{
                position: 'relative',
                zIndex: 3,
                borderRadius: '20px',
                overflow: 'hidden',
              }}
            >
              <Card.Body className="p-3 p-md-4">
                <div className="text-center mb-3">
                  <img
                    src={studentAdvisingLogo}
                    alt="Student Advising Logo"
                    style={{ maxWidth: '220px', height: 'auto' }}
                  />
                </div>

                <h2 className="mb-3 text-start" style={{ fontSize: '1.3rem' }}>
                  {isFaculty ? 'Faculty Registration' : 'Create an Account'}
                </h2>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {success}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {!isFaculty && (
                    <Form.Group className="mb-3">
                      <Form.Control
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
                    </Form.Group>
                  )}

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          placeholder="First Name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          placeholder="Last Name"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Select name="gender" value={formData.gender} onChange={handleChange}>
                      <option value="">Gender (Optional)</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </Form.Select>
                  </Form.Group>

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

                  <Form.Group className="mb-3" style={{ position: 'relative' }}>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm Password"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                      {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </Form.Group>

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
                    {loading ? 'Creating Account...' : 'Register'}
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
                        text="signup_with"
                        theme="outline"
                        size="large"
                      />
                    ) : (
                      <Alert variant="warning" className="mb-0 py-2 text-center" role="status">
                        Google Sign-In is currently unavailable. Please register with email and
                        password.
                      </Alert>
                    )}
                  </div>

                  <div className="text-center mt-3" style={{ fontSize: '0.82rem' }}>
                    <span className="text-muted">Already have an account? </span>
                    <Link to="/login" className="text-decoration-none fw-bold">
                      Sign in
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

export default Register;
