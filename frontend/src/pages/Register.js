import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

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
  const location = useLocation();
  const role = location.state?.role || 'student';
  const isFaculty = role === 'faculty';
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
        email: formData.email,
        password: formData.password,
        role: isFaculty ? 'adviser' : 'student'
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
      
      {/* Yellow rectangle - left side, top overlap */}
      <div 
        className="position-absolute" 
        style={{ 
          left: 0,
          top: '6%',
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
      
      <Container className="position-relative" style={{ zIndex: 1 }}>
        <Row className="justify-content-center">
          <Col xs={12} sm={9} md={7} lg={6} xl={5} style={{ maxWidth: '380px' }}>
            <Card className="shadow-lg border-0" style={{ position: 'relative', zIndex: 3, borderRadius: '20px', overflow: 'hidden' }}>
              <Card.Body className="p-3 p-md-4">
                <div className="text-center mb-3">
                  <img src={studentAdvisingLogo} alt="Student Advising Logo" style={{ maxWidth: '220px', height: 'auto' }} />
                </div>
                
                <h2 className="mb-3 text-start" style={{ fontSize: '1.3rem' }}>{isFaculty ? 'Faculty Registration' : 'Create an Account'}</h2>
                
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
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Email Address"
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
                    />
                  </Form.Group>
                  
                  <Button 
                    type="submit" 
                    variant="warning" 
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
