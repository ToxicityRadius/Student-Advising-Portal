import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Table, Button, Alert, Spinner, Badge, Row, Col, Card, Image, Tabs, Tab, Modal, Form
} from 'react-bootstrap';
import api from '../utils/api';

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ── Helper: group raw grades array by student ──
function groupByStudent(grades) {
  const map = {};
  for (const g of grades) {
    const key = g.User?.id || 'unknown';
    if (!map[key]) {
      map[key] = {
        userId: g.User?.id,
        studentId: g.User?.studentId || '—',
        name: g.User ? `${g.User.firstName} ${g.User.lastName}` : '—',
        proofPath: g.ProofDocument?.file_path || null,
        grades: []
      };
    }
    // Use the first available proof across the group
    if (!map[key].proofPath && g.ProofDocument?.file_path) {
      map[key].proofPath = g.ProofDocument.file_path;
    }
    map[key].grades.push(g);
  }
  return Object.values(map);
}

const AdviserDashboard = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedStudent, setSelectedStudent] = useState(null);

  // Active term + enrollment requests
  const [activeTerm, setActiveTerm] = useState(null);

  // Pending study plans
  const [pendingPlans, setPendingPlans] = useState([]);
  const [reviewPlan, setReviewPlan] = useState(null); // plan currently being reviewed in modal

  // Curriculum subjects for the modify-plan feature
  const [allSubjects, setAllSubjects] = useState([]);
  // Draft local state: array of { SubjectId, target_term, Subject } objects
  const [draftSubjects, setDraftSubjects] = useState([]);
  // Currently selected subject in the "Add" dropdown
  const [addSubjectId, setAddSubjectId] = useState('');
  // Currently selected term for newly added subjects
  const [addTerm, setAddTerm] = useState('');

  // ── Fetch pending grades + active term + pending plans + subjects ──
  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const [gradesRes, termRes, plansRes, subsRes] = await Promise.all([
        api.get('/grades/pending'),
        api.get('/terms/active'),
        api.get('/advising/pending'),
        api.get('/curriculum/subjects')
      ]);
      setGrades(gradesRes.data.data || []);
      setActiveTerm(termRes.data.data || null);
      setPendingPlans(plansRes.data.data || []);
      setAllSubjects(subsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending grades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // Separate historical grades (have grade_value) from enrollment requests (grade_value is null + active term)
  const enrollmentRequests = activeTerm
    ? grades.filter(g => g.grade_value === null && g.term_taken === activeTerm.term_name)
    : [];
  const historicalGrades = grades.filter(g => g.grade_value !== null);

  const grouped = groupByStudent(historicalGrades);
  const enrollmentGrouped = groupByStudent(enrollmentRequests);

  // ── Bulk verify all grades for the selected student ──
  const handleBulkVerify = async (status) => {
    if (!selectedStudent) return;
    setError('');
    setSuccess('');
    setActing(true);
    try {
      await Promise.all(
        selectedStudent.grades.map(g =>
          api.patch(`/grades/${g.id}/verify`, { status })
        )
      );
      setSuccess(`All grades ${status} successfully for ${selectedStudent.name}.`);
      setSelectedStudent(null);
      await fetchPending();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk action failed');
    } finally {
      setActing(false);
    }
  };

  // ── Single grade verify (from detail view) ──
  const handleSingleVerify = async (id, status) => {
    setError('');
    setSuccess('');
    setActing(true);
    try {
      await api.patch(`/grades/${id}/verify`, { status });
      setSuccess(`Grade ${status} successfully.`);
      // Update local state
      const remaining = selectedStudent.grades.filter(g => g.id !== id);
      if (remaining.length === 0) {
        setSelectedStudent(null);
      } else {
        setSelectedStudent({ ...selectedStudent, grades: remaining });
      }
      await fetchPending();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <Container className="text-center mt-5"><Spinner animation="border" variant="warning" /></Container>;
  }

  // ── DETAIL VIEW ──
  if (selectedStudent) {
    const proofUrl = selectedStudent.proofPath
      ? `${API_BASE}/${selectedStudent.proofPath}`
      : null;
    const isPdf = selectedStudent.proofPath?.toLowerCase().endsWith('.pdf');

    return (
      <Container className="py-4">
        <Button variant="outline-secondary" className="mb-3" onClick={() => setSelectedStudent(null)}>
          ← Back to List
        </Button>

        <h3 className="mb-4">
          Reviewing: {selectedStudent.name}{' '}
          <Badge bg="secondary">{selectedStudent.studentId}</Badge>
        </h3>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        <Row className="mb-4">
          {/* Proof Document */}
          <Col md={5}>
            <Card>
              <Card.Header className="fw-bold">Proof Document</Card.Header>
              <Card.Body className="text-center">
                {proofUrl ? (
                  isPdf ? (
                    <iframe
                      src={proofUrl}
                      title="Proof PDF"
                      style={{ width: '100%', height: '450px', border: 'none' }}
                    />
                  ) : (
                    <Image src={proofUrl} alt="Proof" fluid style={{ maxHeight: '450px' }} />
                  )
                ) : (
                  <p className="text-muted">No proof document uploaded.</p>
                )}
                {proofUrl && (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-primary btn-sm mt-2"
                  >
                    Open in New Tab
                  </a>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Grades Table */}
          <Col md={7}>
            <Card>
              <Card.Header className="fw-bold">Submitted Grades</Card.Header>
              <Card.Body>
                <Table bordered hover size="sm" responsive>
                  <thead className="table-dark">
                    <tr>
                      <th>Subject Code</th>
                      <th>Title</th>
                      <th>Grade</th>
                      <th>Term</th>
                      <th style={{ width: '150px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudent.grades.map(g => (
                      <tr key={g.id}>
                        <td>{g.Subject?.course_code}</td>
                        <td>{g.Subject?.title}</td>
                        <td><Badge bg="secondary">{g.grade_value}</Badge></td>
                        <td>{g.term_taken}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="success"
                            className="me-1"
                            disabled={acting}
                            onClick={() => handleSingleVerify(g.id, 'verified')}
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={acting}
                            onClick={() => handleSingleVerify(g.id, 'rejected')}
                          >
                            ✕
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* Bulk actions */}
                <div className="d-flex gap-2 mt-3">
                  <Button
                    variant="success"
                    disabled={acting}
                    onClick={() => handleBulkVerify('verified')}
                  >
                    {acting ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                    Approve All ({selectedStudent.grades.length})
                  </Button>
                  <Button
                    variant="danger"
                    disabled={acting}
                    onClick={() => handleBulkVerify('rejected')}
                  >
                    Reject All ({selectedStudent.grades.length})
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // ── MASTER LIST VIEW ──
  return (
    <Container className="py-4">
      <h2 className="mb-4">Adviser Dashboard</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs defaultActiveKey="enrollments" className="mb-4">
        {/* ── Current Enrollment Requests Tab ── */}
        <Tab eventKey="enrollments" title={<>Current Enrollment Requests <Badge bg="info">{enrollmentRequests.length}</Badge></>}>
          {!activeTerm ? (
            <Alert variant="warning">No active academic term is set.</Alert>
          ) : enrollmentGrouped.length === 0 ? (
            <Alert variant="info">No pending enrollment requests for {activeTerm.term_name}.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead className="table-dark">
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Subjects Requested</th>
                  <th style={{ width: '180px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentGrouped.map(s => (
                  <tr key={s.userId}>
                    <td>{s.studentId}</td>
                    <td>{s.name}</td>
                    <td>
                      {s.grades.map(g => (
                        <div key={g.id} className="d-flex align-items-center justify-content-between mb-1">
                          <span>
                            <Badge bg="secondary" className="me-1">{g.Subject?.course_code}</Badge>
                            {g.Subject?.title}
                          </span>
                          <div className="d-flex gap-1 ms-2">
                            <Button
                              size="sm"
                              variant="success"
                              disabled={acting}
                              onClick={async () => {
                                setActing(true);
                                setError('');
                                try {
                                  await api.patch(`/grades/${g.id}/verify`, { status: 'verified' });
                                  setSuccess(`Enrollment approved: ${g.Subject?.course_code}`);
                                  await fetchPending();
                                } catch (err) {
                                  setError(err.response?.data?.message || 'Approve failed');
                                } finally {
                                  setActing(false);
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={acting}
                              onClick={async () => {
                                setActing(true);
                                setError('');
                                try {
                                  await api.patch(`/grades/${g.id}/verify`, { status: 'rejected' });
                                  setSuccess(`Enrollment rejected: ${g.Subject?.course_code}`);
                                  await fetchPending();
                                } catch (err) {
                                  setError(err.response?.data?.message || 'Reject failed');
                                } finally {
                                  setActing(false);
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={acting}
                        onClick={async () => {
                          setActing(true);
                          setError('');
                          try {
                            await Promise.all(
                              s.grades.map(g => api.patch(`/grades/${g.id}/verify`, { status: 'verified' }))
                            );
                            setSuccess(`All enrollments approved for ${s.name}`);
                            await fetchPending();
                          } catch (err) {
                            setError(err.response?.data?.message || 'Bulk approve failed');
                          } finally {
                            setActing(false);
                          }
                        }}
                      >
                        {acting ? <Spinner size="sm" animation="border" /> : `Approve All (${s.grades.length})`}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tab>

        {/* ── Historical Grade Verifications Tab ── */}
        <Tab eventKey="historical" title={<>Historical Grade Verifications <Badge bg="warning" text="dark">{historicalGrades.length}</Badge></>}>
          {grouped.length === 0 ? (
            <Alert variant="info">No pending historical grades to review.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead className="table-dark">
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Pending Grades</th>
                  <th style={{ width: '180px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(s => (
                  <tr key={s.userId}>
                    <td>{s.studentId}</td>
                    <td>{s.name}</td>
                    <td>
                      <Badge bg="warning" text="dark">{s.grades.length}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setSelectedStudent(s)}
                      >
                        Review Submission
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tab>

        {/* ── Pending Study Plans Tab ── */}
        <Tab eventKey="studyplans" title={<>Pending Study Plans <Badge bg="primary">{pendingPlans.length}</Badge></>}>
          {pendingPlans.length === 0 ? (
            <Alert variant="info">No pending study plans to review.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead className="table-dark">
                <tr>
                  <th>Plan ID</th>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Subjects</th>
                  <th style={{ width: '180px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingPlans.map(p => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>{p.User?.studentId || '—'}</td>
                    <td>{p.User ? `${p.User.firstName} ${p.User.lastName}` : '—'}</td>
                    <td><Badge bg="info">{(p.PlanSubjects || []).length}</Badge></td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setReviewPlan(p);
                          const nonHistorical = (p.PlanSubjects || []).filter(ps => !ps.is_historical);
                          setDraftSubjects(nonHistorical.map(ps => ({
                            SubjectId: ps.SubjectId,
                            target_term: ps.target_term,
                            Subject: ps.Subject
                          })));
                          setAddSubjectId('');
                          setAddTerm('');
                        }}
                      >
                        Review Plan
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tab>
      </Tabs>

      {/* ── Study Plan Review Modal ── */}
      <Modal
        show={!!reviewPlan}
        onHide={() => setReviewPlan(null)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Review Study Plan #{reviewPlan?.id} — {reviewPlan?.User ? `${reviewPlan.User.firstName} ${reviewPlan.User.lastName}` : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Historical subjects (read-only) */}
          {(() => {
            const historical = (reviewPlan?.PlanSubjects || []).filter(ps => ps.is_historical);
            if (historical.length === 0) return null;
            return (
              <>
                <h6 className="text-muted mb-2">Historical (Completed) Subjects</h6>
                <Table striped bordered size="sm" className="mb-4">
                  <thead className="table-secondary">
                    <tr>
                      <th>#</th>
                      <th>Course Code</th>
                      <th>Title</th>
                      <th>Units</th>
                      <th>Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historical.map((ps, idx) => (
                      <tr key={ps.id}>
                        <td>{idx + 1}</td>
                        <td>{ps.Subject?.course_code}</td>
                        <td>{ps.Subject?.title}</td>
                        <td>{ps.Subject?.units}</td>
                        <td>{ps.target_term}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            );
          })()}

          {/* Editable projected subjects */}
          <h6 className="mb-2">Projected Subjects <Badge bg="info">{draftSubjects.length}</Badge></h6>
          {draftSubjects.length === 0 ? (
            <p className="text-muted">No projected subjects. Use the dropdowns below to add some.</p>
          ) : (
            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Course Code</th>
                  <th>Title</th>
                  <th>Units</th>
                  <th>Target Term</th>
                  <th style={{ width: '70px' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {draftSubjects.map((ds, idx) => (
                  <tr key={`${ds.SubjectId}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{ds.Subject?.course_code || '—'}</td>
                    <td>{ds.Subject?.title || '—'}</td>
                    <td>{ds.Subject?.units || '—'}</td>
                    <td><small>{ds.target_term}</small></td>
                    <td className="text-center">
                      <Button
                        size="sm"
                        variant="outline-danger"
                        title="Remove subject"
                        onClick={() => setDraftSubjects(prev => prev.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {/* Add subject + term dropdowns */}
          <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
            <Form.Select
              size="sm"
              value={addSubjectId}
              onChange={e => setAddSubjectId(e.target.value)}
              style={{ maxWidth: 350 }}
            >
              <option value="">— Select a subject —</option>
              {allSubjects
                .filter(s => !draftSubjects.some(ds => ds.SubjectId === s.id))
                .sort((a, b) => (a.year_level || 1) - (b.year_level || 1) || a.course_code.localeCompare(b.course_code))
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.course_code} — {s.title} ({s.units}u, Y{s.year_level || '?'})
                  </option>
                ))}
            </Form.Select>
            <Form.Select
              size="sm"
              value={addTerm}
              onChange={e => setAddTerm(e.target.value)}
              style={{ maxWidth: 300 }}
            >
              <option value="">— Select term —</option>
              {[...new Set((reviewPlan?.PlanSubjects || []).map(ps => ps.target_term).filter(Boolean))]
                .sort()
                .map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
            </Form.Select>
            <Button
              size="sm"
              variant="primary"
              disabled={!addSubjectId || !addTerm}
              onClick={() => {
                const subj = allSubjects.find(s => s.id === parseInt(addSubjectId, 10));
                setDraftSubjects(prev => [...prev, {
                  SubjectId: parseInt(addSubjectId, 10),
                  target_term: addTerm,
                  Subject: subj || null
                }]);
                setAddSubjectId('');
              }}
            >
              + Add
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setReviewPlan(null)}>Close</Button>
          <Button
            variant="warning"
            disabled={acting}
            onClick={async () => {
              setActing(true);
              setError('');
              try {
                const res = await api.put(`/advising/plan/${reviewPlan.id}/modify`, {
                  subjects: draftSubjects.map(ds => ({
                    SubjectId: ds.SubjectId,
                    target_term: ds.target_term
                  }))
                });
                setSuccess(`Study Plan #${reviewPlan.id} modified successfully.`);
                // Update local reviewPlan and pendingPlans with the returned data
                const updatedPlan = res.data.data;
                setReviewPlan(updatedPlan);
                const nonHist = (updatedPlan.PlanSubjects || []).filter(ps => !ps.is_historical);
                setDraftSubjects(nonHist.map(ps => ({
                  SubjectId: ps.SubjectId,
                  target_term: ps.target_term,
                  Subject: ps.Subject
                })));
                setPendingPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
              } catch (err) {
                setError(err.response?.data?.message || 'Modify failed');
              } finally {
                setActing(false);
              }
            }}
          >
            {acting ? <Spinner size="sm" animation="border" /> : 'Save Modifications'}
          </Button>
          <Button
            variant="success"
            disabled={acting}
            onClick={async () => {
              setActing(true);
              setError('');
              try {
                await api.put(`/advising/plan/${reviewPlan.id}/approve`);
                setSuccess(`Study Plan #${reviewPlan.id} approved successfully.`);
                setReviewPlan(null);
                await fetchPending();
              } catch (err) {
                setError(err.response?.data?.message || 'Approve failed');
              } finally {
                setActing(false);
              }
            }}
          >
            {acting ? <Spinner size="sm" animation="border" /> : 'Approve Plan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdviserDashboard;
