import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefer navigation state (in-memory, not persisted) over sessionStorage fallback
  const tempToken = location.state?.token || sessionStorage.getItem('forcePasswordChangeToken');
  const oldPassword = location.state?.oldPassword || null;
  const persistentToken = localStorage.getItem('token');

  const activeToken = useMemo(() => tempToken || persistentToken || null, [tempToken, persistentToken]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!activeToken) {
      setError('Your session has expired. Please log in again.');
      return;
    }

    if (!oldPassword) {
      setError('Original login password is required for verification. Please log in again.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put(
        '/auth/change-password',
        {
          oldPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${activeToken}`
          }
        }
      );

      sessionStorage.removeItem('forcePasswordChangeToken');

      if (response.data.mustChangeEmail) {
        sessionStorage.setItem('forceEmailChangeToken', response.data.token);
        navigate('/change-email');
        return;
      }

      setSuccess('Password changed successfully. Redirecting...');
      await login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: '520px' }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h3 className="mb-3">Change Password</h3>
          <Alert variant="warning" className="mb-3">
            You must change your password before continuing.
          </Alert>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit" variant="warning" className="w-100 fw-bold" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ChangePassword;
