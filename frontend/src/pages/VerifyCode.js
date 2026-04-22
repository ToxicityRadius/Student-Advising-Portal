import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getHomePathForRole } from '../utils/roleRedirect';
import backgroundImage from '../assets/images/bg.png';
import studentAdvisingLogo from '../assets/images/STUDENT ADVISING LOGO 1.png';

const VERIFICATION_CODE_LENGTH = 6;
const PENDING_VERIFICATION_CONTEXT_KEY = 'pendingVerificationContext';

const sanitizeVerificationSessionId = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return /^[a-f0-9]{64}$/i.test(normalized) ? normalized : null;
};

const loadPendingVerificationContext = () => {
  try {
    const raw = sessionStorage.getItem(PENDING_VERIFICATION_CONTEXT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const normalizedUserId = Number.parseInt(parsed.userId, 10);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      return null;
    }

    return {
      userId: normalizedUserId,
      email:
        typeof parsed.email === 'string' && parsed.email.trim().length > 0 ? parsed.email : null,
      verificationSessionId: sanitizeVerificationSessionId(parsed.verificationSessionId),
    };
  } catch (_error) {
    return null;
  }
};

const savePendingVerificationContext = ({ userId, email, verificationSessionId }) => {
  try {
    const normalizedUserId = Number.parseInt(userId, 10);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      return;
    }

    sessionStorage.setItem(
      PENDING_VERIFICATION_CONTEXT_KEY,
      JSON.stringify({
        userId: normalizedUserId,
        email: typeof email === 'string' ? email : null,
        verificationSessionId: sanitizeVerificationSessionId(verificationSessionId),
      }),
    );
  } catch (_error) {
    // Ignore storage write errors in restricted contexts.
  }
};

const clearPendingVerificationContext = () => {
  try {
    sessionStorage.removeItem(PENDING_VERIFICATION_CONTEXT_KEY);
  } catch (_error) {
    // Ignore storage failures in restricted contexts.
  }
};

const VerifyCode = () => {
  const [code, setCode] = useState(new Array(VERIFICATION_CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successCountdown, setSuccessCountdown] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const pendingContext = loadPendingVerificationContext();

  const stateUserId = location.state?.userId;
  const userId =
    Number.isInteger(Number.parseInt(stateUserId, 10)) && Number.parseInt(stateUserId, 10) > 0
      ? Number.parseInt(stateUserId, 10)
      : pendingContext?.userId || null;
  const userEmail = location.state?.email || pendingContext?.email;
  const verificationSessionId =
    sanitizeVerificationSessionId(location.state?.verificationSessionId) ||
    pendingContext?.verificationSessionId ||
    null;

  useEffect(() => {
    if (userId) {
      savePendingVerificationContext({
        userId,
        email: userEmail,
        verificationSessionId,
      });
    }
  }, [userId, userEmail, verificationSessionId]);

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

  const focusCodeInput = (index) => {
    const boundedIndex = Math.max(0, Math.min(index, VERIFICATION_CODE_LENGTH - 1));
    const input = document.getElementById(`code-input-${boundedIndex}`);
    if (input) {
      input.focus();
    }
  };

  const applyDigitsStartingAt = (startIndex, digits) => {
    const normalizedStartIndex = Math.max(0, Math.min(startIndex, VERIFICATION_CODE_LENGTH - 1));
    const safeDigits = digits.filter((digit) => /^\d$/.test(digit));

    if (safeDigits.length === 0) {
      return;
    }

    const nextCode = [...code];
    let cursor = normalizedStartIndex;

    for (const digit of safeDigits) {
      if (cursor >= VERIFICATION_CODE_LENGTH) {
        break;
      }
      nextCode[cursor] = digit;
      cursor += 1;
    }

    setCode(nextCode);
    focusCodeInput(cursor >= VERIFICATION_CODE_LENGTH ? VERIFICATION_CODE_LENGTH - 1 : cursor);
  };

  const handleChange = (index, value) => {
    const digits = String(value || '').replace(/\D/g, '');

    if (!digits) {
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      return;
    }

    if (digits.length === 1) {
      const newCode = [...code];
      newCode[index] = digits;
      setCode(newCode);

      if (index < VERIFICATION_CODE_LENGTH - 1) {
        focusCodeInput(index + 1);
      }
      return;
    }

    // Mobile OTP autofill can inject the whole code into a single input.
    applyDigitsStartingAt(index, digits.split(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      focusCodeInput(index - 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, VERIFICATION_CODE_LENGTH);
    if (!pastedData) {
      return;
    }

    applyDigitsStartingAt(0, pastedData.split(''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');

    if (verificationCode.length !== VERIFICATION_CODE_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.post(
        '/auth/verify-code',
        {
          userId,
          code: verificationCode,
          ...(verificationSessionId ? { verificationSessionId } : {}),
        },
        {
          // Send session ID in header as well so it works even when
          // cross-site cookies are blocked (e.g. Safari ITP on iOS).
          headers: verificationSessionId ? { 'x-verification-session': verificationSessionId } : {},
        },
      );

      if (data.success) {
        if (data.mustChangePassword) {
          clearPendingVerificationContext();
          navigate('/change-password');
          return;
        }

        await refreshUser();
        clearPendingVerificationContext();
        setSuccessCountdown(3);
      } else {
        setError(data.message || 'Invalid verification code');
        setCode(new Array(VERIFICATION_CODE_LENGTH).fill(''));
        document.getElementById('code-input-0')?.focus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
      setCode(new Array(VERIFICATION_CODE_LENGTH).fill(''));
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
      await api.post(
        '/auth/resend-code',
        {
          userId,
          ...(verificationSessionId ? { verificationSessionId } : {}),
        },
        {
          headers: verificationSessionId ? { 'x-verification-session': verificationSessionId } : {},
        },
      );
      setCountdown(60); // 60 second cooldown
      setCode(new Array(VERIFICATION_CODE_LENGTH).fill(''));
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
          <Col xs={12} sm={10} md={8} lg={6} xl={5} style={{ maxWidth: '420px' }}>
            <Card
              className="shadow-lg border-0"
              style={{ borderRadius: '20px', overflow: 'hidden' }}
            >
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
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
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

                  <div className="text-center mt-2" style={{ fontSize: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6c757d',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: 0,
                      }}
                    >
                      ← Back to Login
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
