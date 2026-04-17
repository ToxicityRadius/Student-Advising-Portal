import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getHomePathForRole } from '../utils/roleRedirect';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

const VerifyCode = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successCountdown, setSuccessCountdown] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const userId = location.state?.userId;
  const userEmail = location.state?.email;

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (successCountdown !== null && successCountdown > 0) {
      const timer = setTimeout(() => setSuccessCountdown(successCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (successCountdown === 0) {
      const role = JSON.parse(localStorage.getItem('user') || '{}')?.role;
      navigate(getHomePathForRole(role));
    }
  }, [successCountdown, navigate]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (!pastedData) return;

    const newCode = pastedData.split('');
    while (newCode.length < 6) newCode.push('');
    setCode(newCode);

    // Focus last filled input
    const lastIndex = Math.min(pastedData.length - 1, 5);
    const lastInput = document.getElementById(`code-input-${lastIndex}`);
    if (lastInput) lastInput.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/verify-code', {
        userId,
        code: verificationCode,
      });

      if (data.success) {
        if (data.mustChangePassword) {
          sessionStorage.setItem('forcePasswordChangeToken', data.token);
          navigate('/change-password');
          return;
        }

        await login(data.token);
        setSuccessCountdown(3);
      } else {
        setError(data.message || 'Invalid verification code');
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-input-0')?.focus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-input-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      await api.post('/auth/resend-code', { userId });
      setCountdown(60); // 60 second cooldown
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-input-0')?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
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
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-3">
                  <img
                    src={studentAdvisingLogo}
                    alt="Student Advising Logo"
                    style={{ maxWidth: '220px', height: 'auto' }}
                  />
                </div>

                <h2 className="mb-2" style={{ fontSize: '1.35rem' }}>
                  Verify Your Identity
                </h2>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                  We sent a 6-digit code to
                  <br />
                  <strong>{userEmail || 'your email'}</strong>
                </p>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {successCountdown !== null && (
                  <Alert variant="success">
                    Login Successful! Redirecting to Dashboard in {successCountdown}...
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <div className="code-input-container">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        id={`code-input-${index}`}
                        aria-label={`Verification code digit ${index + 1} of 6`}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="code-input"
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>

                  <Button
                    type="submit"
                    variant="warning"
                    className="w-100 fw-bold"
                    disabled={loading || successCountdown !== null}
                    style={{
                      backgroundColor: '#FFC107',
                      borderColor: '#FFC107',
                      color: '#000',
                    }}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>

                  <div className="text-center mt-3" style={{ fontSize: '0.9rem' }}>
                    <span className="text-muted">Didn't receive the code? </span>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={countdown > 0 || resendLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: countdown > 0 ? '#999' : '#0d6efd',
                        textDecoration: 'underline',
                        cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        padding: 0,
                      }}
                    >
                      {resendLoading
                        ? 'Sending...'
                        : countdown > 0
                          ? `Resend (${countdown}s)`
                          : 'Resend Code'}
                    </button>
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

export default VerifyCode;
