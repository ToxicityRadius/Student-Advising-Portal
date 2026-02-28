import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import StudentIdModal from '../components/StudentIdModal';
import backgroundImage from '../assets/images/bg.png';
import tipLogo from '../assets/images/tip logo.png';
import studentIcon from '../assets/images/student yellow.png';
import teacherIcon from '../assets/images/teacher yellow.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStudentIdModal, setShowStudentIdModal] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
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

  // Role selector screen
  if (!selectedRole) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}/>
        <div style={{
          position: 'relative',
          zIndex: 1,
          background: 'white',
          borderRadius: '24px',
          padding: '50px 60px',
          textAlign: 'center',
          maxWidth: '650px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <img src={studentAdvisingLogo} alt="Student Advising" style={{ width: '200px', marginBottom: '24px' }}/>
          <h2 style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: '40px', color: '#222' }}>Welcome Back!</h2>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center' }}>
            <div
              onClick={() => setSelectedRole('student')}
              style={{
                cursor: 'pointer',
                padding: '32px 28px 24px',
                borderRadius: '16px',
                border: '2px solid #eee',
                width: '220px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#F5B800'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#eee'; }}
            >
              <img src={studentIcon} alt="Student" style={{ width: '100px', height: '100px', objectFit: 'contain' }}/>
              <p style={{ color: '#D4A000', fontWeight: 700, fontSize: '0.85rem', marginTop: '16px', letterSpacing: '0.5px', marginBottom: 0 }}>LOGIN AS STUDENT</p>
            </div>
            <div
              onClick={() => setSelectedRole('faculty')}
              style={{
                cursor: 'pointer',
                padding: '32px 28px 24px',
                borderRadius: '16px',
                border: '2px solid #eee',
                width: '220px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#F5B800'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#eee'; }}
            >
              <img src={teacherIcon} alt="Instructor" style={{ width: '100px', height: '100px', objectFit: 'contain' }}/>
              <p style={{ color: '#D4A000', fontWeight: 700, fontSize: '0.85rem', marginTop: '16px', letterSpacing: '0.5px', marginBottom: 0 }}>LOGIN AS FACULTY</p>
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
        backgroundPosition: 'center'
      }}
    >
      
      {showStudentIdModal && pendingGoogleUser && (
        <StudentIdModal
          onSubmit={handleStudentIdSubmit}
          userEmail={pendingGoogleUser.email}
        />
      )}
      
      {/* Yellow rectangle - left side, top overlap */}
      <div 
        className="position-absolute" 
        style={{ 
          left: 0,
          top: '10%',
          width: '750px',
          height: '90px',
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
          bottom: '10%',
          width: '1500px',
          height: '100px',
          backgroundColor: '#FFC107',
          zIndex: 1,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
        }}
      />
      
      <Container className="position-relative" style={{ zIndex: 1 }}>
        <Row className="justify-content-start">
          <Col xs={13} sm={10} md={8} lg={6} xl={5} style={{ maxWidth: '435px' }}>
            <Card className="shadow-lg border-0" style={{ position: 'relative', zIndex: 3, borderRadius: '20px', overflow: 'hidden' }}>
              <Card.Body className="p-3 p-md-4">
                <div className="text-center mb-3" style={{ marginTop: '70px', marginBottom: '70px' }}>
                  <img src={tipLogo} alt="TIP Logo" style={{ maxWidth: '250px', height: 'auto' }} />
                </div>
                
                <div className="text-start mb-2">
                  <span 
                    onClick={() => setSelectedRole(null)} 
                    style={{ cursor: 'pointer', color: '#666', fontSize: '0.9rem' }}
                  >
                    ← Back
                  </span>
                </div>
                <h2 className="mb-4 text-start">Sign in{selectedRole === 'faculty' ? ' as Instructor' : ' as Student'}</h2>
                
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
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
                  
                  <div className="text-end mb-3">
                    <Link to="/forgot-password" className="text-decoration-none">
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
                      color: '#000'
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
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      text="signin_with"
                      theme="outline"
                      size="large"
                    />
                  </div>
                  
                  <div className="text-center mt-4">
                    <span className="text-muted">New to Student Advising Portal? </span>
                    <Link to="/register" state={{ role: selectedRole }} className="text-decoration-none fw-bold">
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
