import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import useSarData from '../../hooks/useSarData';
import api from '../../utils/api';
import AdviserLayout from '../../components/adviser/AdviserLayout';
import StudyPlanChecklist from '../../components/sar/StudyPlanChecklist';
import { getErrorMessage } from '../../utils/errorHelpers';

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
  '4-3': 'Year 4 • Summer',
  '5-1': 'Year 5 • 1st Semester',
  '5-2': 'Year 5 • 2nd Semester',
};

const semesterLabels = { 1: '1st Semester', 2: '2nd Semester', 3: 'Summer' };

const statusVariant = {
  pending: 'secondary',
  passed: 'success',
  failed: 'danger',
  dropped: 'warning',
  incomplete: 'dark',
  officially_dropped: 'danger',
  unofficially_dropped: 'danger',
};

const statusLabel = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Failed',
  dropped: 'Dropped',
  incomplete: 'Incomplete',
  officially_dropped: 'Off. Dropped',
  unofficially_dropped: 'Unoff. Dropped',
};

const RegenerationReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sarId, versionId } = useParams();

  const [error, setError] = useState('');
  const [regeneratedVersion, setRegeneratedVersion] = useState(
    location.state?.regeneratedVersion || null,
  );
  const [previousVersion, setPreviousVersion] = useState(location.state?.previousVersion || null);
  const [failedCourseAnalysis, setFailedCourseAnalysis] = useState(
    location.state?.failedCourseAnalysis || null,
  );
  const [graduationPacing, setGraduationPacing] = useState(
    location.state?.graduationPacing || null,
  );
  const [curriculumMigrationRecommendation, setCurriculumMigrationRecommendation] = useState(
    location.state?.curriculumMigrationRecommendation || null,
  );
  const [semesterOverrides, setSemesterOverrides] = useState({});
  const [regenerating, setRegenerating] = useState(false);
  const [regenAlert, setRegenAlert] = useState({ variant: '', message: '' });
  const { sar, versions, loading, error: sarFetchError } = useSarData(sarId);

  useEffect(() => {
    if (loading) return;
    if (sarFetchError) {
      setError(getErrorMessage(sarFetchError, 'Failed to load regeneration review data.'));
      setRegeneratedVersion(null);
      setPreviousVersion(null);
      return;
    }
    const current = versions.find((version) => String(version.id) === String(versionId)) || null;
    if (!current) {
      setError('Regenerated study plan version not found.');
      setRegeneratedVersion(null);
      setPreviousVersion(null);
      return;
    }
    const fallbackPrevious =
      versions
        .filter((item) => Number(item.versionNumber) < Number(current.versionNumber))
        .sort((left, right) => Number(right.versionNumber) - Number(left.versionNumber))[0] || null;
    setError('');
    setRegeneratedVersion(current);
    setPreviousVersion(location.state?.previousVersion || fallbackPrevious);
  }, [loading, versions, versionId, sarFetchError, location.state?.previousVersion]);

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
        previousSlot,
        previousSlotLabel: slotLabels[previousSlot] || previousSlot,
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
        courses,
      }));
  }, [regeneratedVersion, previousSlotsByCourseId]);

  const hasOverrides = useMemo(
    () => Object.keys(semesterOverrides).length > 0,
    [semesterOverrides],
  );

  const handleOverrideChange = useCallback((courseId, yearLevel, semester) => {
    setSemesterOverrides((prev) => {
      const next = { ...prev };
      if (yearLevel && semester) {
        next[courseId] = {
          courseId: Number(courseId),
          yearLevel: Number(yearLevel),
          semester: Number(semester),
        };
      } else {
        delete next[courseId];
      }
      return next;
    });
  }, []);

  const handleRegenerateWithOverrides = async () => {
    setRegenerating(true);
    setRegenAlert({ variant: '', message: '' });

    try {
      const response = await api.post(`/sars/${sarId}/study-plan/regenerate`, {
        semesterOverrides: Object.values(semesterOverrides),
      });

      const newVersion = response.data?.data;
      const newAnalysis = response.data?.failedCourseAnalysis || null;
      const newGraduationPacing = response.data?.graduationPacing || null;
      const newMigrationRecommendation = response.data?.curriculumMigrationRecommendation || null;

      if (!newVersion?.id) {
        throw new Error('Regeneration did not return a new version');
      }

      // Refresh in-place
      setRegeneratedVersion(newVersion);
      setFailedCourseAnalysis(newAnalysis);
      setGraduationPacing(newGraduationPacing);
      setCurriculumMigrationRecommendation(newMigrationRecommendation);
      setSemesterOverrides({});
      setRegenAlert({
        variant: 'success',
        message: 'Study plan regenerated with your semester overrides.',
      });

      // Update URL to new version
      navigate(`/adviser/students/${sarId}/plan/${newVersion.id}/review`, {
        replace: true,
        state: {
          previousVersion,
          regeneratedVersion: newVersion,
          failedCourseAnalysis: newAnalysis,
          graduationPacing: newGraduationPacing,
          curriculumMigrationRecommendation: newMigrationRecommendation,
        },
      });
    } catch (err) {
      setRegenAlert({
        variant: 'danger',
        message: getErrorMessage(err, 'Failed to regenerate with overrides.'),
      });
    } finally {
      setRegenerating(false);
    }
  };

  const getUniqueSemesters = (availability) => {
    const seen = new Set();
    const result = [];
    for (const a of availability || []) {
      if (a.isAvailable === false) {
        continue;
      }
      const key = `${a.semester}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(a);
      }
    }
    return result.sort((a, b) => a.semester - b.semester);
  };

  return (
    <AdviserLayout activePage="students" pageTitle="Regeneration Review">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Regeneration Review</h2>
          <p className="text-muted mb-0">
            Review the regenerated draft study plan before validation.
          </p>
        </div>
        <Button as={Link} to={`/adviser/students/${sarId}/grades`} variant="outline-secondary">
          Back to Grade Entry
        </Button>
      </div>

      {regenAlert.message && <Alert variant={regenAlert.variant}>{regenAlert.message}</Alert>}

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
                <div className="text-muted">
                  {sar?.studentNumber || 'No student number available'}
                </div>
                <div className="text-muted">
                  {sar?.Curriculum?.name || 'No curriculum assigned'}
                </div>
              </div>
              <div className="text-lg-end">
                <div className="fw-semibold">Version {regeneratedVersion.versionNumber}</div>
                <Badge bg="secondary" className="text-uppercase mt-2">
                  {regeneratedVersion.status}
                </Badge>
              </div>
            </Card.Body>
          </Card>

          {/* ══════ Failed Course Analysis Panel ══════ */}
          {graduationPacing && (
            <Alert
              variant={graduationPacing.isOnTrack ? 'success' : 'warning'}
              className="shadow-sm mb-4"
            >
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-2">
                <div>
                  <div className="fw-semibold">
                    Graduation pacing: {graduationPacing.isOnTrack ? 'On track' : 'Delayed'}
                  </div>
                  <div className="small">
                    Target: {graduationPacing.targetTerm?.label || 'Not set'} | Latest planned:{' '}
                    {graduationPacing.latestPlannedTerm?.label || 'Not set'}
                  </div>
                  {graduationPacing.message && (
                    <div className="small mt-1">{graduationPacing.message}</div>
                  )}
                  {!graduationPacing.isOnTrack && graduationPacing.delayedCourses?.length > 0 && (
                    <div className="small mt-2">
                      Delayed courses:{' '}
                      {graduationPacing.delayedCourses
                        .map((course) => course.code || course.name)
                        .join(', ')}
                    </div>
                  )}
                </div>
                {!graduationPacing.isOnTrack && (
                  <Badge bg="warning" text="dark" className="align-self-start">
                    {graduationPacing.termsDelayed} term
                    {graduationPacing.termsDelayed === 1 ? '' : 's'} delayed
                  </Badge>
                )}
              </div>
            </Alert>
          )}

          {curriculumMigrationRecommendation && (
            <Alert variant="info" className="shadow-sm mb-4">
              <div className="fw-semibold">Curriculum conversion recommendation</div>
              <div className="small">
                Registrar and Program Chair may convert this irregular student to{' '}
                <span className="fw-semibold">
                  {curriculumMigrationRecommendation.curriculumName}
                </span>{' '}
                because it covers all remaining requirements.
              </div>
              {curriculumMigrationRecommendation.estimatedLatestTerm?.label && (
                <div className="small mt-1">
                  Estimated latest remaining requirement:{' '}
                  {curriculumMigrationRecommendation.estimatedLatestTerm.label}
                </div>
              )}
            </Alert>
          )}

          {failedCourseAnalysis?.failedCourses?.length > 0 && (
            <Card className="shadow-sm mb-4 border-danger border-2">
              <Card.Body>
                <h5 className="text-danger mb-3">
                  <span className="me-2">⚠</span>
                  Failed / Dropped Course Analysis
                </h5>
                <p className="text-muted small mb-3">
                  The following courses have blocking statuses. You can override the semester
                  placement for retakes using the cross-curriculum availability data below, then
                  regenerate.
                </p>

                {failedCourseAnalysis.failedCourses.map((fc) => {
                  const availableSemesters = getUniqueSemesters(fc.availability);

                  return (
                    <Card key={fc.courseId} className="mb-3 bg-light border-0">
                      <Card.Body>
                        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
                          <div>
                            <div className="fw-bold fs-6">{fc.code}</div>
                            <div>{fc.name}</div>
                            <div className="mt-1">
                              <Badge bg={statusVariant[fc.status] || 'danger'} className="me-2">
                                {statusLabel[fc.status] || fc.status}
                              </Badge>
                              <span className="text-muted small">Grade: {fc.grade}</span>
                            </div>
                            {fc.placedAt && (
                              <div className="small text-muted mt-1">
                                Currently placed at: Year {fc.placedAt.yearLevel} •{' '}
                                {semesterLabels[fc.placedAt.semester] ||
                                  `Sem ${fc.placedAt.semester}`}
                              </div>
                            )}
                          </div>
                          <div className="text-lg-end">
                            <div className="small fw-semibold mb-1">Override Semester</div>
                            <div className="d-flex gap-2 align-items-center justify-content-lg-end">
                              <Form.Select
                                size="sm"
                                style={{ maxWidth: 140 }}
                                value={semesterOverrides[fc.courseId]?.yearLevel || ''}
                                onChange={(e) => {
                                  const yr = e.target.value;
                                  const existing = semesterOverrides[fc.courseId];
                                  if (yr) {
                                    handleOverrideChange(fc.courseId, yr, existing?.semester || 1);
                                  } else {
                                    handleOverrideChange(fc.courseId, null, null);
                                  }
                                }}
                              >
                                <option value="">Default</option>
                                {[1, 2, 3, 4, 5].map((yr) => (
                                  <option key={yr} value={yr}>
                                    Year {yr}
                                  </option>
                                ))}
                              </Form.Select>
                              <Form.Select
                                size="sm"
                                style={{ maxWidth: 160 }}
                                value={semesterOverrides[fc.courseId]?.semester || ''}
                                disabled={!semesterOverrides[fc.courseId]?.yearLevel}
                                onChange={(e) => {
                                  const sem = e.target.value;
                                  const yr = semesterOverrides[fc.courseId]?.yearLevel || 1;
                                  if (sem) {
                                    handleOverrideChange(fc.courseId, yr, sem);
                                  }
                                }}
                              >
                                <option value={1}>1st Semester</option>
                                <option value={2}>2nd Semester</option>
                                <option value={3}>Summer</option>
                              </Form.Select>
                            </div>
                          </div>
                        </div>

                        {/* Prerequisite Cascade */}
                        {fc.blockedCourses?.length > 0 && (
                          <div className="mb-3">
                            <div className="small fw-semibold text-danger mb-1">
                              Blocked Courses ({fc.blockedCourses.length})
                            </div>
                            <div className="ps-3 border-start border-danger border-2">
                              {fc.blockedCourses.map((bc) => (
                                <div
                                  key={bc.courseId}
                                  className="small py-1"
                                  style={{ paddingLeft: (bc.depth - 1) * 16 }}
                                >
                                  <span
                                    className="text-danger me-2 d-inline-flex justify-content-center"
                                    style={{ width: 16 }}
                                  >
                                    {'\u2192'}
                                  </span>
                                  <span className="fw-semibold">{bc.code}</span>
                                  <span className="text-muted ms-1">— {bc.name}</span>
                                  <Badge
                                    bg="light"
                                    text="dark"
                                    className="ms-2"
                                    style={{ fontSize: '0.65rem' }}
                                  >
                                    depth {bc.depth}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cross-Curriculum Availability */}
                        {fc.availability?.length > 0 && (
                          <div>
                            <div className="small fw-semibold text-primary mb-1">
                              Cross-Curriculum Availability
                            </div>
                            <Table
                              size="sm"
                              bordered
                              className="mb-0"
                              style={{ fontSize: '0.8rem' }}
                            >
                              <thead>
                                <tr className="table-light">
                                  <th>Curriculum</th>
                                  <th>Year Level</th>
                                  <th>Semester</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fc.availability.map((a, idx) => (
                                  <tr
                                    key={idx}
                                    className={a.isAvailable === false ? 'table-light' : undefined}
                                  >
                                    <td>{a.curriculumName}</td>
                                    <td>Year {a.yearLevel}</td>
                                    <td>{semesterLabels[a.semester] || `Sem ${a.semester}`}</td>
                                    <td>
                                      {a.isAvailable === false ? (
                                        <>
                                          <Badge bg="secondary" className="me-2">
                                            Unavailable
                                          </Badge>
                                          <span className="text-muted small">
                                            {a.unavailableReason ||
                                              'Unavailable for retake planning.'}
                                          </span>
                                        </>
                                      ) : (
                                        <Badge bg="success">Available</Badge>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                            <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                              {availableSemesters.length > 0 ? (
                                <>
                                  Available in semester(s):{' '}
                                  {availableSemesters
                                    .map((s) => semesterLabels[s.semester])
                                    .join(', ')}
                                </>
                              ) : (
                                'No available future offering found.'
                              )}
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  );
                })}

                {hasOverrides && (
                  <div className="d-flex gap-2 mt-3">
                    <Button
                      variant="warning"
                      onClick={handleRegenerateWithOverrides}
                      disabled={regenerating}
                    >
                      {regenerating ? 'Regenerating…' : 'Regenerate with Changes'}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => setSemesterOverrides({})}
                      disabled={regenerating}
                    >
                      Reset Overrides
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* ══════ Regenerated Plan Table ══════ */}
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <StudyPlanChecklist
                groups={groupedCourses}
                emptyMessage="No courses were scheduled in this draft version."
                showMovementStatus
              />
            </Card.Body>
          </Card>

          <div className="d-flex flex-wrap gap-2">
            <Button
              onClick={() =>
                navigate(`/adviser/students/${sarId}/plan/${regeneratedVersion.id}/validate`)
              }
            >
              Proceed to Validation
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => navigate(`/adviser/students/${sarId}`)}
            >
              Return to Student Record
            </Button>
          </div>
        </>
      ) : null}
    </AdviserLayout>
  );
};

export default RegenerationReview;
