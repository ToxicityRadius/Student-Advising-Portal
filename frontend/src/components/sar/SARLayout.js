import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Image,
  ListGroup,
  Nav,
  ProgressBar,
  Row,
  Spinner,
  Tab,
  Table,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ElectiveTrackSelector from '../adviser/ElectiveTrackSelector';
import { buildProfileImageUrl, getInitials } from '../../utils/profileImage';
import api from '../../utils/api';

const semesterLabels = { 1: '1st Semester', 2: '2nd Semester', 3: 'Summer' };

const statusVariant = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'completed': return 'success';
    case 'credited': return 'info';
    case 'failed': return 'danger';
    case 'dropped': return 'warning';
    case 'incomplete': return 'warning';
    case 'ongoing': return 'primary';
    case 'pending': return 'secondary';
    case 'not yet taken': return 'light';
    default: return 'secondary';
  }
};

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const formatDateTime = (value) =>
  value ? new Date(Number(value)).toLocaleString() : 'N/A';

const TABS = [
  { key: 'profile', label: 'Profile & Identity' },
  { key: 'progress', label: 'Progress Summary' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'prerequisites', label: 'Prerequisites' },
  { key: 'grades', label: 'Grades & Performance' },
  { key: 'studyplan', label: 'Study Plan' },
];

/**
 * SARLayout — shared SAR detail layout used by both MyRecord (student) and
 * StudentDetail (adviser/admin).
 *
 * Props:
 *   sar            – SAR data object (includes analytics, Curriculum, Student, etc.)
 *   versions       – Array of study plan versions (empty for student view)
 *   role           – 'student' | 'adviser' | 'admin'
 *   sarId          – SAR id string (needed for adviser action links)
 *   onGeneratePlan – Callback for "Generate Initial Study Plan" (adviser/admin)
 *   isActionLoading – Boolean for loading state of adviser actions
 *   onTermChange   – Callback when adviser/admin changes the active academic term
 */
