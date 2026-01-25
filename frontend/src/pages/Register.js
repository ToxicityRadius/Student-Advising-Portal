import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import backgroundImage from '../sys-bg-img1.d66192ea.jpg';
import tipLogo from '../tip logo.png';

const Register = () => {
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!/^\d{7}$/.test(formData.studentId)) {
      setError('Student Number must be exactly 7 digits');
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
        studentId: formData.studentId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
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
      const response = await fetch('http://localhost:5000/api/auth/google', {
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
        // Store the token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Force a page reload to trigger AuthContext to load the user
        window.location.href = '/dashboard';
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

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center position-relative py-5" 
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div 
        className="position-absolute top-0 start-0 w-100 h-100" 
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
      />
      
      <Container className="position-relative" style={{ zIndex: 1 }}>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <img src={tipLogo} alt="TIP Logo" style={{ maxWidth: '280px', height: 'auto' }} />
                </div>
                
                <h2 className="mb-4 text-start">Create an Account</h2>
                
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
                      size="lg"
                    />
                  </Form.Group>
                  
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
                          size="lg"
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
                          size="lg"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Email Address"
                      size="lg"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Password"
                      size="lg"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm Password"
                      size="lg"
                    />
                  </Form.Group>
                  
                  <Button 
                    type="submit" 
                    variant="warning" 
                    size="lg" 
                    className="w-100 fw-bold text-dark mb-3"
                    disabled={loading}
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
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      text="signup_with"
                      theme="outline"
                      size="large"
                    />
                  </div>
                  
                  <div className="text-center mt-4">
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
