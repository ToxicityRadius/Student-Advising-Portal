import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Alert, Row, Col, Button } from 'react-bootstrap';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

const ActivateAccount = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const activateAccount = async () => {
      try {
        const response = await api.get(`/auth/activate/${token}`);
        const { token: authToken } = response.data;

        await login(authToken);
        setStatus('success');
        setMessage('Account activated successfully! Redirecting to dashboard...');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Failed to activate account');
      }
    };

    activateAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

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
          <Col xs={12} sm={10} md={8} lg={6} xl={5} style={{ maxWidth: '420px' }}>
            <Card className="shadow-lg border-0" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              <Card.Body className="p-4 p-md-5 text-center">
                <div className="mb-3">
                  <img
                    src={studentAdvisingLogo}
                    alt="Student Advising Logo"
                    style={{ maxWidth: '220px', height: 'auto' }}
                  />
                </div>

                <h2 className="mb-3" style={{ fontSize: '1.55rem' }}>Account Activation</h2>

                {status === 'loading' && (
                  <Alert variant="info" className="mb-3">
                    Activating your account...
                  </Alert>
                )}

                {status === 'success' && (
                  <Alert variant="success" className="mb-3">
                    {message}
                  </Alert>
                )}

                {status === 'error' && (
                  <>
                    <Alert variant="danger" className="mb-3">
                      {message}
                    </Alert>
                    <Button
                      type="button"
                      onClick={() => navigate('/login')}
                      variant="warning"
                      size="lg"
                      className="w-100 fw-bold mb-0 login-button"
                      style={{
                        backgroundColor: '#FFC107',
                        borderColor: '#FFC107',
                        color: '#000',
                      }}
                    >
                      Back to Login
                    </Button>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ActivateAccount;
