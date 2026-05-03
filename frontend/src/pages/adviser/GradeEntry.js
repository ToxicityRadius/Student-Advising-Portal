import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import useSarData from '../../hooks/useSarData';
import AdviserLayout from '../../components/adviser/AdviserLayout';
import BulkGradeImportModal from '../../components/adviser/BulkGradeImportModal';
import { getErrorMessage } from '../../utils/errorHelpers';
import { useNotificationContext } from '../../context/NotificationContext';

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
  officially_dropped: 'Officially Dropped',
  unofficially_dropped: 'Unofficially Dropped',
};

const normalizeSpecialOption = (value) => {
  if (!value) {
    return '';
  }

  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'INC') {
    return '4.00';
  }

  if (normalized === 'PENDING') {
    return 'Pending';
  }

  const num = Number(value);
  if ([4, 5, 6, 7].includes(num)) {
    return `${num}.00`;
  }

  return '';
};

const deriveStatusFromGrade = (gradeInput) => {
  if (gradeInput === null || gradeInput === undefined || String(gradeInput).trim() === '') {
    return 'pending';
  }

  const text = String(gradeInput).trim().toUpperCase();
  if (text === 'INC') {
    return 'incomplete';
  }

  if (text === 'PENDING') {
    return 'pending';
  }

  const numeric = Number(gradeInput);
  if (!Number.isFinite(numeric)) {
    return 'pending';
  }

  if (numeric >= 1 && numeric <= 3) {
    return 'passed';
  }

  if (numeric === 4) {
    return 'incomplete';
  }

  if (numeric === 5) {
    return 'failed';
  }

  if (numeric === 6) {
    return 'officially_dropped';
  }

  if (numeric === 7) {
    return 'unofficially_dropped';
  }

  return 'pending';
};

const slotIndexFromYearSemester = (yearLevel, semester) =>
  (Number(yearLevel || 1) - 1) * 3 + (Number(semester || 1) - 1);

const yearSemesterFromSlotIndex = (slotIndex) => ({
  yearLevel: Math.floor(Number(slotIndex || 0) / 3) + 1,
  semester: (Number(slotIndex || 0) % 3) + 1,
});

const nextTermAfter = (yearLevel, semester) =>
  yearSemesterFromSlotIndex(slotIndexFromYearSemester(yearLevel, semester) + 1);

const isRetakeStatus = (status) =>
  ['failed', 'dropped', 'officially_dropped', 'unofficially_dropped'].includes(status);

const isAwaitingGradeStatus = (status) => status === 'pending' || status === 'incomplete';

