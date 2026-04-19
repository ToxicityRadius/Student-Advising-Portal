import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ChangeEmail = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState('enterEmail'); // 'enterEmail' | 'enterCode'
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!newEmail.trim()) {
      setError('Please enter your new email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/initiate-email-change', { newEmail: newEmail.trim() });
      setInfo(`Verification code sent to ${newEmail.trim()}. Check your inbox.`);
      setStep('enterCode');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!code.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-email-change', { code: code.trim() });
      setInfo('Email verified successfully! Redirecting to dashboard...');
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await api.post('/auth/resend-email-change-code', {});
      setInfo('New verification code sent. Check your inbox.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: '520px' }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h3 className="mb-1">Set Program Chair Email</h3>
          <p className="text-muted mb-3" style={{ fontSize: '0.92rem' }}>
            Step {step === 'enterEmail' ? '1' : '2'} of 2 —{' '}
            {step === 'enterEmail'
              ? 'Enter a new institutional email address'
              : 'Enter the verification code sent to your new email'}
          </p>

          <Alert variant="warning" className="mb-3">
            Your account must have a verified institutional email before you can access the portal.
          </Alert>

          {error && <Alert variant="danger">{error}</Alert>}
          {info && <Alert variant="info">{info}</Alert>}

          {step === 'enterEmail' && (
            <Form onSubmit={handleSendCode}>
              <Form.Group className="mb-3">
                <Form.Label>New Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="e.g. lastname.cpe@tip.edu.ph"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
                <Form.Text className="text-muted">
                  Must be a valid <strong>.cpe@tip.edu.ph</strong> address.
                </Form.Text>
              </Form.Group>

              <Button type="submit" variant="primary" className="w-100 fw-bold" disabled={loading}>
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </Button>
            </Form>
          )}

          {step === 'enterCode' && (
            <Form onSubmit={handleVerifyCode}>
              <Form.Group className="mb-3">
                <Form.Label>Verification Code</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter the 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={10}
                  required
                />
              </Form.Group>

              <Button
                type="submit"
                variant="success"
                className="w-100 fw-bold mb-2"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Activate Email'}
              </Button>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <Button
                  variant="link"
                  size="sm"
                  className="p-0"
                  onClick={() => {
                    setStep('enterEmail');
                    setCode('');
                    setError('');
                    setInfo('');
                  }}
                  disabled={loading}
                >
                  Change email address
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0"
                  onClick={handleResend}
                  disabled={loading}
                >
                  Resend code
                </Button>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ChangeEmail;
