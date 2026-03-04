import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Form, Button, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import api from '../utils/api';

const CurrentSemester = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState({}); // { gradeId: { prelim_grade, midterm_grade } }
  const [saving, setSaving] = useState(null); // gradeId currently saving

  // Plan B modal state
  const [showPlanB, setShowPlanB] = useState(false);
  const [planBData, setPlanBData] = useState(null);
  const [planBLoading, setPlanBLoading] = useState(false);

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

  const handleEditChange = (gradeId, field, value) => {
    setEditing(prev => ({
      ...prev,
      [gradeId]: { ...prev[gradeId], [field]: value }
    }));
  };

  const handleUpdate = async (gradeId) => {
    const edits = editing[gradeId];
    if (!edits || (edits.prelim_grade === undefined && edits.midterm_grade === undefined)) return;

    setError('');
    setSuccess('');
    setSaving(gradeId);

    try {
      const payload = {};
      if (edits.prelim_grade !== undefined && edits.prelim_grade !== '') {
        payload.prelim_grade = parseFloat(edits.prelim_grade);
      }
      if (edits.midterm_grade !== undefined && edits.midterm_grade !== '') {
        payload.midterm_grade = parseFloat(edits.midterm_grade);
      }

      await api.put(`/grades/current/${gradeId}`, payload);
      setSuccess('Grade updated successfully');
      setEditing(prev => { const copy = { ...prev }; delete copy[gradeId]; return copy; });
      fetchGrades();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(null);
    }
  };

  const handleViewPlanB = async () => {
    setPlanBLoading(true);
    setShowPlanB(true);
    try {
      const res = await api.get('/advising/contingency');
      setPlanBData(res.data.data);
    } catch (err) {
      setPlanBData({ retake_subjects: [], warning: err.response?.data?.message || 'Failed to load Plan B' });
    } finally {
      setPlanBLoading(false);
    }
  };

  const riskBadge = (status) => {
    if (status === 'on_track') return <Badge bg="success">On Track</Badge>;
    if (status === 'at_risk') return <Badge bg="danger">At Risk</Badge>;
    return <Badge bg="secondary">Pending</Badge>;
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
              <th>Prelim Grade</th>
              <th>Midterm Grade</th>
              <th>Risk Status</th>
              <th style={{ width: '320px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {grades.map(g => (
              <tr key={g.id}>
                <td>{g.Subject?.course_code}</td>
                <td>{g.Subject?.title}</td>
                <td>
                  <Form.Control
                    type="number"
                    step="0.25"
                    min="1"
                    max="5"
                    size="sm"
                    style={{ width: '90px' }}
                    placeholder={g.prelim_grade ?? '—'}
                    value={editing[g.id]?.prelim_grade ?? ''}
                    onChange={e => handleEditChange(g.id, 'prelim_grade', e.target.value)}
                    disabled={g.status === 'verified'}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    step="0.25"
                    min="1"
                    max="5"
                    size="sm"
                    style={{ width: '90px' }}
                    placeholder={g.midterm_grade ?? '—'}
                    value={editing[g.id]?.midterm_grade ?? ''}
                    onChange={e => handleEditChange(g.id, 'midterm_grade', e.target.value)}
                    disabled={g.status === 'verified'}
                  />
                </td>
                <td>{riskBadge(g.risk_status)}</td>
                <td>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-warning"
                      disabled={saving === g.id || !editing[g.id] || g.status === 'verified'}
                      onClick={() => handleUpdate(g.id)}
                    >
                      {saving === g.id ? <Spinner size="sm" animation="border" /> : 'Save'}
                    </Button>
                    {g.risk_status === 'at_risk' && (
                      <Button size="sm" variant="outline-danger" onClick={handleViewPlanB}>
                        View Plan B
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* ── Plan B Modal ── */}
      <Modal show={showPlanB} onHide={() => setShowPlanB(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Contingency Plan B — At-Risk Subjects</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {planBLoading ? (
            <div className="text-center py-4"><Spinner animation="border" variant="danger" /></div>
          ) : planBData ? (
            <>
              <Alert variant="warning">{planBData.warning}</Alert>
              {planBData.retake_subjects.length > 0 ? (
                <Table striped bordered size="sm">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Title</th>
                      <th>Units</th>
                      <th>Prelim</th>
                      <th>Midterm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planBData.retake_subjects.map((s, i) => (
                      <tr key={i}>
                        <td>{s.course_code}</td>
                        <td>{s.title}</td>
                        <td>{s.units}</td>
                        <td>{s.prelim_grade ?? '—'}</td>
                        <td>{s.midterm_grade ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted mb-0">No subjects at risk.</p>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPlanB(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CurrentSemester;
