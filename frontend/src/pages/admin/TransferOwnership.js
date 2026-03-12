import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Container, ListGroup, Modal, Spinner } from 'react-bootstrap';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const TransferOwnership = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAdviser, setSelectedAdviser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const advisers = useMemo(() => users.filter((user) => user.role === 'adviser'), [users]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/users');
        setUsers(response.data.users || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load adviser list.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleConfirmTransfer = async () => {
    if (!selectedAdviser) return;

    try {
      setSubmitting(true);
      setError('');
      await api.patch('/auth/transfer-ownership', { targetUserId: selectedAdviser.id });
      setSelectedAdviser(null);
      await logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transfer ownership.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: '850px' }}>
      <Card className="shadow-sm">
        <Card.Body>
          <h2 className="mb-3">Transfer Program Chair Ownership</h2>
          <Alert variant="warning">
            This will permanently transfer Program Chair access to the selected adviser. You will become a Student Adviser.
          </Alert>

          {error && <Alert variant="danger">{error}</Alert>}

          {loading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner size="sm" animation="border" />
              <span>Loading advisers...</span>
            </div>
          ) : advisers.length === 0 ? (
            <Alert variant="info" className="mb-0">No advisers available for transfer.</Alert>
          ) : (
            <ListGroup>
              {advisers.map((adviser) => (
                <ListGroup.Item key={adviser.id} className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{adviser.firstName} {adviser.lastName}</div>
                    <div className="text-muted small">{adviser.email}</div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => setSelectedAdviser(adviser)}
                    disabled={submitting}
                  >
                    Transfer Ownership
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!selectedAdviser} onHide={() => setSelectedAdviser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Ownership Transfer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            Transfer Program Chair role to <strong>{selectedAdviser?.firstName} {selectedAdviser?.lastName}</strong>?
          </p>
          <p className="mb-0 text-muted">You will immediately lose admin access and be logged out.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedAdviser(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmTransfer} disabled={submitting}>
            {submitting ? 'Transferring...' : 'Confirm Transfer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TransferOwnership;
