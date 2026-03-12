import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';

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

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const RegenerationReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sarId, versionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sar, setSar] = useState(null);
  const [regeneratedVersion, setRegeneratedVersion] = useState(location.state?.regeneratedVersion || null);
  const [previousVersion, setPreviousVersion] = useState(location.state?.previousVersion || null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [sarResponse, versionsResponse] = await Promise.all([
          api.get(`/sars/${sarId}`),
          api.get(`/sars/${sarId}/study-plan/versions`)
        ]);

        const versions = versionsResponse.data?.data || [];
        const current = versions.find((version) => String(version.id) === String(versionId)) || null;

        if (!current) {
          setError('Regenerated study plan version not found.');
          setSar(sarResponse.data?.data || null);
          setRegeneratedVersion(null);
          setPreviousVersion(null);
          return;
        }

        const fallbackPrevious = versions
          .filter((item) => Number(item.versionNumber) < Number(current.versionNumber))
          .sort((left, right) => Number(right.versionNumber) - Number(left.versionNumber))[0] || null;

        setSar(sarResponse.data?.data || null);
        setRegeneratedVersion(current);
        setPreviousVersion(location.state?.previousVersion || fallbackPrevious);
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Failed to load regeneration review data.'));
        setSar(null);
        setRegeneratedVersion(null);
        setPreviousVersion(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sarId, versionId, location.state?.previousVersion]);

  const previousSlotsByCourseId = useMemo(() => {
    const map = new Map();
    (previousVersion?.StudyPlanCourses || []).forEach((entry) => {
      map.set(String(entry.courseId), `${entry.yearLevel}-${entry.semester}`);
    });
    return map;
  }, [previousVersion]);

  const groupedCourses = useMemo(() => {
    const groups = new Map();

    (regeneratedVersion?.StudyPlanCourses || []).forEach((courseEntry) => {
      const key = `${courseEntry.yearLevel}-${courseEntry.semester}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }

      const previousSlot = previousSlotsByCourseId.get(String(courseEntry.courseId));
      groups.get(key).push({
        ...courseEntry,
        moved: Boolean(previousSlot && previousSlot !== key),
        previousSlot
      });
    });

    return [...groups.entries()]
      .sort(([leftKey], [rightKey]) => {
        const [leftYear, leftSemester] = leftKey.split('-').map(Number);
        const [rightYear, rightSemester] = rightKey.split('-').map(Number);

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
  }, [regeneratedVersion, previousSlotsByCourseId]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Regeneration Review</h2>
          <p className="text-muted mb-0">Review the regenerated draft study plan before validation.</p>
        </div>
        <Button as={Link} to={`/adviser/students/${sarId}/grades`} variant="outline-secondary">
          Back to Grade Entry
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : regeneratedVersion ? (
        <>
          <Card className="shadow-sm mb-4">
            <Card.Body className="d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div>
                <h5 className="mb-1">{sar?.studentName || 'Student'}</h5>
                <div className="text-muted">{sar?.studentNumber || 'No student number available'}</div>
                <div className="text-muted">{sar?.Curriculum?.name || 'No curriculum assigned'}</div>
              </div>
              <div className="text-lg-end">
                <div className="fw-semibold">Version {regeneratedVersion.versionNumber}</div>
                <Badge bg="secondary" className="text-uppercase mt-2">{regeneratedVersion.status}</Badge>
              </div>
            </Card.Body>
          </Card>

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
                            <Card key={courseEntry.id} className={courseEntry.moved ? 'border-warning bg-warning bg-opacity-10' : 'border-0 bg-light'}>
                              <Card.Body className="py-3">
                                <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                                  <div>
                                    <div className="fw-semibold">{courseEntry.Course?.code || 'No code'}</div>
                                    <div>{courseEntry.Course?.name || 'Unnamed course'}</div>
                                    <div className="text-muted small">{courseEntry.Course?.units || 0} units</div>
                                  </div>
                                  <div className="text-lg-end">
                                    {courseEntry.moved ? (
                                      <>
                                        <Badge bg="warning" text="dark">Rescheduled</Badge>
                                        <div className="small text-muted mt-1">Was in {slotLabels[courseEntry.previousSlot] || `Y${courseEntry.previousSlot}`}</div>
                                      </>
                                    ) : (
                                      <Badge bg="secondary">Unchanged Slot</Badge>
                                    )}
                                  </div>
                                </div>
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <div className="d-flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/adviser/students/${sarId}/plan/${regeneratedVersion.id}/validate`)}>
              Proceed to Validation
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate(`/adviser/students/${sarId}`)}>
              Return to Student Record
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default RegenerationReview;