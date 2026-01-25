import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import backgroundImage from '../sys-bg-img1.d66192ea.jpg';
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
