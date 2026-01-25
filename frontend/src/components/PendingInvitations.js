import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Alert, Badge, Spinner } from 'react-bootstrap';

const PendingInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPendingInvitations();
  }, []);

  const fetchPendingInvitations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/admin/invitations/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
      } else {
        setError(data.message || 'Failed to fetch invitations');
      }
    } catch (err) {
      setError('An error occurred while fetching invitations');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to resend this invitation?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/admin/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        fetchPendingInvitations();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to resend invitation');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('An error occurred while resending invitation');
      console.error('Error:', err);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to delete this invitation?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/admin/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Invitation deleted successfully');
        fetchPendingInvitations();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete invitation');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('An error occurred while deleting invitation');
      console.error('Error:', err);
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <Badge bg="danger">Program Chair</Badge>;
    } else {
      return <Badge bg="warning" text="dark">Adviser</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt) => {
    const now = Date.now();
    const expireTime = Number(expiresAt);
    const diff = expireTime - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="warning" />
        <p className="mt-2">Loading invitations...</p>
      </div>
    );
  }

  return (
    <Card className="mb-4 shadow-sm border-3 border-dark">
      <Card.Header className="bg-white border-bottom border-warning border-3">
        <h3 className="mb-0">📋 Pending Faculty Invitations</h3>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>✅ {success}</Alert>}

        {invitations.length === 0 ? (
          <div className="text-center py-5 bg-light rounded border-2 border-dashed">
            <p className="text-muted mb-0">
              ✓ No pending invitations. All faculty members have been invited!
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-light">
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Sent By</th>
                  <th>Time Remaining</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td><strong>{invitation.email}</strong></td>
                    <td>{getRoleBadge(invitation.role)}</td>
                    <td className="text-muted">{invitation.invitedByName || 'Unknown'}</td>
                    <td className="text-muted">{getTimeRemaining(invitation.invitationExpires)}</td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center flex-wrap">
                        <Button
                          onClick={() => handleResendInvitation(invitation.id)}
                          variant="warning"
                          size="sm"
                          className="text-dark fw-semibold"
                          title="Resend the invitation email"
                        >
                          🔄 Resend
                        </Button>
                        <Button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          variant="danger"
                          size="sm"
                          className="fw-semibold"
                          title="Delete the invitation"
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PendingInvitations;
