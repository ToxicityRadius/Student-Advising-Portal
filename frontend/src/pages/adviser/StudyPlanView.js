import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
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

const statusVariant = {
  pending: 'secondary',
  passed: 'success',
  failed: 'danger',
  dropped: 'warning',
  incomplete: 'dark'
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const buildEditableRows = (planVersion) => (planVersion?.StudyPlanCourses || []).map((courseEntry) => ({
  ...courseEntry,
  yearLevel: Number(courseEntry.yearLevel || 1),
  semester: Number(courseEntry.semester || 1)
}));

const StudyPlanView = () => {
  const { sarId, versionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [sar, setSar] = useState(null);
  const [version, setVersion] = useState(null);
  const [draftCourses, setDraftCourses] = useState([]);

  useEffect(() => {
    const loadPlan = async () => {
      setLoading(true);
      setError('');
      setAlert({ variant: '', message: '' });

      try {
        const [sarResponse, versionsResponse] = await Promise.all([
          api.get(`/sars/${sarId}`),
          api.get(`/sars/${sarId}/study-plan/versions`)
        ]);

        const matchedVersion = (versionsResponse.data?.data || []).find(
          (item) => String(item.id) === String(versionId)
        );

        if (!matchedVersion) {
          setError('Study plan version not found.');
          setSar(sarResponse.data?.data || null);
          setVersion(null);
          return;
        }

        setSar(sarResponse.data?.data || null);
        setVersion(matchedVersion);
        setDraftCourses(buildEditableRows(matchedVersion));
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Failed to load the study plan version.'));
        setSar(null);
        setVersion(null);
        setDraftCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [sarId, versionId]);

  const editable = version?.status === 'draft';

  const groupedCourses = useMemo(() => {
    const groups = new Map();
    const sourceCourses = editable ? draftCourses : (version?.StudyPlanCourses || []);

    if (!sourceCourses.length) {
      return [];
    }

    sourceCourses.forEach((courseEntry) => {
      const key = `${courseEntry.yearLevel}-${courseEntry.semester}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(courseEntry);
    });

    return Array.from(groups.entries())
      .sort(([leftKey], [rightKey]) => {
        const [leftYear, leftSemester] = leftKey.split('-').map(Number);
        const [rightYear, rightSemester] = rightKey.split('-').map(Number);

        if (leftYear !== rightYear) {
          return leftYear - rightYear;
        }

        return leftSemester - rightSemester;
      })
      .map(([key, entries]) => ({
        key,
        label: slotLabels[key] || `Year ${key.replace('-', ' • Semester ')}`,
        courses: entries
      }));
  }, [draftCourses, editable, version]);

  const availableYearLevels = useMemo(() => {
    const highestAssignedYear = Math.max(4, ...draftCourses.map((courseEntry) => Number(courseEntry.yearLevel || 1)));
    return Array.from({ length: highestAssignedYear + 2 }, (_, index) => index + 1);
  }, [draftCourses]);

  const updateDraftCourse = (courseId, field, value) => {
    setDraftCourses((currentCourses) => currentCourses.map((courseEntry) => (
      courseEntry.id === courseId
        ? { ...courseEntry, [field]: Number(value) }
        : courseEntry
    )));
  };

  const handleSaveDraft = async () => {
    if (!editable) {
      return;
    }

    setSaving(true);
    setAlert({ variant: '', message: '' });

    try {
      const response = await api.put(`/sars/${sarId}/study-plan/versions/${versionId}/courses`, {
        courses: draftCourses.map((courseEntry) => ({
          studyPlanCourseId: courseEntry.id,
          yearLevel: Number(courseEntry.yearLevel),
          semester: Number(courseEntry.semester)
        }))
      });

      const updatedVersion = response.data?.data || null;
      setVersion(updatedVersion);
      setDraftCourses(buildEditableRows(updatedVersion));
      setAlert({ variant: 'success', message: 'Draft study plan updated successfully.' });
    } catch (saveError) {
      setAlert({ variant: 'danger', message: getErrorMessage(saveError, 'Failed to update the draft study plan.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Study Plan View</h2>
          <p className="text-muted mb-0">
            {editable
              ? 'Update semester placements for this draft before validation.'
              : 'Read-only view of the generated study plan version.'}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {editable && (
            <Button as={Link} to={`/adviser/students/${sarId}/plan/${versionId}/validate`} variant="primary">
              Go to Validation
            </Button>
          )}
          <Button as={Link} to={`/adviser/students/${sarId}`} variant="outline-secondary">
            Back to Record
          </Button>
        </div>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : version ? (
        <>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                <div>
                  <h4 className="mb-1">{sar?.studentName || 'Student'}</h4>
                  <div className="text-muted">{sar?.studentNumber || 'No student number available'}</div>
                  <div className="text-muted">{sar?.Curriculum?.name || 'No curriculum assigned'}</div>
                </div>
                <div className="text-lg-end">
                  <div className="fw-semibold">Version {version.versionNumber}</div>
                  <Badge bg={version.status === 'active' ? 'success' : version.status === 'draft' ? 'secondary' : 'dark'} className="text-uppercase mt-2">
                    {version.status}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
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
                                    {editable && (
                                      <div className="d-flex flex-wrap gap-2 mt-3">
                                        <Form.Select
                                          size="sm"
                                          style={{ maxWidth: 140 }}
                                          value={courseEntry.yearLevel}
                                          onChange={(event) => updateDraftCourse(courseEntry.id, 'yearLevel', event.target.value)}
                                        >
                                          {availableYearLevels.map((yearLevel) => (
                                            <option key={yearLevel} value={yearLevel}>Year {yearLevel}</option>
                                          ))}
                                        </Form.Select>
                                        <Form.Select
                                          size="sm"
                                          style={{ maxWidth: 170 }}
                                          value={courseEntry.semester}
                                          onChange={(event) => updateDraftCourse(courseEntry.id, 'semester', event.target.value)}
                                        >
                                          <option value={1}>1st Semester</option>
                                          <option value={2}>2nd Semester</option>
                                          <option value={3}>Summer</option>
                                        </Form.Select>
                                      </div>
                                    )}
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
                        No courses were scheduled in this study plan version.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {editable && (
            <div className="d-flex flex-wrap gap-2 mt-4">
              <Button onClick={handleSaveDraft} disabled={saving || draftCourses.length === 0}>
                {saving ? 'Saving...' : 'Save Draft Changes'}
              </Button>
              <Button
                variant="outline-secondary"
                disabled={saving}
                onClick={() => setDraftCourses(buildEditableRows(version))}
              >
                Reset Changes
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default StudyPlanView;