const GradeEntry = () => {
  const navigate = useNavigate();
  const { sarId } = useParams();

  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [requestingInactiveApproval, setRequestingInactiveApproval] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [activeVersion, setActiveVersion] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [inactiveApproval, setInactiveApproval] = useState({
    loading: false,
    status: 'none',
    request: null,
  });
  const { sar, versions, loading, error: sarFetchError, reload } = useSarData(sarId);
  const { notifications } = useNotificationContext();
  const assignedCurriculum = sar?.Curriculum || sar?.curriculum || null;
  const curriculumIsInactive = assignedCurriculum?.isActive === false;
  const inactiveApprovalNotificationSignal = useMemo(
    () =>
      (notifications || [])
        .filter((notification) =>
          String(notification?.category || '').startsWith('inactive_curriculum_regeneration_'),
        )
        .map((notification) => `${notification.id || ''}:${notification.category || ''}`)
        .join('|'),
    [notifications],
  );
  const inactiveApprovalStatus = inactiveApproval.status || 'none';
  const inactiveRegenerationApproved =
    !curriculumIsInactive || inactiveApprovalStatus === 'approved';

  useEffect(() => {
    if (loading) return;
    if (sarFetchError) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(sarFetchError, 'Failed to load grade entry data.'),
      });
      setActiveVersion(null);
      setRows([]);
      setSummary(null);
      return;
    }
    const active = versions.find((v) => v.status === 'active') || null;
    setActiveVersion(active);
    if (!active) {
      setRows([]);
      return;
    }
    setRows(
      (active.StudyPlanCourses || []).map((courseEntry) => {
        const retakeTerm = nextTermAfter(courseEntry.yearLevel, courseEntry.semester);
        const specialChoice = normalizeSpecialOption(courseEntry.grade);

        return {
          id: courseEntry.id,
          courseId: courseEntry.courseId,
          code: courseEntry.Course?.code || 'No code',
          name: courseEntry.Course?.name || 'Unnamed course',
          units: Number(courseEntry.Course?.units || 0),
          yearLevel: courseEntry.yearLevel,
          semester: courseEntry.semester,
          specialChoice,
          numericGrade: specialChoice ? '' : courseEntry.grade || '',
          status: courseEntry.status || deriveStatusFromGrade(courseEntry.grade),
          retakeYearLevel: retakeTerm.yearLevel,
          retakeSemester: retakeTerm.semester,
          overrideRequests: {},
        };
      }),
    );
  }, [loading, versions, sarFetchError]);

  useEffect(() => {
    let cancelled = false;

    const loadInactiveApproval = async () => {
      if (!curriculumIsInactive || !activeVersion?.id || !sarId) {
        setInactiveApproval({ loading: false, status: 'none', request: null });
        return;
      }

      setInactiveApproval((current) => ({ ...current, loading: true }));

      try {
        const response = await api.get('/inactive-curriculum-regeneration-requests', {
          params: {
            studentAcademicRecordId: sarId,
            studyPlanVersionId: activeVersion.id,
            pageSize: 5,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
        });
        const requests = response.data?.data || response.data?.items || [];
        const matchedRequest =
          requests.find((request) => request.status === 'approved') ||
          requests.find((request) => request.status === 'pending') ||
          requests[0] ||
          null;

        if (!cancelled) {
          setInactiveApproval({
            loading: false,
            status: matchedRequest?.status || 'none',
            request: matchedRequest,
          });
        }
      } catch {
        if (!cancelled) {
          setInactiveApproval({ loading: false, status: 'error', request: null });
        }
      }
    };

    loadInactiveApproval();

    return () => {
      cancelled = true;
    };
  }, [activeVersion?.id, curriculumIsInactive, inactiveApprovalNotificationSignal, sarId]);

  const dependentCoursesByPrereqId = useMemo(() => {
    const map = new Map();
    const subjects = sar?.analytics?.prerequisiteChecking?.subjects || [];

    subjects.forEach((subject) => {
      (subject.prerequisites || []).forEach((prerequisite) => {
        const key = String(prerequisite.courseId);
        const list = map.get(key) || [];

        list.push({
          courseId: subject.courseId,
          code: subject.code,
          name: subject.name,
        });
        map.set(key, list);
      });
    });

    return map;
  }, [sar]);

  const yearLevelOptions = useMemo(() => {
    const maxYearLevel = Math.max(
      1,
      ...rows.map((row) => Number(row.yearLevel || 1)),
      ...rows.map((row) => Number(row.retakeYearLevel || 1)),
    );

    return Array.from({ length: maxYearLevel + 2 }, (_, index) => index + 1);
  }, [rows]);

  const completedGradeCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          !isAwaitingGradeStatus(deriveStatusFromGrade(row.specialChoice || row.numericGrade)),
      ).length,
    [rows],
  );

  const pendingCount = useMemo(
    () =>
      rows.filter((row) =>
        isAwaitingGradeStatus(deriveStatusFromGrade(row.specialChoice || row.numericGrade)),
      ).length,
    [rows],
  );

  const allPassed = useMemo(
    () =>
      rows.length > 0 &&
      rows.every(
        (row) => deriveStatusFromGrade(row.specialChoice || row.numericGrade) === 'passed',
      ),
    [rows],
  );

  const canRegenerate = rows.length > 0 && completedGradeCount > 0 && !allPassed;

  const updateRow = (rowId, updates) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)),
    );
  };

  const updateOverrideRequest = (rowId, dependentCourseId, updates) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const key = String(dependentCourseId);
        return {
          ...row,
          overrideRequests: {
            ...(row.overrideRequests || {}),
            [key]: {
              enabled: false,
              reason: '',
              ...((row.overrideRequests || {})[key] || {}),
              ...updates,
            },
          },
        };
      }),
    );
  };

  const handleSave = async () => {
    if (!activeVersion) {
      return;
    }

    setSaving(true);
    setAlert({ variant: '', message: '' });

    try {
      const payload = rows.map((row) => {
        const chosenGrade = row.specialChoice || row.numericGrade;
        const status = deriveStatusFromGrade(chosenGrade);

        return {
          studyPlanCourseId: row.id,
          grade: chosenGrade || null,
          status,
        };
      });

      const response = await api.put(`/sars/${sarId}/study-plan/active-version/grades`, {
        grades: payload,
      });
      const serverSummary = response.data?.summary || null;

      setAlert({ variant: 'success', message: 'Grades saved successfully.' });
      await reload();
      setSummary(serverSummary);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to save grades.') });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeVersion) {
      return;
    }

    setRegenerating(true);
    setAlert({ variant: '', message: '' });

    try {
      const retakePlacements = [];
      const prerequisiteOverrideRequests = [];

      rows.forEach((row) => {
        const status = deriveStatusFromGrade(row.specialChoice || row.numericGrade);
        if (!isRetakeStatus(status)) {
          return;
        }

        const yearLevel = Number(row.retakeYearLevel);
        const semester = Number(row.retakeSemester);
        retakePlacements.push({
          studyPlanCourseId: row.id,
          yearLevel,
          semester,
        });

        Object.entries(row.overrideRequests || {}).forEach(([dependentCourseId, request]) => {
          if (!request?.enabled) {
            return;
          }

          const reason = String(request.reason || '').trim();
          if (!reason) {
            throw new Error(`Enter a reason for the ${row.code} prerequisite override request.`);
          }

          prerequisiteOverrideRequests.push({
            prerequisiteCourseId: row.courseId,
            dependentCourseId: Number(dependentCourseId),
            yearLevel,
            semester,
            reason,
          });
        });
      });

      const response = await api.post(`/sars/${sarId}/study-plan/regenerate`, {
        retakePlacements,
        prerequisiteOverrideRequests,
      });
      const newVersion = response.data?.data;

      if (!newVersion?.id) {
        throw new Error('Regeneration did not return a new version');
      }

      navigate(`/adviser/students/${sarId}/plan/${newVersion.id}/review`, {
        state: {
          previousVersion: activeVersion,
          regeneratedVersion: newVersion,
          failedCourseAnalysis: response.data?.failedCourseAnalysis || null,
          graduationPacing: response.data?.graduationPacing || null,
          curriculumMigrationRecommendation:
            response.data?.curriculumMigrationRecommendation || null,
        },
      });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to regenerate study plan.'),
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleRequestInactiveApproval = async () => {
    if (!assignedCurriculum) {
      return;
    }

    setRequestingInactiveApproval(true);
    setAlert({ variant: '', message: '' });

    try {
      const response = await api.post(
        `/sars/${sarId}/study-plan/inactive-curriculum-regeneration-request`,
        {
          reason: `Student is assigned to inactive ${assignedCurriculum.name || 'curriculum'} and needs Program Chair approval before regeneration.`,
        },
      );
      const request = response.data?.data || null;
      setInactiveApproval({
        loading: false,
        status: request?.status || 'pending',
        request,
      });
      setAlert({
        variant: 'success',
        message: 'Program Chair approval request submitted.',
      });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to request Program Chair approval.'),
      });
    } finally {
      setRequestingInactiveApproval(false);
    }
  };

  const handleBulkImportComplete = async (grades) => {
    setBulkImporting(true);
    setAlert({ variant: '', message: '' });
    try {
      const res = await api.post(`/sars/${sarId}/study-plan/active-version/grades/bulk-import`, {
        rows: grades,
      });
      const result = res.data || {};
      setAlert({
        variant: 'success',
        message: `Imported ${result.imported ?? grades.length} grades successfully.`,
      });
      setShowBulkImport(false);
      await reload();
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Bulk import failed.') });
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <AdviserLayout activePage="students" pageTitle="Grade Entry">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Grade Entry</h2>
          <p className="text-muted mb-0">
            Enter transcript grades for the active study plan version.
          </p>
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
      ) : !activeVersion ? (
        <Card className="shadow-sm">
          <Card.Body>
            <p className="mb-0 text-muted">
              No active study plan version exists for this student yet.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm mb-4">
            <Card.Body className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
              <div>
                <h5 className="mb-1">{sar?.studentName || 'Student'}</h5>
                <div className="text-muted">Version {activeVersion.versionNumber} • Active</div>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                {summary && (
                  <>
                    <Badge bg="success">Passed: {summary.passed || 0}</Badge>
                    <Badge bg="danger">Failed: {summary.failed || 0}</Badge>
                    <Badge bg="dark">Incomplete: {summary.incomplete || 0}</Badge>
                  </>
                )}
                {allPassed && <Badge bg="success">All courses passed</Badge>}
              </div>
            </Card.Body>
          </Card>

          {curriculumIsInactive && (
            <Alert
              variant={inactiveApprovalStatus === 'approved' ? 'success' : 'warning'}
              className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
            >
              <div>
                <div className="fw-semibold">
                  {inactiveApprovalStatus === 'approved'
                    ? 'Inactive curriculum approval recorded'
                    : 'Inactive curriculum'}
                </div>
                {inactiveApprovalStatus === 'approved' ? (
                  <div>
                    Program Chair approval is recorded for{' '}
                    {assignedCurriculum.name || 'this inactive curriculum'} and this active study
                    plan version. Regeneration is available.
                  </div>
                ) : inactiveApprovalStatus === 'pending' ? (
                  <div>
                    This SAR uses {assignedCurriculum.name || 'an inactive curriculum'}. A Program
                    Chair approval request is pending before regeneration can continue.
                  </div>
                ) : inactiveApprovalStatus === 'rejected' ? (
                  <div>
                    This SAR uses {assignedCurriculum.name || 'an inactive curriculum'}. The latest
                    Program Chair approval request was rejected.
                  </div>
                ) : (
                  <div>
                    This SAR uses {assignedCurriculum.name || 'an inactive curriculum'}. Program
                    Chair approval is required before regenerating the study plan.
                  </div>
                )}
              </div>
              {inactiveApprovalStatus === 'approved' ? (
                <Badge bg="success">Approved</Badge>
              ) : (
                <Button
                  variant="outline-dark"
                  size="sm"
                  onClick={handleRequestInactiveApproval}
                  disabled={
                    requestingInactiveApproval ||
                    inactiveApproval.loading ||
                    inactiveApprovalStatus === 'pending'
                  }
                >
                  {requestingInactiveApproval
                    ? 'Requesting...'
                    : inactiveApproval.loading
                      ? 'Checking...'
                      : inactiveApprovalStatus === 'pending'
                        ? 'Approval Pending'
                        : 'Request Program Chair Approval'}
                </Button>
              )}
            </Alert>
          )}

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Table responsive hover className="table-fixed-cols grade-entry-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '24%' }}>
                      Course
                    </th>
                    <th scope="col" style={{ width: '6%' }}>
                      Units
                    </th>
                    <th scope="col" style={{ width: '10%' }}>
                      Slot
                    </th>
                    <th scope="col" style={{ width: '16%' }}>
                      Numeric Grade
                    </th>
                    <th scope="col" style={{ width: '14%' }}>
                      Special
                    </th>
                    <th scope="col" style={{ width: '22%' }}>
                      Retake Term
                    </th>
                    <th scope="col" style={{ width: '8%' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const derivedStatus = deriveStatusFromGrade(
                      row.specialChoice || row.numericGrade,
                    );
                    const dependentCourses =
                      dependentCoursesByPrereqId.get(String(row.courseId)) || [];

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="fw-semibold">{row.code}</div>
                          <div className="text-muted small">{row.name}</div>
                        </td>
                        <td>{row.units}</td>
                        <td>
                          Y{row.yearLevel} • S{row.semester}
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            min="1"
                            max="3"
                            step="0.25"
                            value={row.numericGrade}
                            disabled={Boolean(row.specialChoice)}
                            onChange={(event) =>
                              updateRow(row.id, { numericGrade: event.target.value })
                            }
                            placeholder="1.00 – 3.00"
                          />
                        </td>
                        <td>
                          <Form.Select
                            value={row.specialChoice}
                            onChange={(event) => {
                              const nextSpecial = event.target.value;
                              updateRow(row.id, {
                                specialChoice: nextSpecial,
                                numericGrade: nextSpecial ? '' : row.numericGrade,
                              });
                            }}
                          >
                            <option value="">None</option>
                            <option value="4.00">4.00 — Incomplete</option>
                            <option value="5.00">5.00 — Failed</option>
                            <option value="6.00">6.00 — Officially Dropped</option>
                            <option value="7.00">7.00 — Unofficially Dropped</option>
                            <option value="Pending">Pending</option>
                          </Form.Select>
                        </td>
                        <td>
                          {isRetakeStatus(derivedStatus) ? (
                            <div className="d-flex flex-column gap-2">
                              <div className="d-flex gap-2">
                                <Form.Select
                                  size="sm"
                                  aria-label={`${row.code} retake year`}
                                  value={row.retakeYearLevel}
                                  onChange={(event) =>
                                    updateRow(row.id, { retakeYearLevel: event.target.value })
                                  }
                                >
                                  {yearLevelOptions.map((yearLevel) => (
                                    <option key={yearLevel} value={yearLevel}>
                                      Y{yearLevel}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Form.Select
                                  size="sm"
                                  aria-label={`${row.code} retake semester`}
                                  value={row.retakeSemester}
                                  onChange={(event) =>
                                    updateRow(row.id, { retakeSemester: event.target.value })
                                  }
                                >
                                  <option value={1}>S1</option>
                                  <option value={2}>S2</option>
                                  <option value={3}>Summer</option>
                                </Form.Select>
                              </div>

                              {dependentCourses.map((dependentCourse) => {
                                const key = String(dependentCourse.courseId);
                                const request = (row.overrideRequests || {})[key] || {};

                                return (
                                  <div key={key} className="border-start border-warning ps-2 small">
                                    <Form.Check
                                      type="checkbox"
                                      className="small"
                                      aria-label={`Request same-term override with ${dependentCourse.code}`}
                                      label={`Request same-term override with ${dependentCourse.code}`}
                                      checked={Boolean(request.enabled)}
                                      onChange={(event) =>
                                        updateOverrideRequest(row.id, key, {
                                          enabled: event.target.checked,
                                        })
                                      }
                                    />
                                    {request.enabled && (
                                      <Form.Control
                                        as="textarea"
                                        rows={2}
                                        size="sm"
                                        className="mt-2"
                                        aria-label={`Reason for ${row.code} and ${dependentCourse.code} override`}
                                        value={request.reason || ''}
                                        onChange={(event) =>
                                          updateOverrideRequest(row.id, key, {
                                            reason: event.target.value,
                                          })
                                        }
                                        placeholder="Reason for concurrent enrollment"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted small">Not required</span>
                          )}
                        </td>
                        <td>
                          <Badge
                            bg={statusVariant[derivedStatus] || 'secondary'}
                            className="text-uppercase"
                          >
                            {statusLabel[derivedStatus] || derivedStatus}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-muted py-4"
                        style={{ textAlign: 'left', whiteSpace: 'normal' }}
                      >
                        No courses available in the active version.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <div className="d-flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || rows.length === 0}>
              {saving ? 'Saving...' : 'Save Grades'}
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => setShowBulkImport(true)}
              disabled={saving || regenerating}
            >
              Import CSV
            </Button>
            {canRegenerate ? (
              <Button
                variant="warning"
                onClick={handleRegenerate}
                disabled={regenerating || saving || !inactiveRegenerationApproved}
              >
                {regenerating ? 'Regenerating...' : 'Regenerate Study Plan'}
              </Button>
            ) : pendingCount > 0 ? (
              <Button variant="outline-secondary" disabled>
                Awaiting grade completion
              </Button>
            ) : (
              <Button variant="outline-success" disabled>
                All courses passed
              </Button>
            )}
          </div>

          <BulkGradeImportModal
            show={showBulkImport}
            onHide={() => setShowBulkImport(false)}
            onImport={handleBulkImportComplete}
            sarId={sarId}
            importing={bulkImporting}
          />
        </>
      )}
    </AdviserLayout>
  );
};

export default GradeEntry;
