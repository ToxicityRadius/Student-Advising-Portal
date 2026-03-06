import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Form, Button, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CurrentSemester = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();

  const [allGrades, setAllGrades] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState({}); // { gradeId: { prelim_grade, midterm_grade } }
  const [saving, setSaving] = useState(null);

  // Plan B modal state
  const [showPlanB, setShowPlanB] = useState(false);
  const [planBData, setPlanBData] = useState(null);
  const [planBLoading, setPlanBLoading] = useState(false);

  // Enrollment modal state
  const [showEnroll, setShowEnroll] = useState(false);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [enrolling, setEnrolling] = useState(false);

  // Study plan state for enrollment lock
  const [studyPlan, setStudyPlan] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [planLoading, setPlanLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [gradesRes, termRes] = await Promise.all([
        api.get('/grades/my'),
        api.get('/terms/active')
      ]);
      setAllGrades(gradesRes.data.data || []);
      setActiveTerm(termRes.data.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlan = useCallback(async () => {
    try {
      setPlanLoading(true);
      const res = await api.get('/advising/my-plan');
      setStudyPlan(res.data.data || null);
    } catch {
      setStudyPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); fetchPlan(); }, [fetchData, fetchPlan]);

  // Only show grades for the active term
  const grades = activeTerm
    ? allGrades.filter(g => g.term_taken === activeTerm.term_name)
    : [];

  // ── Exam date notifications ──
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const prelimPast = activeTerm?.prelim_exam_date && new Date(activeTerm.prelim_exam_date) < now;
  const midtermPast = activeTerm?.midterm_exam_date && new Date(activeTerm.midterm_exam_date) < now;

  const handleEditChange = (gradeId, field, value) => {
    setEditing(prev => ({
      ...prev,
      [gradeId]: { ...prev[gradeId], [field]: value }
    }));
  };

  const handleUpdate = async (gradeId) => {
    const edits = editing[gradeId];
    if (!edits || (edits.prelim_grade === undefined && edits.midterm_grade === undefined && edits.final_grade === undefined)) return;

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
      if (Object.prototype.hasOwnProperty.call(edits, 'final_grade')) {
        payload.final_grade = edits.final_grade === '' ? null : edits.final_grade;
      }

      await api.put(`/grades/current/${gradeId}`, payload);
      setSuccess('Grade updated successfully');
      setEditing(prev => { const copy = { ...prev }; delete copy[gradeId]; return copy; });
      fetchData();
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

  // ── Enrollment helpers ──
  const planApproved = studyPlan && studyPlan.status === 'approved';

  const openEnrollModal = async () => {
    setShowEnroll(true);
    setSelectedSubjects([]);
    try {
      const response = await api.get('/grades/enroll/eligible');
      setCurriculumSubjects(response.data.data || []);
    } catch {
      setCurriculumSubjects([]);
    }
  };

  const toggleSubjectSelection = (id) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleEnroll = async () => {
    if (selectedSubjects.length === 0) return;
    setEnrolling(true);
    setError('');
    try {
      const res = await api.post('/grades/enroll', { subjectIds: selectedSubjects });
      setSuccess(res.data.message || 'Enrolled successfully');
      setShowEnroll(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const statusBadge = (grade) => {
    if (grade.status === 'failed') return <Badge bg="danger">Failed</Badge>;
    if (grade.status === 'passed') return <Badge bg="success">Passed</Badge>;
    if (grade.risk_status === 'at_risk') return <Badge bg="warning" text="dark">At Risk</Badge>;
    return <Badge bg="info">In Progress</Badge>;
  };

  if (loading) {
    return <Container className="text-center mt-5"><Spinner animation="border" variant="warning" /></Container>;
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        Current Semester Grades
        {activeTerm && <small className="text-muted ms-2">({activeTerm.term_name})</small>}
      </h2>

      {/* ── Exam date notifications ── */}
      {prelimPast && (
        <Alert variant="danger">
          Prelim exams have concluded! Please input your grades immediately to update your risk status.
        </Alert>
      )}
      {midtermPast && (
        <Alert variant="danger">
          Midterm exams have concluded! Please input your grades immediately to update your risk status.
        </Alert>
      )}

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {!activeTerm && (
        <Alert variant="warning">No active academic term is set. Please ask an admin to configure one.</Alert>
      )}

      {activeTerm && !planApproved && (
        <Alert variant="warning" className="fw-semibold">
          Strict Flow: You must generate a Study Plan and have it Approved by your Adviser before you can enroll in current subjects.
        </Alert>
      )}

      {activeTerm && planApproved && (
        <Button variant="warning" className="mb-3" onClick={openEnrollModal}>
          Enroll in Current Subjects
        </Button>
      )}

      {grades.length === 0 ? (
        <p className="text-muted">No grades found for the active term. Enroll in subjects to get started.</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Title</th>
              <th>Prelim Grade</th>
              <th>Midterm Grade</th>
              <th>Final</th>
              <th>Status</th>
              <th style={{ width: '320px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {grades.map(g => {
              const isPending = g.status === 'pending';
              return (
              <tr key={g.id}>
                <td>
                  {g.Subject?.course_code}
                  {isPending && <Badge bg="warning" text="dark" className="ms-2">Awaiting Adviser Approval</Badge>}
                </td>
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
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    size="sm"
                    style={{ width: '100px' }}
                    placeholder={g.final_grade ?? '—'}
                    value={editing[g.id]?.final_grade ?? ''}
                    onChange={e => handleEditChange(g.id, 'final_grade', e.target.value)}
                  />
                </td>
                <td>{statusBadge(g)}</td>
                <td>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-warning"
                      disabled={saving === g.id || !editing[g.id]}
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
              );
            })}
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

      {/* ── Enrollment Modal ── */}
      <Modal show={showEnroll} onHide={() => setShowEnroll(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Enroll in Current Subjects</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {curriculumSubjects.length === 0 ? (
            <p className="text-muted">No available subjects to enroll in, or all curriculum subjects are already enrolled.</p>
          ) : (
            [1, 2, 3, 4].map(yearLvl => {
              const yearSubs = curriculumSubjects.filter(s => s.year_level === yearLvl);
              if (yearSubs.length === 0) return null;
              return (
                <div key={yearLvl} className="mb-3">
                  <h6 className="fw-bold text-warning">Year {yearLvl}</h6>
                  <Table striped bordered size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Course Code</th>
                        <th>Title</th>
                        <th>Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearSubs.map(s => (
                        <tr key={s.id}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedSubjects.includes(s.id)}
                              onChange={() => toggleSubjectSelection(s.id)}
                            />
                          </td>
                          <td>{s.course_code}</td>
                          <td>{s.title}</td>
                          <td>{s.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              );
            })
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEnroll(false)}>Cancel</Button>
          <Button
            variant="warning"
            disabled={enrolling || selectedSubjects.length === 0}
            onClick={handleEnroll}
          >
            {enrolling ? <Spinner size="sm" animation="border" /> : `Enroll (${selectedSubjects.length})`}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CurrentSemester;
