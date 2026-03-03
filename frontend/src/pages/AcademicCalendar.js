import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Badge,
  Spinner,
  Alert
} from 'react-bootstrap';
import api from '../utils/api';

const AcademicCalendar = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    term_name: '',
    start_date: '',
    end_date: '',
    is_active: false
  });
  const [editingId, setEditingId] = useState(null);

  // Dropdown state for term name builder
  const [selectedTerm, setSelectedTerm] = useState('1st Semester');
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const termOptions = ['1st Semester', '2nd Semester', 'Summer'];
  const yearOptions = ['2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029'];

  const fetchTerms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/terms');
      setTerms(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load terms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      const payload = editingId
        ? formData
        : { ...formData, term_name: `${selectedTerm} ${selectedYear}` };

      if (editingId) {
        await api.put(`/terms/${editingId}`, payload);
        flash('Term updated');
      } else {
        await api.post('/terms', payload);
        flash('Term created');
      }
      setShowForm(false);
      setFormData({ term_name: '', start_date: '', end_date: '', is_active: false });
      setSelectedTerm('1st Semester');
      setSelectedYear('2025-2026');
      setEditingId(null);
      fetchTerms();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editTerm = (t) => {
    setFormData({
      term_name: t.term_name,
      start_date: t.start_date,
      end_date: t.end_date,
      is_active: t.is_active
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const deleteTerm = async (id) => {
    if (!window.confirm('Delete this academic term?')) return;
    clearMessages();
    try {
      await api.delete(`/terms/${id}`);
      flash('Term deleted');
      fetchTerms();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleActive = async (id) => {
    clearMessages();
    try {
      await api.patch(`/terms/${id}/activate`);
      flash('Active term updated');
      fetchTerms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set active term');
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="warning" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Academic Calendar</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && <Alert variant="success">{success}</Alert>}

      <Button
        variant="warning"
        className="mb-3"
        onClick={() => {
          setEditingId(null);
          setFormData({ term_name: '', start_date: '', end_date: '', is_active: false });
          setShowForm(true);
        }}
      >
        + New Term
      </Button>

      {terms.length === 0 ? (
        <Card body className="text-center text-muted">
          No academic terms yet. Create one to get started.
        </Card>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Term Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th style={{ width: '260px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((t) => (
              <tr key={t.id}>
                <td>{t.term_name}</td>
                <td>{t.start_date}</td>
                <td>{t.end_date}</td>
                <td>
                  <Badge bg={t.is_active ? 'success' : 'secondary'}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td>
                  {!t.is_active && (
                    <Button
                      size="sm"
                      variant="outline-success"
                      className="me-1"
                      onClick={() => toggleActive(t.id)}
                    >
                      Set Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-1"
                    onClick={() => editTerm(t)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => deleteTerm(t.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* ── Term Form Modal ── */}
      <Modal show={showForm} onHide={() => setShowForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Term' : 'New Academic Term'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {editingId ? (
              <Form.Group className="mb-3">
                <Form.Label>Term Name</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.term_name}
                  onChange={(e) => setFormData({ ...formData, term_name: e.target.value })}
                  required
                />
              </Form.Group>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Term</Form.Label>
                  <Form.Select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                  >
                    {termOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Academic Year</Form.Label>
                  <Form.Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Check
              type="switch"
              label="Set as Active Term"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="warning" type="submit">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AcademicCalendar;
