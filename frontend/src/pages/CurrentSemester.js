import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import api from '../utils/api';

const CurrentSemester = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState({}); // { gradeId: newValue }
  const [saving, setSaving] = useState(null); // gradeId currently saving

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/grades/my');
      setGrades(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const handleUpdate = async (gradeId) => {
    const newValue = editing[gradeId];
    if (newValue === undefined || newValue === '') return;

    setError('');
    setSuccess('');
    setSaving(gradeId);

    try {
      await api.put(`/grades/current/${gradeId}`, { grade_value: parseFloat(newValue) });
      setSuccess('Grade updated successfully');
      setEditing(prev => { const copy = { ...prev }; delete copy[gradeId]; return copy; });
      fetchGrades();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(null);
    }
  };

  const statusBadge = (status) => {
    const variant = { pending: 'warning', verified: 'success', rejected: 'danger' }[status] || 'secondary';
    return <Badge bg={variant}>{status}</Badge>;
  };

  if (loading) {
    return <Container className="text-center mt-5"><Spinner animation="border" variant="warning" /></Container>;
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Current Semester Grades</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {grades.length === 0 ? (
        <p className="text-muted">No grades found. Submit grades from the Grade Entry page first.</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Title</th>
              <th>Units</th>
              <th>Current Grade</th>
              <th>Term</th>
              <th>Status</th>
              <th style={{ width: '220px' }}>Update</th>
            </tr>
          </thead>
          <tbody>
            {grades.map(g => (
              <tr key={g.id}>
                <td>{g.Subject?.course_code}</td>
                <td>{g.Subject?.title}</td>
                <td>{g.Subject?.units}</td>
                <td>{g.grade_value}</td>
                <td>{g.term_taken}</td>
                <td>{statusBadge(g.status)}</td>
                <td>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      size="sm"
                      style={{ width: '100px' }}
                      placeholder="New"
                      value={editing[g.id] ?? ''}
                      onChange={e => setEditing(prev => ({ ...prev, [g.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline-warning"
                      disabled={saving === g.id || !editing[g.id]}
                      onClick={() => handleUpdate(g.id)}
                    >
                      {saving === g.id ? <Spinner size="sm" animation="border" /> : 'Save'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default CurrentSemester;
