import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdviserLayout from '../../components/adviser/AdviserLayout';
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

const AdviserDashboard = () => {
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
        message: getErrorMessage(error, 'Failed to load adviser dashboard.'),
      });
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <AdviserLayout activePage="dashboard" pageTitle="Dashboard">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Adviser Dashboard</h2>
          <p className="text-muted mb-0">
            Program-scoped SAR visibility with workload, review, override, and program filters.
          </p>
        </div>
        <div className="d-flex flex-column flex-sm-row gap-2">
          <Form.Select
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
            style={{ minWidth: 230 }}
            aria-label="Adviser dashboard program filter"
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
                label="Total SARs"
                value={summary?.totalSARs}
                detail={programId ? 'Filtered program records' : 'Assigned program records'}
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Assigned to Me"
                value={summary?.myAssignedStudents ?? summary?.assignedStudents}
                detail="Student users assigned to this adviser"
                variant="success"
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Created by Me"
                value={summary?.myCreatedSARs}
                detail="SARs initialized by this adviser"
                variant="primary"
              />
            </Col>
            <Col md={6} xl={3}>
              <MetricCard
                label="Pending Overrides"
                value={summary?.pendingOverrideCount}
                detail="Requests waiting for chair decision"
                variant="danger"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col md={6}>
              <MetricCard
                label="Students Needing Review"
                value={summary?.studentsNeedingReview}
                detail="Draft or revalidation-required plans"
                variant="info"
              />
            </Col>
            <Col md={6}>
              <MetricCard
                label="Prerequisite Risk"
                value={summary?.prerequisiteRiskCount}
                detail="Students with unmet prerequisite signals"
                variant="secondary"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={5}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h5 className="mb-1">Work Queues</h5>
                      <div className="text-muted small">Jump to SAR filters used most often.</div>
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
            <Col lg={7}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h5 className="mb-1">Recent Records</h5>
                      <div className="text-muted small">Newest SARs in the selected scope.</div>
                    </div>
                    <Button as={Link} to="/adviser/students" size="sm" variant="outline-primary">
                      Open SARs
                    </Button>
                  </div>
                  <Table responsive hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Student Number</th>
                        <th>Year</th>
                        <th>Curriculum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary?.recentStudents || []).map((sar) => (
                        <tr key={sar.id}>
                          <td>
                            <Link to={`/adviser/students/${sar.id}`} className="fw-semibold">
                              {sar.studentName}
                            </Link>
                          </td>
                          <td>{sar.studentNumber}</td>
                          <td>Year {sar.yearLevel}</td>
                          <td>{sar.curriculumName || 'Unassigned'}</td>
                        </tr>
                      ))}
                      {(summary?.recentStudents || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-4">
                            No recent SAR records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <ActivityTimeline items={summary?.recentActivity || []} />
        </>
      )}
    </AdviserLayout>
  );
};

export default AdviserDashboard;
