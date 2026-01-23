import React, { useState, useEffect } from 'react';

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
    const badgeStyle = {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    };

    if (role === 'admin') {
      return (
        <span style={{ ...badgeStyle, backgroundColor: '#dc3545', color: '#fff' }}>
          Program Chair
        </span>
      );
    } else {
      return (
        <span style={{ ...badgeStyle, backgroundColor: '#FFC107', color: '#000' }}>
          Adviser
        </span>
      );
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
    return <div className="loading">Loading invitations...</div>;
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '25px',
      borderRadius: '8px',
      border: '3px solid #000',
      marginBottom: '30px'
    }}>
      <h3 style={{
        color: '#000',
        marginBottom: '20px',
        borderBottom: '3px solid #FFC107',
        paddingBottom: '10px'
      }}>
        📋 Pending Faculty Invitations
      </h3>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px 20px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '2px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px 20px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '2px solid #c3e6cb'
        }}>
          ✅ {success}
        </div>
      )}

      {invitations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '2px dashed #ccc'
        }}>
          <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
            ✓ No pending invitations. All faculty members have been invited!
          </p>
        </div>
      ) : (
        <div style={{
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #000'
              }}>
                <th style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#000',
                  borderRight: '1px solid #ddd'
                }}>
                  Email
                </th>
                <th style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#000',
                  borderRight: '1px solid #ddd'
                }}>
                  Role
                </th>
                <th style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#000',
                  borderRight: '1px solid #ddd'
                }}>
                  Sent By
                </th>
                <th style={{
                  padding: '15px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#000',
                  borderRight: '1px solid #ddd'
                }}>
                  Time Remaining
                </th>
                <th style={{
                  padding: '15px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#000'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id} style={{
                  borderBottom: '1px solid #ddd'
                }}>
                  <td style={{
                    padding: '15px',
                    borderRight: '1px solid #ddd'
                  }}>
                    <strong>{invitation.email}</strong>
                  </td>
                  <td style={{
                    padding: '15px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getRoleBadge(invitation.role)}
                  </td>
                  <td style={{
                    padding: '15px',
                    borderRight: '1px solid #ddd',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    {invitation.invitedByName || 'Unknown'}
                  </td>
                  <td style={{
                    padding: '15px',
                    borderRight: '1px solid #ddd',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    {getTimeRemaining(invitation.invitationExpires)}
                  </td>
                  <td style={{
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <button
                      onClick={() => handleResendInvitation(invitation.id)}
                      style={{
                        padding: '8px 12px',
                        marginRight: '8px',
                        backgroundColor: '#FFC107',
                        color: '#000',
                        border: '2px solid #000',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#FFD700';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#FFC107';
                        e.target.style.transform = 'scale(1)';
                      }}
                      title="Resend the invitation email"
                    >
                      🔄 Resend
                    </button>
                    <button
                      onClick={() => handleDeleteInvitation(invitation.id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: '2px solid #000',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#c82333';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#dc3545';
                        e.target.style.transform = 'scale(1)';
                      }}
                      title="Delete the invitation"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingInvitations;
