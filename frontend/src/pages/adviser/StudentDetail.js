import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, ListGroup, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Date(Number(value)).toLocaleString();
};

const StudentDetail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sarId } = useParams();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [sar, setSar] = useState(null);
  const [versions, setVersions] = useState([]);

  const isStudentView = user?.role === 'student' && !sarId;
  const canGeneratePlan = user?.role === 'adviser' || user?.role === 'admin';
  const canOpenPlanRoute = user?.role === 'adviser' || user?.role === 'admin';

  const loadSarData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      let resolvedSarId = sarId;

      if (!resolvedSarId) {
        const listResponse = await api.get('/sars');
        const ownSar = Array.isArray(listResponse.data?.data) ? listResponse.data.data[0] : null;

        if (!ownSar) {
          setSar(null);
          setVersions([]);
          return;
        }

        resolvedSarId = ownSar.id;
      }

      const [sarResponse, versionsResponse] = await Promise.all([
        api.get(`/sars/${resolvedSarId}`),
        api.get(`/sars/${resolvedSarId}/study-plan/versions`)
      ]);

      setSar(sarResponse.data?.data || null);
      setVersions(versionsResponse.data?.data || []);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load the student academic record.') });
      setSar(null);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [sarId]);

  useEffect(() => {
    loadSarData();
  }, [loadSarData]);

  const handleGenerateInitialStudyPlan = async () => {
    if (!sar?.id) {
      return;
    }

    setActionLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const response = await api.post(`/sars/${sar.id}/study-plan/generate`);
      await loadSarData();
      setAlert({ variant: 'success', message: 'Initial study plan generated successfully.' });

      if (response.data?.data?.id && canOpenPlanRoute) {
        navigate(`/adviser/students/${sar.id}/plan/${response.data.data.id}`);
      }
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to generate the initial study plan.') });
    } finally {
      setActionLoading(false);
    }
  };

  const activeVersion = versions.find((version) => version.status === 'active') || sar?.activeStudyPlanVersion || null;
  const hasStudyPlan = Boolean(sar?.StudyPlan?.id || versions.length > 0);

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">{isStudentView ? 'My Academic Record' : 'Student Academic Record'}</h2>
          <p className="text-muted mb-0">Review student profile data and available study plan versions.</p>
        </div>
        {!isStudentView && (
          <Button as={Link} to="/adviser/students" variant="outline-secondary">
            Back to Records
          </Button>
        )}
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : !sar ? (
        <Card className="shadow-sm">
          <Card.Body>
            <p className="text-muted mb-0">
              {user?.role === 'student'
                ? 'No academic record is linked to your account yet.'
                : 'Student academic record not found.'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Row className="g-4 mb-4">
            <Col lg={7}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <h4 className="mb-1">{sar.studentName}</h4>
                      <div className="text-muted">{sar.email}</div>
                    </div>
                    <Badge bg="primary">Year {sar.yearLevel}</Badge>
                  </div>

                  <ListGroup variant="flush">
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Student Number</span>
                      <strong>{sar.studentNumber}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Curriculum</span>
                      <strong>{sar.Curriculum?.name || 'Unassigned'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Elective Track</span>
                      <strong>{sar.ElectiveTrack?.name || 'Not selected'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between align-items-center">
                      <span className="text-muted">Link Status</span>
                      <Badge bg={sar.isLinkedToAccount ? 'success' : 'secondary'} className="text-uppercase">
                        {sar.isLinkedToAccount ? 'linked' : 'unlinked'}
                      </Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Created By</span>
                      <strong>
                        {sar.CreatedByAdviser
                          ? `${sar.CreatedByAdviser.firstName} ${sar.CreatedByAdviser.lastName}`
                          : 'N/A'}
                      </strong>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={5}>
              <Card className="shadow-sm h-100">
                <Card.Body className="d-flex flex-column">
                  <h5 className="mb-3">Study Plan Status</h5>
                  <div className="mb-3">
                    <div className="text-muted small">Current active version</div>
                    <div className="fw-semibold">
                      {activeVersion ? `Version ${activeVersion.versionNumber}` : 'No active version yet'}
                    </div>
                  </div>

                  {activeVersion ? (
                    <div className="mb-4">
                      <Badge bg="success" className="me-2 text-uppercase">{activeVersion.status}</Badge>
                      <span className="text-muted small">Created {formatDateTime(activeVersion.createdAt)}</span>
                    </div>
                  ) : (
                    <p className="text-muted">This record does not have an active study plan version yet.</p>
                  )}

                  {canGeneratePlan && !hasStudyPlan && (
                    <Button onClick={handleGenerateInitialStudyPlan} disabled={actionLoading} className="mb-3">
                      {actionLoading ? 'Generating...' : 'Generate Initial Study Plan'}
                    </Button>
                  )}

                  {canOpenPlanRoute && activeVersion && (
                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        as={Link}
                        to={`/adviser/students/${sar.id}/plan/${activeVersion.id}`}
                        variant="outline-primary"
                      >
                        View Active Plan
                      </Button>
                      <Button
                        as={Link}
                        to={`/adviser/students/${sar.id}/grades`}
                        variant="primary"
                      >
                        Enter Grades
                      </Button>
                    </div>
                  )}

                  {!activeVersion && hasStudyPlan && (
                    <p className="text-muted mb-0">A study plan exists, but no version has been marked active yet.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Study Plan Versions</h5>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Generated By</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.id}>
                      <td>Version {version.versionNumber}</td>
                      <td>
                        <Badge bg={version.status === 'active' ? 'success' : version.status === 'draft' ? 'secondary' : 'dark'} className="text-uppercase">
                          {version.status}
                        </Badge>
                      </td>
                      <td>{formatDateTime(version.createdAt)}</td>
                      <td>
                        {version.GeneratedByAdviser
                          ? `${version.GeneratedByAdviser.firstName} ${version.GeneratedByAdviser.lastName}`
                          : 'N/A'}
                      </td>
                      <td className="text-end">
                        {canOpenPlanRoute ? (
                          <Button
                            as={Link}
                            to={`/adviser/students/${sar.id}/plan/${version.id}`}
                            size="sm"
                            variant="outline-primary"
                          >
                            View Plan
                          </Button>
                        ) : (
                          <span className="text-muted small">Read-only</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {versions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No study plan versions available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentDetail;