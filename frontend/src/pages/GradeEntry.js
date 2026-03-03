import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Card, Form, Button, Alert, Spinner, Table, Badge
} from 'react-bootstrap';
import api from '../utils/api';

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const GradeEntry = () => {
  const [subjects, setSubjects] = useState([]);
  const [myGrades, setMyGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [SubjectId, setSubjectId] = useState('');
  const [grade_value, setGradeValue] = useState('');
  const [term_taken, setTermTaken] = useState('');
  const [proofFile, setProofFile] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [currRes, gradesRes] = await Promise.all([
        api.get('/curriculum'),
        api.get('/grades/my')
      ]);
      // Flatten all subjects from all curriculums
      const allSubjects = (currRes.data.data || []).flatMap(c =>
        (c.Subjects || []).map(s => ({ ...s, curriculum: c.version_year }))
      );
      setSubjects(allSubjects);
      setMyGrades(gradesRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const formData = new FormData();
    formData.append('SubjectId', SubjectId);
    formData.append('grade_value', grade_value);
    formData.append('term_taken', term_taken);
    if (proofFile) formData.append('proof', proofFile);

    try {
      await api.post('/grades/manual', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Grade submitted for verification!');
      setSubjectId('');
      setGradeValue('');
      setTermTaken('');
      setProofFile(null);
      // Reset the file input
      document.getElementById('proofInput').value = '';
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
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
      <h2 className="mb-4">Grade Entry</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── Submission Form ── */}
      <Card className="mb-4">
        <Card.Header className="bg-warning text-dark fw-bold">Submit Historical Grade</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Select value={SubjectId} onChange={e => setSubjectId(e.target.value)} required>
                <option value="">Select a subject...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.course_code} — {s.title} ({s.curriculum})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Final Grade</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                max="5"
                placeholder="e.g. 1.25"
                value={grade_value}
                onChange={e => setGradeValue(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Term Taken</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. 1st Semester 2024-2025"
                value={term_taken}
                onChange={e => setTermTaken(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Proof Document (image or PDF)</Form.Label>
              <Form.Control
                id="proofInput"
                type="file"
                accept="image/*,.pdf"
                onChange={e => setProofFile(e.target.files[0])}
              />
              <Form.Text className="text-muted">Optional. Max 5MB.</Form.Text>
            </Form.Group>

            <Button type="submit" variant="warning" disabled={submitting}>
              {submitting ? <><Spinner size="sm" animation="border" className="me-2" />Submitting...</> : 'Submit Grade'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {/* ── My Grades Table ── */}
      <h4 className="mb-3">My Submitted Grades</h4>
      {myGrades.length === 0 ? (
        <p className="text-muted">No grades submitted yet.</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Course</th>
              <th>Title</th>
              <th>Grade</th>
              <th>Term</th>
              <th>Status</th>
              <th>Proof</th>
            </tr>
          </thead>
          <tbody>
            {myGrades.map(g => (
              <tr key={g.id}>
                <td>{g.Subject?.course_code}</td>
                <td>{g.Subject?.title}</td>
                <td>{g.grade_value}</td>
                <td>{g.term_taken}</td>
                <td>{statusBadge(g.status)}</td>
                <td>
                  {g.ProofDocument ? (
                    <a href={`${API_BASE}/${g.ProofDocument.file_path}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default GradeEntry;
