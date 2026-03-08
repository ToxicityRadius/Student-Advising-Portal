import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import StudentIdModal from '../components/StudentIdModal';
import backgroundImage from '../assets/images/bg.png';
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
          // 2FA disabled — save token and redirect
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = '/dashboard';
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
          borderRadius: '22px',
          padding: '60px 70px',
          textAlign: 'center',
          maxWidth: '720px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <img src={studentAdvisingLogo} alt="Student Advising" style={{ width: '220px', marginBottom: '22px' }}/>
          <h2 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '40px', color: '#222' }}>Welcome Back!</h2>
          <div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
            <div
              onClick={() => setSelectedRole('student')}
              style={{
                cursor: 'pointer',
                padding: '36px 30px 26px',
                borderRadius: '18px',
                border: '2px solid #eee',
                width: '240px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#F5B800'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#eee'; }}
            >
              <img src={studentIcon} alt="Student" style={{ width: '110px', height: '110px', objectFit: 'contain' }}/>
              <p style={{ color: '#D4A000', fontWeight: 700, fontSize: '0.95rem', marginTop: '18px', letterSpacing: '0.5px', marginBottom: 0 }}>LOGIN AS STUDENT</p>
            </div>
            <div
              onClick={() => setSelectedRole('faculty')}
              style={{
                cursor: 'pointer',
                padding: '36px 30px 26px',
                borderRadius: '18px',
                border: '2px solid #eee',
                width: '240px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#F5B800'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#eee'; }}
            >
              <img src={teacherIcon} alt="Instructor" style={{ width: '110px', height: '110px', objectFit: 'contain' }}/>
              <p style={{ color: '#D4A000', fontWeight: 700, fontSize: '0.95rem', marginTop: '18px', letterSpacing: '0.5px', marginBottom: 0 }}>LOGIN AS FACULTY</p>
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

      
      <Container className="position-relative" style={{ zIndex: 1 }}>
        <Row className="justify-content-center">
          <Col xs={13} sm={10} md={8} lg={6} xl={5} style={{ maxWidth: '380px' }}>
            <Card className="shadow-lg border-0" style={{ position: 'relative', zIndex: 3, borderRadius: '20px', overflow: 'hidden' }}>
              <Card.Body className="p-3 p-md-4">
                <div className="text-center mb-3" style={{ marginTop: '30px', marginBottom: '30px' }}>
                  <img src={studentAdvisingLogo} alt="Student Advising Logo" style={{ maxWidth: '300px', height: 'auto', display: 'block', margin: '0 auto' }} />
                </div>
                
                <div className="text-start mb-2">
                  <span 
                    onClick={() => setSelectedRole(null)} 
                    style={{ cursor: 'pointer', color: '#666', fontSize: '0.8rem' }}
                  >
                    ← Back
                  </span>
                </div>
                <h2 className="mb-3 text-start" style={{ fontSize: '1.3rem' }}>Sign in{selectedRole === 'faculty' ? ' as Instructor' : ' as Student'}</h2>
                
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
                    <Link to="/forgot-password" className="text-decoration-none" style={{ fontSize: '0.82rem' }}>
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
                  
                  <div className="text-center mt-3" style={{ fontSize: '0.82rem' }}>
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
