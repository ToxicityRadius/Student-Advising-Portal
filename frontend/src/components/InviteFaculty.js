import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';

const InviteFaculty = () => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'adviser'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/admin/invite-faculty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setFormData({ email: '', role: 'adviser' });
      } else {
        setError(data.message || 'Failed to send invitation');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error sending invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4 shadow-sm border-3 border-dark">
      <Card.Header className="bg-white border-bottom border-warning border-3">
        <h3 className="mb-0">📧 Invite Faculty Member</h3>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>✅ {success}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Email Address *</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="faculty@tip.edu.ph"
              size="lg"
            />
            <Form.Text className="text-muted">
              Must be a valid @tip.edu.ph email address
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Role *</Form.Label>
            <Form.Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              size="lg"
            >
              <option value="adviser">Adviser (Student Adviser)</option>
              <option value="admin">Admin (Program Chair)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {formData.role === 'adviser' 
                ? 'Can access advisee records and validate study plans' 
                : 'Full system access including user management and analytics'}
            </Form.Text>
          </Form.Group>

          <Button
            type="submit"
            variant="warning"
            size="lg"
            className="w-100 fw-bold text-dark border-2 border-dark"
            disabled={loading}
          >
            {loading ? 'Sending Invitation...' : '✉️ Send Invitation'}
          </Button>

          <p className="text-center text-muted mt-3 mb-0 small">
            ⏰ Invitation links expire in 48 hours
          </p>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default InviteFaculty;
