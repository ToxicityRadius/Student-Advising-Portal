import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ElectiveTrackSelector from '../../components/adviser/ElectiveTrackSelector';
import api from '../../utils/api';
import AdviserLayout from '../../components/adviser/AdviserLayout';

const slotLabels = {
  '1-1': 'Year 1 • 1st Semester',
  '1-2': 'Year 1 • 2nd Semester',
  '1-3': 'Year 1 • Summer',
  '2-1': 'Year 2 • 1st Semester',
  '2-2': 'Year 2 • 2nd Semester',
  '2-3': 'Year 2 • Summer',
  '3-1': 'Year 3 • 1st Semester',
  '3-2': 'Year 3 • 2nd Semester',
  '3-3': 'Year 3 • Summer',
  '4-1': 'Year 4 • 1st Semester',
  '4-2': 'Year 4 • 2nd Semester',
  '4-3': 'Year 4 • Summer'
};

const statusVariant = {
  pending: 'secondary',
  passed: 'success',
  failed: 'danger',
  dropped: 'warning',
  incomplete: 'dark'
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const ValidationFlow = () => {
  const navigate = useNavigate();
  const { sarId, versionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [sar, setSar] = useState(null);
  const [version, setVersion] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setAlert({ variant: '', message: '' });

      try {
        const [sarResponse, versionsResponse, termResponse] = await Promise.all([
          api.get(`/sars/${sarId}`),
          api.get(`/sars/${sarId}/study-plan/versions`),
          api.get('/terms/current')
        ]);

        const foundVersion = (versionsResponse.data?.data || []).find(
          (item) => String(item.id) === String(versionId)
        ) || null;

        setSar(sarResponse.data?.data || null);
        setVersion(foundVersion);
        setCurrentTerm(termResponse.data?.data || null);

        if (!foundVersion) {
          setAlert({ variant: 'danger', message: 'Draft study plan version not found.' });
        } else if (foundVersion.status !== 'draft') {
          setAlert({ variant: 'danger', message: 'Only draft study plan versions can be validated.' });
        }
      } catch (error) {
        setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load validation flow data.') });
        setSar(null);
        setVersion(null);
        setCurrentTerm(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sarId, versionId]);

  const groupedCourses = useMemo(() => {
    const groups = new Map();

    (version?.StudyPlanCourses || []).forEach((courseEntry) => {
      const key = `${courseEntry.yearLevel}-${courseEntry.semester}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(courseEntry);
    });

    return [...groups.entries()]
      .sort(([left], [right]) => {
        const [leftYear, leftSemester] = left.split('-').map(Number);
        const [rightYear, rightSemester] = right.split('-').map(Number);

        if (leftYear !== rightYear) {
          return leftYear - rightYear;
        }

        return leftSemester - rightSemester;
      })
      .map(([key, courses]) => ({
        key,
        label: slotLabels[key] || `Year ${key.replace('-', ' • Semester ')}`,
        courses
      }));
  }, [version]);

  const electiveTrackRequired = useMemo(
    () => Number(sar?.yearLevel) === 2 && Number(currentTerm?.semester) === 2,
    [sar?.yearLevel, currentTerm?.semester]
  );

  const canValidate = Boolean(version && version.status === 'draft' && (!electiveTrackRequired || sar?.electiveTrackId));

  const handleTrackSelected = (updatedSar) => {
    setSar((current) => ({
      ...current,
      ...updatedSar,
      ElectiveTrack: updatedSar?.ElectiveTrack || current?.ElectiveTrack
    }));
  };

  const handleValidate = async () => {
    if (!canValidate) {
      return;
    }

    setValidating(true);
    setAlert({ variant: '', message: '' });

    try {
      await api.patch(`/sars/${sarId}/study-plan/versions/${versionId}/validate`);
      setAlert({ variant: 'success', message: 'Study plan validated successfully. Redirecting to student record...' });
      setTimeout(() => navigate(`/adviser/students/${sarId}`), 900);
    } catch (error) {
      const code = error?.response?.data?.code;
      const fallback = code === 'ELECTIVE_TRACK_REQUIRED'
        ? 'Elective track selection is required before validation.'
        : 'Failed to validate draft study plan.';

      setAlert({ variant: 'danger', message: getErrorMessage(error, fallback) });
    } finally {
      setValidating(false);
    }
  };

  return (
    <AdviserLayout activePage="students" pageTitle="Validation Flow">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Validation Flow</h2>
          <p className="text-muted mb-0">Review and validate this draft study plan version.</p>
        </div>
        <Button as={Link} to={`/adviser/students/${sarId}`} variant="outline-secondary">
          Back to Record
        </Button>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : !version ? null : (
        <>
          <Card className="shadow-sm mb-4">
            <Card.Body className="d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div>
                <h5 className="mb-1">{sar?.studentName || 'Student'}</h5>
                <div className="text-muted">{sar?.studentNumber || 'No student number available'}</div>
                <div className="text-muted">{sar?.Curriculum?.name || 'No curriculum assigned'}</div>
                <div className="text-muted">Current term: {currentTerm ? `${currentTerm.schoolYear} • Semester ${currentTerm.semester}` : 'Not set'}</div>
              </div>
              <div className="text-lg-end">
                <div className="fw-semibold">Version {version.versionNumber}</div>
                <Badge bg={version.status === 'draft' ? 'secondary' : 'dark'} className="text-uppercase mt-2">
                  {version.status}
                </Badge>
              </div>
            </Card.Body>
          </Card>

          {electiveTrackRequired && !sar?.electiveTrackId && (
            <Alert variant="warning">
              This student is in Year 2 and the current term is 2nd semester. Elective track selection is required before validation.
            </Alert>
          )}

          {electiveTrackRequired && !sar?.electiveTrackId && (
            <ElectiveTrackSelector
              sarId={sarId}
              curriculumId={sar?.curriculumId}
              selectedTrackId={sar?.electiveTrackId}
              onTrackSelected={handleTrackSelected}
            />
          )}

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Semester Slot</th>
                    <th>Courses</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedCourses.map((group) => (
                    <tr key={group.key}>
                      <td className="fw-semibold align-middle">{group.label}</td>
                      <td>
                        <div className="d-flex flex-column gap-3">
                          {group.courses.map((courseEntry) => (
                            <Card key={courseEntry.id} className="border-0 bg-light">
                              <Card.Body className="py-3">
                                <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                                  <div>
                                    <div className="fw-semibold">{courseEntry.Course?.code || 'No code'}</div>
                                    <div>{courseEntry.Course?.name || 'Unnamed course'}</div>
                                    <div className="text-muted small">{courseEntry.Course?.units || 0} units</div>
                                  </div>
                                  <div className="text-lg-end">
                                    <div className="small text-muted">Grade</div>
                                    <div className="fw-semibold">{courseEntry.grade || 'Pending'}</div>
                                    <Badge bg={statusVariant[courseEntry.status] || 'secondary'} className="text-uppercase mt-2">
                                      {courseEntry.status}
                                    </Badge>
                                  </div>
                                </div>
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {groupedCourses.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center text-muted py-4">
                        No courses were scheduled in this draft version.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <div className="d-flex flex-wrap gap-2">
            <Button
              variant={!canValidate || validating ? 'secondary' : 'primary'}
              onClick={handleValidate}
              disabled={!canValidate || validating}
            >
              {validating ? 'Validating...' : 'Validate Plan'}
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate(`/adviser/students/${sarId}`)}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </AdviserLayout>
  );
};

export default ValidationFlow;