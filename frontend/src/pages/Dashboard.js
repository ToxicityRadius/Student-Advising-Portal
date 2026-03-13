import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Image,
  ListGroup,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { buildProfileImageUrl, getInitials } from '../utils/profileImage';

const Dashboard = () => {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileReminderDismissed, setProfileReminderDismissed] = useState(
    () => sessionStorage.getItem('profileReminderDismissed') === 'true'
  );

  const profileIncomplete = user?.role === 'student' ? !user?.program : !user?.contact_number;
  const showProfileReminder = profileIncomplete && !profileReminderDismissed;
  const displayName = `${user?.firstName || user?.first_name || ''} ${user?.lastName || user?.last_name || ''}`.trim();
  const profileImageUrl = buildProfileImageUrl(user?.profile_picture);

  const handleDismissProfileReminder = () => {
    sessionStorage.setItem('profileReminderDismissed', 'true');
    setProfileReminderDismissed(true);
  };

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/dashboard/summary');
        setDashboardData(response.data?.data || null);
      } catch (requestError) {
        setDashboardData(null);
        setError(requestError?.response?.data?.message || 'Failed to load dashboard summary.');
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  const currentTermLabel = useMemo(() => {
    if (!dashboardData?.currentTerm) {
      return null;
    }

    return `${dashboardData.currentTerm.schoolYear} · ${dashboardData.currentTerm.semesterLabel || `Semester ${dashboardData.currentTerm.semester}`}`;
  }, [dashboardData]);

  const renderStudentSummary = () => {
    const studentSummary = dashboardData || {};
    const sar = studentSummary.sar;

    if (!studentSummary.sarAvailable || !sar) {
      return (
        <Card className="mb-4 border-start border-info border-5 shadow-sm">
          <Card.Body className="p-4">
            <h5 className="mb-3">Student Academic Record</h5>
            <Badge bg="secondary" className="mb-3 text-uppercase">No Student Academic Record yet</Badge>
            <p className="text-muted mb-3">
              Your adviser or Program Chair has not created your Student Academic Record yet. Please contact them for assistance.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Button as={Link} to="/profile" variant="outline-primary" size="sm">Profile Shortcut</Button>
              <Button as={Link} to="/my-record" variant="outline-secondary" size="sm">My Academic Record</Button>
            </div>
          </Card.Body>
        </Card>
      );
    }

    return (
      <Card className="mb-4 border-start border-info border-5 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="mb-0">Student Academic Record Snapshot</h5>
            <Badge bg="success" className="text-uppercase">Record Available</Badge>
          </div>

          <Row className="g-3 mb-3">
            <Col md={3}><strong>Student #:</strong> {sar.studentNumber || 'N/A'}</Col>
            <Col md={3}><strong>Year:</strong> {sar.yearLevel ? `Year ${sar.yearLevel}` : 'N/A'}</Col>
            <Col md={6}><strong>Curriculum:</strong> {sar.curriculumName || 'N/A'}</Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col md={3}>
              <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Completion</div><div className="fw-semibold">{Number(sar.kpis?.completionPercentage || 0).toFixed(2)}%</div></Card.Body></Card>
            </Col>
            <Col md={3}>
              <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Remaining Units</div><div className="fw-semibold">{sar.kpis?.remainingUnits ?? 'N/A'}</div></Card.Body></Card>
            </Col>
            <Col md={3}>
              <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">GWA</div><div className="fw-semibold">{sar.kpis?.gwa ?? 'N/A'}</div></Card.Body></Card>
            </Col>
            <Col md={3}>
              <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Prereq Risks</div><div className="fw-semibold">{sar.kpis?.prerequisiteRiskSubjects ?? 0}</div></Card.Body></Card>
            </Col>
          </Row>

          <div className="d-flex flex-wrap gap-2">
            <Button as={Link} to="/my-record" variant="primary" size="sm">Open My Academic Record</Button>
            <Button as={Link} to="/my-record" variant="outline-success" size="sm">Export Shortcut (via My Record)</Button>
            <Button as={Link} to="/profile" variant="outline-primary" size="sm">Profile Shortcut</Button>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderAdviserSummary = () => (
    <Card className="mb-4 border-start border-warning border-5 shadow-sm">
      <Card.Body className="p-4">
        <h5 className="mb-3">Adviser Summary</h5>

        <Row className="g-3 mb-3">
          <Col md={4}>
            <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Assigned Students</div><div className="fw-semibold fs-5">{dashboardData?.assignedStudents ?? 0}</div></Card.Body></Card>
          </Col>
          <Col md={4}>
            <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Students Needing Review</div><div className="fw-semibold fs-5">{dashboardData?.studentsNeedingReview ?? 0}</div></Card.Body></Card>
          </Col>
          <Col md={4}>
            <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">SARs with Prereq Risk</div><div className="fw-semibold fs-5">{dashboardData?.prerequisiteRiskCount ?? 0}</div></Card.Body></Card>
          </Col>
        </Row>

        <div className="mb-3">
          <div className="fw-semibold mb-2">Recent Assigned Students</div>
          {Array.isArray(dashboardData?.recentStudents) && dashboardData.recentStudents.length > 0 ? (
            <ListGroup>
              {dashboardData.recentStudents.map((item) => (
                <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{item.studentName}</div>
                    <div className="small text-muted">{item.studentNumber} · {item.curriculumName || 'No curriculum'} · Year {item.yearLevel || 'N/A'}</div>
                  </div>
                  <Button as={Link} to={`/adviser/students/${item.id}`} variant="outline-primary" size="sm">Open</Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <div className="text-muted">No assigned students yet.</div>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Button as={Link} to="/adviser/students" variant="primary" size="sm">Student Records</Button>
          <Button as={Link} to="/adviser/students" variant="outline-success" size="sm">Quick-Create SAR</Button>
        </div>
      </Card.Body>
    </Card>
  );

  const renderAdminSummary = () => {
    const snapshot = dashboardData?.forecastSnapshotPreview;
    const health = dashboardData?.curriculumHealth || {};
    const termManagement = dashboardData?.termManagement || {};
    const adviserWorkload = Array.isArray(dashboardData?.adviserWorkload) ? dashboardData.adviserWorkload : [];

    return (
      <>
        <Card className="mb-4 border-start border-success border-5 shadow-sm">
          <Card.Body className="p-4">
            <h5 className="mb-3">Program Chair Summary</h5>

            <Row className="g-3 mb-3">
              <Col md={4}>
                <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Forecast Snapshot Preview</div><div className="fw-semibold">{snapshot ? `${snapshot.schoolYear} · ${snapshot.semesterLabel}` : 'No snapshot yet'}</div><div className="small text-muted">Current rows: {snapshot?.currentDemandCount ?? 0} · Next rows: {snapshot?.nextSemesterForecastCount ?? 0}</div></Card.Body></Card>
              </Col>
              <Col md={4}>
                <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Curriculum Health</div><div className="fw-semibold">{health.activeCurriculumCount ?? 0}/{health.totalCurriculums ?? 0} active</div><div className="small text-muted">Courses: {health.totalCourses ?? 0} · Equivalencies: {health.totalEquivalencies ?? 0}</div></Card.Body></Card>
              </Col>
              <Col md={4}>
                <Card className="h-100"><Card.Body className="py-2"><div className="small text-muted">Term Management</div><div className="fw-semibold">{termManagement.currentTerm ? `${termManagement.currentTerm.schoolYear} · ${termManagement.currentTerm.semesterLabel}` : 'No active term'}</div><div className="small text-muted">Recent terms: {(termManagement.recentTerms || []).length}</div></Card.Body></Card>
              </Col>
            </Row>

            <div className="d-flex flex-wrap gap-2 mb-3">
              <Button as={Link} to="/admin/forecast" variant="primary" size="sm">Open Forecast Dashboard</Button>
              <Button as={Link} to="/admin/curriculum" variant="outline-primary" size="sm">Curriculum & Equivalency</Button>
              <Button as={Link} to="/admin/terms" variant="outline-success" size="sm">Term Management Actions</Button>
            </div>

            <div>
              <div className="fw-semibold mb-2">Adviser Workload Overview</div>
              {adviserWorkload.length > 0 ? (
                <Table striped bordered hover responsive size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>Adviser</th>
                      <th>Email</th>
                      <th className="text-end">Assigned Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adviserWorkload.slice(0, 8).map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.email}</td>
                        <td className="text-end fw-semibold">{item.assignedStudents}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-muted">No adviser workload data available yet.</div>
              )}
            </div>
          </Card.Body>
        </Card>
      </>
    );
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Dashboard</h1>

      {showProfileReminder && (
        <Alert variant="info" dismissible onClose={handleDismissProfileReminder} className="mb-4">
          <strong>Your profile is incomplete.</strong> Complete your profile to help your adviser and get the most out of the portal.{' '}
          <Alert.Link as={Link} to="/profile">Complete profile &rarr;</Alert.Link>
        </Alert>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4 border-start border-primary border-5 shadow-sm">
        <Card.Body className="p-4">
          <h5 className="mb-2">Current Academic Term</h5>
          {loading ? (
            <div className="d-flex align-items-center gap-2 text-muted"><Spinner animation="border" size="sm" /><span>Loading current term...</span></div>
          ) : currentTermLabel ? (
            <div className="fw-semibold fs-5">{currentTermLabel}</div>
          ) : (
            <p className="text-muted mb-0">No active term set yet.</p>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4 border-start border-warning border-5 shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            {profileImageUrl ? (
              <Image src={profileImageUrl} roundedCircle width={72} height={72} style={{ objectFit: 'cover' }} />
            ) : (
              <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style={{ width: 72, height: 72, fontWeight: 700, fontSize: '1.1rem' }}>
                {getInitials(displayName)}
              </div>
            )}
            <h2 className="mb-0" style={{ fontSize: '1.75rem' }}>Welcome, {displayName || 'User'}!</h2>
          </div>

          <Row className="g-4">
            <Col md={6}><small className="text-muted fw-semibold">Email</small><p className="mb-0 fw-medium">{user?.email}</p></Col>
            <Col md={3}><small className="text-muted fw-semibold">Role</small><div><Badge bg={user?.role === 'admin' ? 'danger' : user?.role === 'adviser' ? 'warning' : 'primary'} className="text-uppercase">{user?.role}</Badge></div></Col>
            <Col md={3}><small className="text-muted fw-semibold">Account Status</small><div><Badge bg={user?.isActive ? 'success' : 'danger'}>{user?.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge></div></Col>
          </Row>
        </Card.Body>
      </Card>

      {!loading && user?.role === 'student' && renderStudentSummary()}
      {!loading && user?.role === 'adviser' && renderAdviserSummary()}
      {!loading && user?.role === 'admin' && renderAdminSummary()}

      <Card className="shadow-sm border-3" style={{ borderColor: '#FFC107' }}>
        <Card.Header className="bg-warning fw-bold text-dark" style={{ fontSize: '1.1rem' }}>
          Quick Links (Secondary)
        </Card.Header>
        <Card.Body className="p-0">
          <ListGroup variant="flush">
            <ListGroup.Item as={Link} to="/profile" className="py-3 px-4 text-decoration-none text-dark fw-semibold" action>
              <span className="me-2">👤</span> My Profile
            </ListGroup.Item>
            {user?.role === 'admin' && (
              <>
                <ListGroup.Item as={Link} to="/admin/curriculum" className="py-3 px-4 text-decoration-none text-dark fw-semibold" action><span className="me-2">📘</span> Curriculum Management</ListGroup.Item>
                <ListGroup.Item as={Link} to="/admin/terms" className="py-3 px-4 text-decoration-none text-dark fw-semibold" action><span className="me-2">📅</span> Term Management</ListGroup.Item>
                <ListGroup.Item as={Link} to="/admin/forecast" className="py-3 px-4 text-decoration-none text-dark fw-semibold" action><span className="me-2">📈</span> Forecasting</ListGroup.Item>
                <ListGroup.Item as={Link} to="/admin/transfer-ownership" className="py-3 px-4 text-decoration-none text-dark fw-semibold" action><span className="me-2">🔐</span> Transfer Ownership</ListGroup.Item>
              </>
            )}
            {(user?.role === 'admin' || user?.role === 'adviser') && (
              <ListGroup.Item as={Link} to="/adviser/students" className="py-3 px-4 text-decoration-none text-dark fw-semibold" action><span className="me-2">🗂️</span> Student Records</ListGroup.Item>
            )}
            {user?.role === 'student' && (
              <ListGroup.Item as={Link} to="/my-record" className="py-3 px-4 text-decoration-none text-dark fw-semibold" action><span className="me-2">📄</span> My Academic Record</ListGroup.Item>
            )}
          </ListGroup>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Dashboard;