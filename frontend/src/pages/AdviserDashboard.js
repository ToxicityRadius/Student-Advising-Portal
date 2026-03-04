import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Table, Button, Alert, Spinner, Badge, Row, Col, Card, Image, Tabs, Tab
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

  // ── Fetch pending grades + active term ──
  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const [gradesRes, termRes] = await Promise.all([
        api.get('/grades/pending'),
        api.get('/terms/active')
      ]);
      setGrades(gradesRes.data.data || []);
      setActiveTerm(termRes.data.data || null);
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
      </Tabs>
    </Container>
  );
};

export default AdviserDashboard;
