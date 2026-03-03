import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Card, Form, Button, Alert, Spinner, Table, Badge, Row, Col
} from 'react-bootstrap';
import api from '../utils/api';

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const termOptions = ['1st Semester', '2nd Semester', 'Summer'];

// Auto-generate academic year options from ~10 years ago to current year
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 12 }, (_, i) => {
  const start = currentYear - 10 + i;
  return `${start}-${start + 1}`;
});

const GradeEntry = () => {
  // Data lists
  const [curriculums, setCurriculums] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);     // flat list across all curriculums
  const [subjects, setSubjects] = useState([]);            // subjects shown in the table
  const [selectedCurriculum, setSelectedCurriculum] = useState('');
  const [myGrades, setMyGrades] = useState([]);

  // Per-row grade/term inputs keyed by row index
  const [gradesData, setGradesData] = useState({});
  const [proofFile, setProofFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Fetch curriculums + existing grades on mount ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [currRes, gradesRes] = await Promise.all([
        api.get('/curriculum'),
        api.get('/grades/my')
      ]);
      const currs = currRes.data.data || [];
      setCurriculums(currs);

      // Build flat subject list for the manual / irregular dropdown
      const flat = currs.flatMap(c =>
        (c.Subjects || []).map(s => ({ ...s, curriculum: c.version_year }))
      );
      setAllSubjects(flat);

      setMyGrades(gradesRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── When a curriculum is selected, populate the table ──
  const handleCurriculumChange = (currId) => {
    setSelectedCurriculum(currId);
    setGradesData({});
    if (!currId) { setSubjects([]); return; }
    const curr = curriculums.find(c => c.id === Number(currId));
    const subs = (curr?.Subjects || []).map(s => ({
      ...s,
      isManual: false        // comes from the curriculum
    }));
    setSubjects(subs);
  };

  // ── Update a grade/term input for a row ──
  const updateRow = (idx, field, value) => {
    setGradesData(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value }
    }));
  };

  // ── Add a blank "irregular / manual" row ──
  const addManualRow = () => {
    setSubjects(prev => [
      ...prev,
      { id: null, course_code: '', title: '', units: '', seasonal_term: '', isManual: true }
    ]);
  };

  // ── When user picks a subject from the dropdown in a manual row ──
  const handleManualSubjectSelect = (idx, subjectId) => {
    if (!subjectId) return;
    const found = allSubjects.find(s => s.id === Number(subjectId));
    if (!found) return;
    setSubjects(prev => {
      const copy = [...prev];
      copy[idx] = { ...found, isManual: true };
      return copy;
    });
    // Also store the subject_id in gradesData
    updateRow(idx, 'subject_id', found.id);
  };

  // ── Submit bulk grades ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Build filtered grades array — only rows with a grade_value filled in
    const filtered = [];
    for (let idx = 0; idx < subjects.length; idx++) {
      const s = subjects[idx];
      const row = gradesData[idx];
      if (!row || !row.grade_value) continue;

      if (!row.term || !row.year) {
        return setError('Please select both Term and Year for every row that has a grade.');
      }

      filtered.push({
        subject_id: s.isManual ? (row.subject_id || s.id) : s.id,
        grade_value: row.grade_value,
        term_taken: `${row.term} ${row.year}`
      });
    }

    if (filtered.length === 0) {
      return setError('Please enter at least one grade before submitting.');
    }

    if (!proofFile) {
      return setError('Please attach a proof document.');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('proof', proofFile);
      formData.append('grades', JSON.stringify(filtered));

      await api.post('/grades/manual', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(`${filtered.length} grade(s) submitted for verification!`);
      setGradesData({});
      setProofFile(null);
      if (document.getElementById('proofInput')) {
        document.getElementById('proofInput').value = '';
      }
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

      {/* ── Bulk Submission Form ── */}
      <Card className="mb-4">
        <Card.Header className="bg-warning text-dark fw-bold">Submit Historical Grades</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {/* Curriculum selector */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Select Curriculum</Form.Label>
                  <Form.Select
                    value={selectedCurriculum}
                    onChange={e => handleCurriculumChange(e.target.value)}
                  >
                    <option value="">— Choose a curriculum —</option>
                    {curriculums.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.version_year} {c.active_status ? '(Active)' : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Proof Document (image or PDF)</Form.Label>
                  <Form.Control
                    id="proofInput"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => setProofFile(e.target.files[0])}
                  />
                  <Form.Text className="text-muted">Single file shared across all grades. Max 5 MB.</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Subjects table */}
            {subjects.length > 0 && (
              <Table bordered hover responsive size="sm" className="mb-3">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: '20%' }}>Subject Code</th>
                    <th>Title</th>
                    <th style={{ width: '8%' }}>Units</th>
                    <th style={{ width: '14%' }}>Term</th>
                    <th style={{ width: '18%' }}>Grade</th>
                    <th style={{ width: '28%' }}>Term Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, idx) => (
                    <tr key={idx}>
                      {/* Subject code — dropdown for manual rows */}
                      <td>
                        {s.isManual && !s.id ? (
                          <Form.Select
                            size="sm"
                            value=""
                            onChange={e => handleManualSubjectSelect(idx, e.target.value)}
                          >
                            <option value="">Select subject…</option>
                            {allSubjects.map(as => (
                              <option key={as.id} value={as.id}>
                                {as.course_code} ({as.curriculum})
                              </option>
                            ))}
                          </Form.Select>
                        ) : (
                          <span className={s.isManual ? 'text-info fw-bold' : ''}>
                            {s.course_code}
                          </span>
                        )}
                      </td>
                      <td>{s.title}</td>
                      <td className="text-center">{s.units}</td>
                      <td>{s.seasonal_term}</td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          step="0.01"
                          min="0"
                          max="5"
                          placeholder="e.g. 1.25"
                          value={gradesData[idx]?.grade_value || ''}
                          onChange={e => updateRow(idx, 'grade_value', e.target.value)}
                        />
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Form.Select
                            size="sm"
                            value={gradesData[idx]?.term || ''}
                            onChange={e => updateRow(idx, 'term', e.target.value)}
                          >
                            <option value="" disabled>Term</option>
                            {termOptions.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </Form.Select>
                          <Form.Select
                            size="sm"
                            value={gradesData[idx]?.year || ''}
                            onChange={e => updateRow(idx, 'year', e.target.value)}
                          >
                            <option value="" disabled>Year</option>
                            {yearOptions.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </Form.Select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            {/* Add irregular subject button */}
            {selectedCurriculum && (
              <Button
                variant="outline-info"
                size="sm"
                className="mb-3"
                onClick={addManualRow}
              >
                + Add Subject Manually
              </Button>
            )}

            {/* Submit */}
            {subjects.length > 0 && (
              <div className="d-grid">
                <Button type="submit" variant="warning" size="lg" disabled={submitting}>
                  {submitting
                    ? <><Spinner size="sm" animation="border" className="me-2" />Submitting…</>
                    : 'Submit Grades'}
                </Button>
              </div>
            )}
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
