import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Alert, Badge, Spinner, Form } from 'react-bootstrap';
import api from '../utils/api';
import InviteFaculty from '../components/InviteFaculty';
import PendingInvitations from '../components/PendingInvitations';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const advisers = users.filter((u) => u.role === 'adviser');

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const response = await api.patch(`/users/${userId}/toggle-status`);
      setSuccess(response.data.message);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await api.delete(`/users/${userId}`);
      setSuccess(response.data.message);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAssignAdviser = async (studentId, adviserId) => {
    try {
      const payload = {
        adviserId: adviserId === '' ? null : Number(adviserId)
      };

      const response = await api.put(`/users/${studentId}/assign-adviser`, payload);
      setSuccess(response.data.message || 'Adviser assignment updated');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign adviser');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3">Loading users...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">Manage Users</h1>
      
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <InviteFaculty />
      <PendingInvitations />

      <div className="table-responsive">
        <Table striped bordered hover className="shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Assigned Adviser</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{`${user.firstName} ${user.lastName}`}</td>
                <td>{user.email}</td>
                <td>
                  <Badge bg={user.role === 'admin' ? 'danger' : user.role === 'adviser' ? 'warning' : 'primary'}>
                    {user.role}
                  </Badge>
                </td>
                <td>
                  {user.role === 'student' ? (
                    <Form.Select
                      size="sm"
                      value={user.adviserId || ''}
                      onChange={(e) => handleAssignAdviser(user.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {advisers.map((adviser) => (
                        <option key={adviser.id} value={adviser.id}>
                          {`${adviser.firstName} ${adviser.lastName} (${adviser.email})`}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <span className="text-muted">N/A</span>
                  )}
                </td>
                <td>
                  <Badge bg={user.isActive ? 'success' : 'danger'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : 'Never'}
                </td>
                <td>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleToggleStatus(user.id)}
                      variant={user.isActive ? 'warning' : 'success'}
                      size="sm"
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      onClick={() => handleDeleteUser(user.id)}
                      variant="danger"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {users.length === 0 && (
          <p className="text-center text-muted py-4">
            No users found
          </p>
        )}
      </div>
    </Container>
  );
};

export default ManageUsers;
