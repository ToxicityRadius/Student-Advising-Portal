import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import ActivityTimeline from '../../components/faculty/ActivityTimeline';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHelpers';
import { isSuperadmin } from '../../utils/roles';

const MetricCard = ({ label, value, detail, variant = 'warning' }) => (
  <Card className={`h-100 border-start border-${variant} border-5 shadow-sm`}>
    <Card.Body>
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-semibold fs-4">{value ?? 0}</div>
      {detail && <div className="text-muted small mt-1">{detail}</div>}
    </Card.Body>
  </Card>
);

const formatTerm = (term) => {
  if (!term) return 'No current term';
  const program = term.program?.code || term.Program?.code;
  return [term.schoolYear, term.semesterLabel, program].filter(Boolean).join(' - ');
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ variant: '', message: '' });

  const superadmin = isSuperadmin(user);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/programs')
      .then((response) => {
        if (cancelled) return;
        const nextPrograms = response.data?.data || [];
        setPrograms(nextPrograms);
        if (!superadmin && !programId && nextPrograms.length > 0) {
          setProgramId(String(nextPrograms[0].id));
        }
      })
      .catch(() => {
        if (!cancelled) setPrograms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [programId, superadmin]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const response = await api.get('/dashboard/summary', {
        params: programId ? { programId } : {},
      });
      setSummary(response.data?.data || null);
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to load dashboard summary.'),
      });
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const health = summary?.curriculumHealth || {};
  const currentTerm = summary?.termManagement?.currentTerm || summary?.currentTerm;
  const latestSnapshot = summary?.forecastSnapshotPreview;
  const selectedProgram = useMemo(
    () => programs.find((program) => String(program.id) === String(programId)) || null,
    [programId, programs],
  );

  return (
    <AdminLayout activePage="dashboard" pageTitle="Dashboard">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Operations Dashboard</h2>
          <p className="text-muted mb-0">
            {superadmin
              ? 'Global oversight across programs, users, workflows, and forecast readiness.'
              : 'Program-scoped operations for curriculum, SAR, override, and adviser workload review.'}
          </p>
        </div>
        <div className="d-flex flex-column flex-sm-row gap-2">
          <Form.Select
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
            style={{ minWidth: 230 }}
            aria-label="Dashboard program filter"
          >
            {superadmin && <option value="">All Programs</option>}
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.code} - {program.name}
              </option>
            ))}
          </Form.Select>
          <Button variant="outline-primary" onClick={loadSummary} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Row className="g-3 mb-3">
            <Col md={6} xl={3}>
              <MetricCard
                label="Current Term"
                value={currentTerm ? currentTerm.semesterLabel : 'None'}
                detail={formatTerm(currentTerm)}
                variant="warning"
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Student Records"
                value={health.totalSARs}
                detail={selectedProgram ? selectedProgram.code : 'Selected scope'}
                variant="success"
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Pending Overrides"
                value={health.pendingOverrideCount}
                detail="Requests awaiting Program Chair decision"
                variant="danger"
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Needs Revalidation"
                value={health.revalidationCount}
                detail="Active study plans marked for review"
                variant="info"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col md={6} xl={3}>
              <MetricCard
                label="Curriculums"
                value={health.totalCurriculums}
                detail={`${health.activeCurriculumCount || 0} active`}
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Courses"
                value={health.totalCourses}
                detail="Program-scoped catalog rows"
                variant="secondary"
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Equivalencies"
                value={health.totalEquivalencies}
                detail="Owned mappings in scope"
                variant="primary"
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Elective Tracks"
                value={health.totalElectiveTracks}
                detail="Configured track options"
                variant="dark"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={5}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h5 className="mb-1">Forecast Snapshot</h5>
                      <div className="text-muted small">Latest stored deterministic forecast.</div>
                    </div>
                    <Button as={Link} to="/admin/forecast" size="sm" variant="outline-primary">
                      Open
                    </Button>
                  </div>
                  {latestSnapshot ? (
                    <Row className="g-3">
                      <Col sm={6}>
                        <div className="text-muted small">Term</div>
                        <div className="fw-semibold">
                          {latestSnapshot.schoolYear} - {latestSnapshot.semesterLabel}
                        </div>
                      </Col>
                      <Col sm={6}>
                        <div className="text-muted small">Program</div>
                        <div className="fw-semibold">
                          {latestSnapshot.program?.code || latestSnapshot.Program?.code || 'All'}
                        </div>
                      </Col>
                      <Col sm={6}>
                        <div className="text-muted small">Current Demand Rows</div>
                        <div className="fw-semibold fs-5">{latestSnapshot.currentDemandCount}</div>
                      </Col>
                      <Col sm={6}>
                        <div className="text-muted small">Next Forecast Rows</div>
                        <div className="fw-semibold fs-5">
                          {latestSnapshot.nextSemesterForecastCount}
                        </div>
                      </Col>
                    </Row>
                  ) : (
                    <div className="text-muted">No forecast snapshot has been stored yet.</div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={7}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h5 className="mb-1">Quick Actions</h5>
                      <div className="text-muted small">
                        Common operations for the selected scope.
                      </div>
                    </div>
                    <Badge bg="secondary">{summary?.quickActions?.length || 0}</Badge>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {(summary?.quickActions || []).map((action) => (
                      <Button
                        key={action.key}
                        as={Link}
                        to={action.path}
                        variant="outline-dark"
                        size="sm"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3">
            <Col xl={7}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h5 className="mb-1">Adviser Workload</h5>
                      <div className="text-muted small">SARs created by adviser in this scope.</div>
                    </div>
                    <Badge bg="secondary">{summary?.adviserWorkload?.length || 0}</Badge>
                  </div>
                  <Table responsive hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Adviser</th>
                        <th>Email</th>
                        <th className="text-end">SARs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary?.adviserWorkload || []).map((row) => (
                        <tr key={row.id}>
                          <td className="fw-semibold">{row.name}</td>
                          <td>{row.email}</td>
                          <td className="text-end">{row.assignedStudents}</td>
                        </tr>
                      ))}
                      {(summary?.adviserWorkload || []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-4">
                            No adviser workload data yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col xl={5}>
              <ActivityTimeline items={summary?.recentActivity || []} />
            </Col>
          </Row>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
