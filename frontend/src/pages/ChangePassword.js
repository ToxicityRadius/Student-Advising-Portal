import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon } from '../components/EyeIcons';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.put('/auth/change-password', {
        newPassword,
      });

      if (response.data.mustChangeEmail) {
        navigate('/change-email');
        return;
      }

      setSuccess('Password changed successfully. Redirecting...');
      await refreshUser();
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
            <Form.Group className="mb-3" style={{ position: 'relative' }}>
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showNewPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </Form.Group>

            <Form.Group className="mb-3" style={{ position: 'relative' }}>
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
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