const SARLayout = ({
  sar,
  versions = [],
  role,
  sarId,
  onGeneratePlan,
  onRefresh,
  isActionLoading = false,
  onTermChange,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showFullIdentity, setShowFullIdentity] = useState(false);

  const isStudentView = role === 'student';
  const canManagePlan = role === 'adviser' || role === 'admin';

  const analytics = sar?.analytics || null;
  const profileImageUrl = buildProfileImageUrl(sar?.Student?.profile_picture);

  /* ── Academic term selector state (adviser/admin only) ── */
  const [terms, setTerms] = useState([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termChanging, setTermChanging] = useState(false);

  const fetchTerms = useCallback(async () => {
    if (!canManagePlan) return;
    setTermsLoading(true);
    try {
      const res = await api.get('/terms', { params: { pageSize: 100, sortBy: 'schoolYear', sortOrder: 'DESC' } });
      setTerms(res.data?.items || res.data?.data || []);
    } catch {
      setTerms([]);
    } finally {
      setTermsLoading(false);
    }
  }, [canManagePlan]);

  useEffect(() => { fetchTerms(); }, [fetchTerms]);

  const currentTermId = useMemo(
    () => terms.find((t) => t.isCurrent)?.id || null,
    [terms]
  );

  const handleTermChange = async (e) => {
    const selectedId = e.target.value;
    if (!selectedId || String(selectedId) === String(currentTermId)) return;
    setTermChanging(true);
    try {
      await api.patch(`/terms/${selectedId}/activate`);
      await fetchTerms();
      if (onTermChange) onTermChange();
    } catch {
      // silent — parent will show alert on refresh
    } finally {
      setTermChanging(false);
    }
  };

  const activeVersion = useMemo(
    () => versions.find((v) => v.status === 'active') || sar?.activeStudyPlanVersion || null,
    [versions, sar]
  );

  const hasStudyPlan = Boolean(sar?.StudyPlan?.id || versions.length > 0);
  const electiveTrackRequired = useMemo(() => {
    const currentYearLevel = Number(sar?.yearLevel || analytics?.tags?.yearLevel || 0);
    const currentSemester = Number(analytics?.tags?.semester || 0);

    if (currentYearLevel > 2) {
      return true;
    }

    return currentYearLevel === 2 && currentSemester >= 2;
  }, [analytics?.tags?.semester, analytics?.tags?.yearLevel, sar?.yearLevel]);

  const groupedCourses = useMemo(() => {
    const courses = Array.isArray(activeVersion?.StudyPlanCourses)
      ? [...activeVersion.StudyPlanCourses]
      : [];
    courses.sort((a, b) => {
      const yearDiff = Number(a.yearLevel) - Number(b.yearLevel);
      if (yearDiff !== 0) return yearDiff;
      const semDiff = Number(a.semester) - Number(b.semester);
      if (semDiff !== 0) return semDiff;
      return String(a.Course?.code || '').localeCompare(String(b.Course?.code || ''));
    });
    return courses.reduce((acc, course) => {
      const key = `${course.yearLevel}-${course.semester}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(course);
      return acc;
    }, {});
  }, [activeVersion]);

  const sortedPlanKeys = useMemo(
    () =>
      Object.keys(groupedCourses).sort((a, b) => {
        const [ay, as_] = a.split('-').map(Number);
        const [by, bs] = b.split('-').map(Number);
        return ay !== by ? ay - by : as_ - bs;
      }),
    [groupedCourses]
  );

  if (!sar) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <p className="text-muted mb-0">
            {isStudentView
              ? 'No academic record is linked to your account yet.'
              : 'Student academic record not found.'}
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Tab.Container activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)}>
        <Nav variant="tabs" className="mb-3">
          {TABS.map((tab) => (
            <Nav.Item key={tab.key}>
              <Nav.Link eventKey={tab.key}>{tab.label}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        <Tab.Content>
          {/* ══════════════════════════════════════════
              Tab 1 — Profile & Identity
          ══════════════════════════════════════════ */}
          <Tab.Pane eventKey="profile">
            <Row className="g-4">
              <Col lg={6}>
                <Card className="shadow-sm h-100">
                  <Card.Body>
                    <h5 className="mb-3">Student Identity</h5>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      {profileImageUrl ? (
                        <Image
                          src={profileImageUrl}
                          roundedCircle
                          width={64}
                          height={64}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                          style={{ width: 64, height: 64, fontWeight: 700, fontSize: '1.1rem' }}
                        >
                          {getInitials(sar.studentName)}
                        </div>
                      )}
                      <div>
                        <div className="fw-semibold fs-5">{sar.studentName}</div>
                        <div className="text-muted">{sar.email}</div>
                        <Badge
                          bg={sar.isLinkedToAccount ? 'success' : 'secondary'}
                          className="text-uppercase mt-1"
                        >
                          {sar.isLinkedToAccount ? 'linked' : 'unlinked'}
                        </Badge>
                      </div>
                    </div>
                    <ListGroup variant="flush">
                      <ListGroup.Item className="px-0 d-flex justify-content-between">
                        <span className="text-muted">Student Number</span>
                        <strong>{sar.studentNumber || 'N/A'}</strong>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 d-flex justify-content-between">
                        <span className="text-muted">Year Level</span>
                        <strong>Year {sar.yearLevel}</strong>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 d-flex justify-content-between">
                        <span className="text-muted">Curriculum</span>
                        <strong>{sar.Curriculum?.name || 'Unassigned'}</strong>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 d-flex justify-content-between">
                        <span className="text-muted">Elective Track</span>
                        <strong>{sar.ElectiveTrack?.name || 'Not selected'}</strong>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 d-flex justify-content-between">
                        <span className="text-muted">Program</span>
                        <strong>{sar.Student?.program || analytics?.tags?.program || 'N/A'}</strong>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 d-flex justify-content-between">
                        <span className="text-muted">Student Type</span>
                        <strong>{sar.Student?.student_type || analytics?.tags?.studentType || 'N/A'}</strong>
                      </ListGroup.Item>
                    </ListGroup>

                    <Button
                      type="button"
                      variant="link"
                      className="px-0 mt-2"
                      onClick={() => setShowFullIdentity((prev) => !prev)}
                    >
                      {showFullIdentity ? 'Hide additional profile details' : 'Show additional profile details'}
                    </Button>

                    <Collapse in={showFullIdentity}>
                      <div>
                        <ListGroup variant="flush" className="mt-2">
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">First Name</span>
                            <strong>{sar.Student?.first_name || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Middle Name</span>
                            <strong>{sar.Student?.middle_name || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Last Name</span>
                            <strong>{sar.Student?.last_name || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Suffix</span>
                            <strong>{sar.Student?.suffix || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Preferred Name</span>
                            <strong>{sar.Student?.preferred_name || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Contact Number</span>
                            <strong>{sar.Student?.contact_number || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Alternate Email</span>
                            <strong>{sar.Student?.alternate_email || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Sex</span>
                            <strong>{sar.Student?.sex || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Citizenship</span>
                            <strong>{sar.Student?.citizenship || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Emergency Contact</span>
                            <strong>{sar.Student?.emergency_contact_name || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Emergency Relationship</span>
                            <strong>{sar.Student?.emergency_contact_relationship || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0 d-flex justify-content-between">
                            <span className="text-muted">Emergency Number</span>
                            <strong>{sar.Student?.emergency_contact_number || 'N/A'}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="px-0">
                            <div className="text-muted mb-1">Address</div>
                            <strong>{sar.Student?.address || 'N/A'}</strong>
                          </ListGroup.Item>
                        </ListGroup>
                      </div>
                    </Collapse>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={6}>
                <Card className="shadow-sm h-100">
                  <Card.Body>
                    <h5 className="mb-3">Academic Context</h5>
                    <ListGroup variant="flush">
                      {analytics?.tags?.schoolYear && (
                        <ListGroup.Item className="px-0 d-flex justify-content-between">
                          <span className="text-muted">Current Term</span>
                          <strong>
                            {analytics.tags.schoolYear} — {analytics.tags.semesterLabel}
                          </strong>
                        </ListGroup.Item>
                      )}
                      {!isStudentView && sar.CreatedByAdviser && (
                        <ListGroup.Item className="px-0 d-flex justify-content-between">
                          <span className="text-muted">Created By</span>
                          <strong>
                            {`${sar.CreatedByAdviser.firstName} ${sar.CreatedByAdviser.lastName}`}
                          </strong>
                        </ListGroup.Item>
                      )}
                      {analytics?.usedCurriculum?.name && (
                        <ListGroup.Item className="px-0 d-flex justify-content-between">
                          <span className="text-muted">Used Curriculum</span>
                          <strong>{analytics.usedCurriculum.name}</strong>
                        </ListGroup.Item>
                      )}
                    </ListGroup>

                    {analytics?.adviserReviewWorkflow && (
                      <div className="mt-3 pt-3 border-top">
                        <div className="small text-muted fw-semibold mb-2">Review Workflow</div>
                        <Badge
                          bg={
                            analytics.adviserReviewWorkflow.reviewStatus === 'approved'
                              ? 'success'
                              : analytics.adviserReviewWorkflow.reviewStatus === 'reviewed'
                              ? 'primary'
                              : analytics.adviserReviewWorkflow.reviewStatus === 'draft'
                              ? 'secondary'
                              : 'light'
                          }
                          text={
                            analytics.adviserReviewWorkflow.reviewStatus === 'not_started'
                              ? 'dark'
                              : undefined
                          }
                          className="text-uppercase me-2"
                        >
                          {String(analytics.adviserReviewWorkflow.reviewStatus || 'N/A').replace(
                            '_',
                            ' '
                          )}
                        </Badge>
                        {analytics.adviserReviewWorkflow.lastValidatedAt && (
                          <span className="small text-muted">
                            Validated:{' '}
                            {formatDateTime(analytics.adviserReviewWorkflow.lastValidatedAt)}
                          </span>
                        )}
                        {analytics.adviserReviewWorkflow.reviewedBy?.name && (
                          <div className="small text-muted mt-1">
                            By: {analytics.adviserReviewWorkflow.reviewedBy.name}
                          </div>
                        )}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          {/* ══════════════════════════════════════════
              Tab 2 — Progress Summary
          ══════════════════════════════════════════ */}
          <Tab.Pane eventKey="progress">
            {!analytics ? (
              <Card className="shadow-sm">
                <Card.Body>
                  <p className="text-muted mb-0">
                    Academic intelligence data is not available yet. A study plan must be generated
                    first.
                  </p>
                </Card.Body>
              </Card>
            ) : (
              <>
                {/* ── Current academic term display / selector ── */}
                <Card className="shadow-sm mb-3">
                  <Card.Body className="py-2 px-3 d-flex align-items-center gap-3">
                    <span className="small fw-semibold text-nowrap">Current Academic Term:</span>
                    {termsLoading ? (
                      <Spinner animation="border" size="sm" />
                    ) : canManagePlan ? (
                      <Form.Select
                        size="sm"
                        style={{ maxWidth: 280 }}
                        value={currentTermId || ''}
                        onChange={handleTermChange}
                        disabled={termChanging}
                      >
                        <option value="" disabled>Select term…</option>
                        {terms
                          .sort((a, b) => {
                            if (a.schoolYear !== b.schoolYear) return a.schoolYear.localeCompare(b.schoolYear);
                            return Number(a.semester) - Number(b.semester);
                          })
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.schoolYear} {semesterLabels[t.semester] || `Sem ${t.semester}`}
                            </option>
                          ))}
                      </Form.Select>
                    ) : (
                      <span className="fw-semibold">
                        {analytics?.tags?.schoolYear
                          ? `${analytics.tags.schoolYear} ${analytics.tags.semesterLabel || ''}`
                          : 'Not set'}
                      </span>
                    )}
                    {termChanging && <Spinner animation="border" size="sm" className="ms-2" />}
                  </Card.Body>
                </Card>

                <Row className="g-3 mb-4">
                  <Col xs={6} md={4} lg={2}>
                    <Card bg="primary" text="white" className="h-100">
                      <Card.Body className="text-center p-3">
                        <div className="small mb-1">Completion</div>
                        <div className="fw-bold fs-4">
                          {formatPercent(analytics.progress?.completionPercentage)}
                        </div>
                        <div className="small opacity-75">
                          {analytics.progress?.unitsCompletedVsTotal} units
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={4} lg={2}>
                    <Card bg="success" text="white" className="h-100">
                      <Card.Body className="text-center p-3">
                        <div className="small mb-1">GWA</div>
                        <div className="fw-bold fs-4">
                          {analytics.gpaMonitoring?.gwa ?? 'N/A'}
                        </div>
                        <div className="small opacity-75">
                          {analytics.gpaMonitoring?.gradedSubjects ?? 0} graded
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={4} lg={2}>
                    <Card bg="warning" text="dark" className="h-100">
                      <Card.Body className="text-center p-3">
                        <div className="small mb-1">Remaining Units</div>
                        <div className="fw-bold fs-4">
                          {analytics.progress?.remainingUnits ?? 0}
                        </div>
                        <div className="small">
                          {analytics.progress?.remainingSubjects ?? 0} subjects
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={4} lg={2}>
                    <Card bg="info" text="white" className="h-100">
                      <Card.Body className="text-center p-3">
                        <div className="small mb-1">Rem. Semesters</div>
                        <div className="fw-bold fs-4">
                          {analytics.remainingSemestersTracking
                            ?.estimatedRemainingSemesters ?? 0}
                        </div>
                        <div className="small opacity-75">estimated</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12} md={8} lg={4}>
                    <Card bg="light" className="h-100">
                      <Card.Body className="p-3">
                        <div className="small text-muted mb-1">Estimated Graduation</div>
                        <div className="fw-semibold fs-5">
                          {analytics.estimatedGraduationDate?.label || 'N/A'}
                        </div>
                        <div className="small text-muted mt-1">
                          ~
                          {analytics.remainingSemestersTracking
                            ?.estimatedRemainingSemesters ?? 0}{' '}
                          semester(s) remaining
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={5}>
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="mb-3">Subject Status Breakdown</h6>
                        <ListGroup variant="flush">
                          {[
                            ['Completed', analytics.statusCounters?.completed ?? 0, 'success'],
                            ['Credited', analytics.statusCounters?.credited ?? 0, 'info'],
                            ['Failed', analytics.statusCounters?.failed ?? 0, 'danger'],
                            ['Dropped', analytics.statusCounters?.dropped ?? 0, 'warning'],
                            ['Incomplete', analytics.statusCounters?.incomplete ?? 0, 'warning'],
                            ['Ongoing', analytics.statusCounters?.ongoing ?? 0, 'primary'],
                            ['Pending', analytics.statusCounters?.pending ?? 0, 'secondary'],
                            [
                              'Not Yet Taken',
                              analytics.statusCounters?.['not yet taken'] ?? 0,
                              'light',
                            ],
                          ].map(([label, count, variant]) => (
                            <ListGroup.Item
                              key={label}
                              className="px-0 d-flex justify-content-between align-items-center py-2"
                            >
                              <span className="small">{label}</span>
                              <Badge
                                bg={variant}
                                text={variant === 'light' ? 'dark' : undefined}
                              >
                                {count}
                              </Badge>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={7}>
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="mb-3">Progress Overview</h6>
                        <div className="mb-3">
                          <div className="d-flex justify-content-between small mb-1">
                            <span>
                              Completion ({analytics.progress?.completedSubjects} /{' '}
                              {analytics.progress?.totalSubjects} subjects)
                            </span>
                            <strong>
                              {formatPercent(analytics.progress?.completionPercentage)}
                            </strong>
                          </div>
                          <ProgressBar
                            now={Number(analytics.progress?.completionPercentage || 0)}
                            variant={
                              Number(analytics.progress?.completionPercentage || 0) >= 75
                                ? 'success'
                                : Number(analytics.progress?.completionPercentage || 0) >= 40
                                ? 'warning'
                                : 'danger'
                            }
                            style={{ height: 12 }}
                          />
                        </div>
                        <div className="small">
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Units Completed</span>
                            <strong>{analytics.progress?.completedUnits}</strong>
                          </div>
                          <div className="d-flex justify-content-between py-1 border-bottom">
                            <span className="text-muted">Units Remaining</span>
                            <strong>{analytics.progress?.remainingUnits}</strong>
                          </div>
                          <div className="d-flex justify-content-between py-1">
                            <span className="text-muted">Total Units</span>
                            <strong>{analytics.progress?.totalUnits}</strong>
                          </div>
                        </div>

                        {analytics.subjectsTakenSummary && (
                          <div className="mt-3 pt-3 border-top">
                            <div className="small fw-semibold mb-2">Subjects Taken Summary</div>
                            <div className="d-flex gap-4">
                              <div className="text-center">
                                <div className="fw-bold text-success fs-5">
                                  {analytics.subjectsTakenSummary.passed}
                                </div>
                                <div className="small text-muted">Passed</div>
                              </div>
                              <div className="text-center">
                                <div className="fw-bold text-danger fs-5">
                                  {analytics.subjectsTakenSummary.failed}
                                </div>
                                <div className="small text-muted">Failed/Dropped</div>
                              </div>
                              <div className="text-center">
                                <div className="fw-bold text-info fs-5">
                                  {analytics.subjectsTakenSummary.credited}
                                </div>
                                <div className="small text-muted">Credited</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {analytics.prioritySubjectIndicators?.length > 0 && (
                          <div className="mt-3 pt-3 border-top">
                            <div className="small fw-semibold mb-2">
                              Priority Subjects{' '}
                              <Badge bg="warning" text="dark" className="ms-1">
                                {analytics.prioritySubjectIndicators.length}
                              </Badge>
                            </div>
                            <div className="d-flex flex-wrap gap-1">
                              {analytics.prioritySubjectIndicators.slice(0, 8).map((subj) => (
                                <Badge key={subj.courseId} bg="warning" text="dark">
                                  {subj.code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Tab.Pane>

          {/* ══════════════════════════════════════════
              Tab 3 — Checklist
          ══════════════════════════════════════════ */}
          <Tab.Pane eventKey="checklist">
            {!analytics?.curriculumChecklistOverview?.items?.length ? (
              <Card className="shadow-sm">
                <Card.Body>
                  <p className="text-muted mb-0">
                    Curriculum checklist is not available yet. A study plan must be generated
                    first.
                  </p>
                </Card.Body>
              </Card>
            ) : (
              <>
                <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                  <Badge bg="success" className="py-2 px-3">
                    ✓ {analytics.curriculumChecklistOverview.completedSubjects} Completed
                  </Badge>
                  <Badge bg="secondary" className="py-2 px-3">
                    {analytics.curriculumChecklistOverview.remainingSubjects} Remaining
                  </Badge>
                  <Badge bg="light" text="dark" className="py-2 px-3">
                    Total: {analytics.curriculumChecklistOverview.totalSubjects}
                  </Badge>
                </div>

                {(() => {
                  const items = analytics.curriculumChecklistOverview.items;
                  const groups = {};
                  items.forEach((item) => {
                    const key = `${item.yearLevel}-${item.semester}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(item);
                  });
                  const sortedKeys = Object.keys(groups).sort((a, b) => {
                    const [ay, as_] = a.split('-').map(Number);
                    const [by, bs] = b.split('-').map(Number);
                    return ay !== by ? ay - by : as_ - bs;
                  });
                  return sortedKeys.map((key) => {
                    const [yearLevel, semester] = key.split('-').map(Number);
                    const groupItems = groups[key];
                    const completedInGroup = groupItems.filter(
                      (item) =>
                        item.status === 'completed' || item.status === 'credited'
                    ).length;
                    return (
                      <div key={key} className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <h6 className="mb-0 text-muted">
                            Year {yearLevel} —{' '}
                            {semesterLabels[semester] || `Semester ${semester}`}
                          </h6>
                          <Badge bg="light" text="dark" className="small">
                            {completedInGroup}/{groupItems.length}
                          </Badge>
                        </div>
                        <Table responsive hover size="sm" className="border">
                          <thead className="table-light">
                            <tr>
                              <th>Code</th>
                              <th>Course Name</th>
                              <th className="text-center">Units</th>
                              <th className="text-center">Grade</th>
                              <th className="text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupItems.map((item) => (
                              <tr key={item.courseId}>
                                <td className="text-nowrap fw-medium">
                                  {item.code || 'N/A'}
                                </td>
                                <td>
                                  {item.name || 'N/A'}
                                  {item.isElective && (
                                    <Badge
                                      bg="light"
                                      text="dark"
                                      className="ms-2 small"
                                    >
                                      Elective
                                    </Badge>
                                  )}
                                </td>
                                <td className="text-center">{item.units ?? '—'}</td>
                                <td className="text-center">{item.grade || '—'}</td>
                                <td className="text-center">
                                  <Badge
                                    bg={statusVariant(item.status)}
                                    text={
                                      item.status === 'not yet taken' ? 'dark' : undefined
                                    }
                                    className="text-uppercase"
                                  >
                                    {item.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    );
                  });
                })()}
              </>
            )}
          </Tab.Pane>

          {/* ══════════════════════════════════════════
              Tab 4 — Prerequisites
          ══════════════════════════════════════════ */}
          <Tab.Pane eventKey="prerequisites">
            {!analytics?.prerequisiteChecking ? (
              <Card className="shadow-sm">
                <Card.Body>
                  <p className="text-muted mb-0">
                    Prerequisite data is not available yet.
                  </p>
                </Card.Body>
              </Card>
            ) : (
              <>
                <Row className="g-3 mb-4">
                  <Col xs={4}>
                    <Card bg="success" text="white" className="h-100">
                      <Card.Body className="text-center py-3">
                        <div className="small mb-1">Prerequisites Met</div>
                        <div className="fw-bold fs-3">
                          {analytics.prerequisiteChecking.metSubjects}
                        </div>
                        <div className="small opacity-75">subjects</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={4}>
                    <Card
                      bg={
                        analytics.prerequisiteChecking.unmetSubjects > 0
                          ? 'danger'
                          : 'secondary'
                      }
                      text="white"
                      className="h-100"
                    >
                      <Card.Body className="text-center py-3">
                        <div className="small mb-1">Unmet Prerequisites</div>
                        <div className="fw-bold fs-3">
                          {analytics.prerequisiteChecking.unmetSubjects}
                        </div>
                        <div className="small opacity-75">subjects</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={4}>
                    <Card bg="light" className="h-100">
                      <Card.Body className="text-center py-3">
                        <div className="small text-muted mb-1">Total Rules</div>
                        <div className="fw-bold fs-3">
                          {analytics.prerequisiteChecking.totalRules}
                        </div>
                        <div className="small text-muted">defined</div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {analytics.prerequisiteChecking.subjects?.length > 0 ? (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th className="text-center">Eligibility</th>
                        <th>Unmet Prerequisites</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.prerequisiteChecking.subjects.map((item) => (
                        <tr key={item.courseId}>
                          <td>
                            <div className="fw-medium">{item.code}</div>
                            <div className="small text-muted">{item.name}</div>
                          </td>
                          <td className="text-center">
                            <Badge
                              bg={item.isPrerequisiteMet ? 'success' : 'danger'}
                              className="text-uppercase"
                            >
                              {item.eligibility}
                            </Badge>
                          </td>
                          <td>
                            {item.unmetPrerequisites?.length > 0 ? (
                              item.unmetPrerequisites
                                .map((pr) => pr.code || String(pr.courseId))
                                .join(', ')
                            ) : (
                              <span className="text-muted small">None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Card className="shadow-sm">
                    <Card.Body>
                      <p className="text-muted mb-0">
                        No prerequisite rules are defined for this curriculum.
                      </p>
                    </Card.Body>
                  </Card>
                )}
              </>
            )}
          </Tab.Pane>

          {/* ══════════════════════════════════════════
              Tab 5 — Grades & Performance
          ══════════════════════════════════════════ */}
          <Tab.Pane eventKey="grades">
            {!analytics?.semesterAcademicSummary?.length ? (
              <Card className="shadow-sm">
                <Card.Body>
                  <p className="text-muted mb-0">
                    Semester academic summaries are not available yet. Generate a study plan
                    and enter grades to see performance data here.
                  </p>
                </Card.Body>
              </Card>
            ) : (
              <>
                {analytics.gpaMonitoring?.gwa != null && (
                  <div className="mb-3">
                    <Card className="shadow-sm border-start border-success border-4">
                      <Card.Body className="py-2 px-3">
                        <span className="text-muted small me-2">Overall GWA:</span>
                        <strong className="fs-5">{analytics.gpaMonitoring.gwa}</strong>
                        <span className="text-muted small ms-2">
                          ({analytics.gpaMonitoring.gradedUnits} graded units across{' '}
                          {analytics.gpaMonitoring.gradedSubjects} subjects)
                        </span>
                      </Card.Body>
                    </Card>
                  </div>
                )}
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th className="text-center">Total Subjects</th>
                      <th className="text-center">Total Units</th>
                      <th className="text-center">Passed</th>
                      <th className="text-center">Failed/Dropped</th>
                      <th className="text-center">Pending</th>
                      <th className="text-center">Completed Units</th>
                      <th className="text-center">GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.semesterAcademicSummary.map((entry) => (
                      <tr key={`${entry.yearLevel}-${entry.semester}`}>
                        <td className="fw-medium">{entry.label}</td>
                        <td className="text-center">{entry.totalSubjects}</td>
                        <td className="text-center">{entry.totalUnits}</td>
                        <td className="text-center">
                          <Badge bg={entry.passedSubjects > 0 ? 'success' : 'secondary'}>
                            {entry.passedSubjects}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg={entry.failedSubjects > 0 ? 'danger' : 'secondary'}>
                            {entry.failedSubjects}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg="secondary">{entry.pendingSubjects}</Badge>
                        </td>
                        <td className="text-center">{entry.completedUnits}</td>
                        <td className="text-center">
                          <strong>{entry.gpa ?? '—'}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Tab.Pane>

          {/* ══════════════════════════════════════════
              Tab 6 — Study Plan
          ══════════════════════════════════════════ */}
          <Tab.Pane eventKey="studyplan">
            {/* Adviser/admin action buttons */}
            {canManagePlan && (
              <div className="d-flex flex-wrap gap-2 mb-4">
                {!hasStudyPlan && onGeneratePlan && (
                  <Button onClick={onGeneratePlan} disabled={isActionLoading}>
                    {isActionLoading ? 'Generating...' : 'Generate Initial Study Plan'}
                  </Button>
                )}
                {activeVersion && sarId && (
                  <>
                    <Button
                      as={Link}
                      to={`/adviser/students/${sarId}/plan/${activeVersion.id}`}
                      variant="outline-primary"
                    >
                      View Active Plan
                    </Button>
                    <Button
                      as={Link}
                      to={`/adviser/students/${sarId}/grades`}
                      variant="primary"
                    >
                      Enter Grades
                    </Button>
                  </>
                )}
              </div>
            )}

            {canManagePlan && electiveTrackRequired && !sar?.electiveTrackId && sar?.curriculumId && (
              <ElectiveTrackSelector
                sarId={sarId}
                curriculumId={sar.curriculumId}
                selectedTrackId={sar.electiveTrackId}
                onTrackSelected={() => onRefresh?.()}
              />
            )}

            {/* Study plan versions table (adviser/admin only) */}
            {canManagePlan && versions.length > 0 && (
              <Card className="shadow-sm mb-4">
                <Card.Body>
                  <h6 className="mb-3">Study Plan Versions</h6>
                  <Table responsive hover size="sm">
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
                            <Badge
                              bg={
                                version.status === 'active'
                                  ? 'success'
                                  : version.status === 'draft'
                                  ? 'secondary'
                                  : 'dark'
                              }
                              className="text-uppercase"
                            >
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
                            {sarId && (
                              <div className="d-inline-flex gap-2">
                                <Button
                                  as={Link}
                                  to={`/adviser/students/${sarId}/plan/${version.id}`}
                                  size="sm"
                                  variant="outline-primary"
                                >
                                  {version.status === 'draft' ? 'Edit Draft' : 'View Plan'}
                                </Button>
                                {version.status === 'draft' && (
                                  <Button
                                    as={Link}
                                    to={`/adviser/students/${sarId}/plan/${version.id}/validate`}
                                    size="sm"
                                    variant="success"
                                  >
                                    Validate Draft
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {/* Active study plan course listing */}
            <Card className="shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <h5 className="mb-0">Active Study Plan</h5>
                  {activeVersion && (
                    <Badge bg="success" className="fs-6">
                      Version {activeVersion.versionNumber}
                    </Badge>
                  )}
                </div>

                {!activeVersion ? (
                  <p className="text-muted mb-0">
                    {hasStudyPlan
                      ? 'A study plan exists, but no version has been marked active yet.'
                      : 'No study plan has been generated yet.'}
                  </p>
                ) : sortedPlanKeys.length === 0 ? (
                  <p className="text-muted mb-0">
                    The active study plan has no scheduled courses.
                  </p>
                ) : (
                  sortedPlanKeys.map((key) => {
                    const [yearLevel, semester] = key.split('-').map(Number);
                    const courses = groupedCourses[key] || [];
                    return (
                      <div key={key} className="mb-4">
                        <h6 className="mb-2 text-muted">
                          Year {yearLevel} —{' '}
                          {semesterLabels[semester] || `Semester ${semester}`}
                        </h6>
                        <Table responsive hover size="sm" className="border">
                          <thead className="table-light">
                            <tr>
                              <th>Course Code</th>
                              <th>Course Name</th>
                              <th className="text-center">Units</th>
                              <th className="text-center">Grade</th>
                              <th className="text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courses.map((course) => (
                              <tr key={course.id}>
                                <td className="text-nowrap fw-medium">
                                  {course.Course?.code || 'N/A'}
                                </td>
                                <td>{course.Course?.name || 'N/A'}</td>
                                <td className="text-center">
                                  {course.Course?.units ?? '—'}
                                </td>
                                <td className="text-center">{course.grade || '—'}</td>
                                <td className="text-center">
                                  <Badge
                                    bg={statusVariant(course.status)}
                                    text={
                                      course.status === 'not yet taken' ? 'dark' : undefined
                                    }
                                    className="text-uppercase"
                                  >
                                    {course.status || 'pending'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    );
                  })
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </>
  );
};

export default SARLayout;
