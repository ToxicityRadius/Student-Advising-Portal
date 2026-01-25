import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import backgroundImage from '../bg.png';
import tipLogo from '../tip logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail('');
      } else {
        setError(data.message || 'An error occurred. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
          width: '750px',
          height: '100px',
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
          height: '100px',
          backgroundColor: '#FFC107',
          zIndex: 1,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
        }}
      />
      
      <Container className="position-relative" style={{ zIndex: 1 }}>
        <Row className="justify-content-start">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="shadow-lg border-0" style={{ position: 'relative', zIndex: 3, borderRadius: '20px', overflow: 'hidden' }}>
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <img src={tipLogo} alt="TIP Logo" style={{ maxWidth: '280px', height: 'auto' }} />
                </div>
                
                <h2 className="mb-3">Forgot Password?</h2>
                <p className="text-muted mb-4 small">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                
                {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                {message && <Alert variant="success" dismissible onClose={() => setMessage('')}>{message}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Email Address"
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
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  
                  <div className="text-center">
                    <Link to="/login" className="text-decoration-none">
                      ← Back to Login
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

export default ForgotPassword;
