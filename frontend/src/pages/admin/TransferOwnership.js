import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Container, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';
import api from '../../utils/api';
import AdminLayout from '../../components/admin/AdminLayout';
import PaginationControls from '../../components/PaginationControls';
import useDebouncedValue from '../../utils/useDebouncedValue';

const TransferOwnership = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAdviser, setSelectedAdviser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 12,
    search: '',
    sortBy: 'lastName',
    sortOrder: 'asc',
  });
  const [meta, setMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
  const { page, pageSize, search, sortBy, sortOrder } = query;
  const debouncedSearch = useDebouncedValue(search, 350);

  const advisers = useMemo(() => users, [users]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/users', {
          params: {
            page,
            pageSize,
            search: debouncedSearch,
            sortBy,
            sortOrder,
            role: 'adviser',
          },
        });
        setUsers(response.data?.items || response.data?.users || []);
        setMeta(response.data?.meta || { page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load adviser list.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [page, pageSize, sortBy, sortOrder, debouncedSearch]);

  const handleConfirmTransfer = async () => {
    if (!selectedAdviser) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await api.patch('/auth/transfer-ownership', { targetUserId: selectedAdviser.id });
      setUsers((current) => current.filter((user) => user.id !== selectedAdviser.id));
      setSuccess(
        `${selectedAdviser.firstName} ${selectedAdviser.lastName} is now a Program Chair.`,
      );
      setSelectedAdviser(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transfer ownership.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout activePage="transfer" pageTitle="Transfer Ownership">
      <Container className="py-4" style={{ maxWidth: '850px' }}>
        <Card className="shadow-sm">
          <Card.Body>
            <h2 className="mb-3">Transfer Program Chair Ownership</h2>
            <Alert variant="info">
              Only Super Admin can promote an assigned adviser to Program Chair. The selected
              adviser keeps their program scope, and your Super Admin access is unchanged.
            </Alert>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {loading ? (
              <div className="d-flex align-items-center gap-2 text-muted">
                <Spinner size="sm" animation="border" />
                <span>Loading advisers...</span>
              </div>
            ) : advisers.length === 0 ? (
              <Alert variant="info" className="mb-0">
                No advisers available for transfer.
              </Alert>
            ) : (
              <>
                <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                  <Form.Control
                    placeholder="Search advisers"
                    value={query.search}
                    onChange={(event) =>
                      setQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))
                    }
                  />
                  <Form.Select
                    value={query.sortBy}
                    onChange={(event) =>
                      setQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))
                    }
                    style={{ maxWidth: 220 }}
                  >
                    <option value="lastName">Sort by Last Name</option>
                    <option value="firstName">Sort by First Name</option>
                    <option value="email">Sort by Email</option>
                    <option value="createdAt">Sort by Created Date</option>
                  </Form.Select>
                  <Form.Select
                    value={query.sortOrder}
                    onChange={(event) =>
                      setQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))
                    }
                    style={{ maxWidth: 180 }}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </Form.Select>
                </div>

                <ListGroup>
                  {advisers.map((adviser) => (
                    <ListGroup.Item
                      key={adviser.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-semibold">
                          {adviser.firstName} {adviser.lastName}
                        </div>
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

                <PaginationControls
                  page={meta.page}
                  totalPages={meta.totalPages}
                  pageSize={meta.pageSize}
                  onPageChange={(nextPage) => setQuery((prev) => ({ ...prev, page: nextPage }))}
                  onPageSizeChange={(nextSize) =>
                    setQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))
                  }
                />
              </>
            )}
          </Card.Body>
        </Card>

        <Modal show={!!selectedAdviser} onHide={() => setSelectedAdviser(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Ownership Transfer</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-2">
              Transfer Program Chair role to{' '}
              <strong>
                {selectedAdviser?.firstName} {selectedAdviser?.lastName}
              </strong>
              ?
            </p>
            <p className="mb-0 text-muted">
              This promotes the selected adviser within their assigned program scope. Your Super
              Admin account will remain unchanged.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setSelectedAdviser(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmTransfer} disabled={submitting}>
              {submitting ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </AdminLayout>
  );
};

export default TransferOwnership;
