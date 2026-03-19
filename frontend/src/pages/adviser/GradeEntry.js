import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import AdviserLayout from '../../components/adviser/AdviserLayout';
import { getErrorMessage } from '../../utils/errorHelpers';

const statusVariant = {
  pending: 'secondary',
  passed: 'success',
  failed: 'danger',
  dropped: 'warning',
  incomplete: 'dark'
};

const normalizeSpecialOption = (value) => {
  if (!value) {
    return '';
  }

  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'INC') {
    return 'INC';
  }

  if (normalized === 'PENDING') {
    return 'Pending';
  }

  if (Number(value) === 4) {
    return '4.00';
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

  if (numeric <= 3) {
    return 'passed';
  }

  if (numeric === 4) {
    return 'dropped';
  }

  return 'failed';
};

const GradeEntry = () => {
  const navigate = useNavigate();
  const { sarId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [sar, setSar] = useState(null);
  const [activeVersion, setActiveVersion] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const [sarResponse, versionsResponse] = await Promise.all([
        api.get(`/sars/${sarId}`),
        api.get(`/sars/${sarId}/study-plan/versions`)
      ]);

      const allVersions = versionsResponse.data?.data || [];
      const active = allVersions.find((version) => version.status === 'active') || null;

      setSar(sarResponse.data?.data || null);
      setActiveVersion(active);

      if (!active) {
        setRows([]);
        return;
      }

      setRows(
        (active.StudyPlanCourses || []).map((courseEntry) => ({
          id: courseEntry.id,
          courseId: courseEntry.courseId,
          code: courseEntry.Course?.code || 'No code',
          name: courseEntry.Course?.name || 'Unnamed course',
          units: Number(courseEntry.Course?.units || 0),
          yearLevel: courseEntry.yearLevel,
          semester: courseEntry.semester,
          specialChoice: normalizeSpecialOption(courseEntry.grade),
          numericGrade: normalizeSpecialOption(courseEntry.grade) ? '' : (courseEntry.grade || ''),
          status: courseEntry.status || deriveStatusFromGrade(courseEntry.grade)
        }))
      );
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load grade entry data.') });
      setSar(null);
      setActiveVersion(null);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [sarId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unresolvedCount = useMemo(
    () => rows.filter((row) => ['failed', 'dropped', 'incomplete'].includes(deriveStatusFromGrade(row.specialChoice || row.numericGrade))).length,
    [rows]
  );

  const allPassed = useMemo(
    () => rows.length > 0 && rows.every((row) => deriveStatusFromGrade(row.specialChoice || row.numericGrade) === 'passed'),
    [rows]
  );

  const updateRow = (rowId, updates) => {
    setRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
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
          status
        };
      });

      const response = await api.put(`/sars/${sarId}/study-plan/active-version/grades`, { grades: payload });
      const serverSummary = response.data?.summary || null;

      setAlert({ variant: 'success', message: 'Grades saved successfully.' });
      await loadData();
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
      const response = await api.post(`/sars/${sarId}/study-plan/regenerate`);
      const newVersion = response.data?.data;

      if (!newVersion?.id) {
        throw new Error('Regeneration did not return a new version');
      }

      navigate(`/adviser/students/${sarId}/plan/${newVersion.id}/review`, {
        state: {
          previousVersion: activeVersion,
          regeneratedVersion: newVersion
        }
      });
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to regenerate study plan.') });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <AdviserLayout activePage="students" pageTitle="Grade Entry">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Grade Entry</h2>
          <p className="text-muted mb-0">Enter transcript grades for the active study plan version.</p>
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
            <p className="mb-0 text-muted">No active study plan version exists for this student yet.</p>
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

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Table responsive hover className="table-fixed-cols">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '28%' }}>Course</th>
                    <th scope="col" style={{ width: '8%' }}>Units</th>
                    <th scope="col" style={{ width: '12%' }}>Slot</th>
                    <th scope="col" style={{ width: '20%' }}>Numeric Grade</th>
                    <th scope="col" style={{ width: '18%' }}>Special</th>
                    <th scope="col" style={{ width: '14%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const derivedStatus = deriveStatusFromGrade(row.specialChoice || row.numericGrade);

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="fw-semibold">{row.code}</div>
                          <div className="text-muted small">{row.name}</div>
                        </td>
                        <td>{row.units}</td>
                        <td>Y{row.yearLevel} • S{row.semester}</td>
                        <td>
                          <Form.Control
                            type="number"
                            min="1"
                            max="5"
                            step="0.25"
                            value={row.numericGrade}
                            disabled={Boolean(row.specialChoice)}
                            onChange={(event) => updateRow(row.id, { numericGrade: event.target.value })}
                            placeholder="e.g. 2.00"
                          />
                        </td>
                        <td>
                          <Form.Select
                            value={row.specialChoice}
                            onChange={(event) => {
                              const nextSpecial = event.target.value;
                              updateRow(row.id, {
                                specialChoice: nextSpecial,
                                numericGrade: nextSpecial ? '' : row.numericGrade
                              });
                            }}
                          >
                            <option value="">None</option>
                            <option value="INC">INC</option>
                            <option value="4.00">4.00</option>
                            <option value="Pending">Pending</option>
                          </Form.Select>
                        </td>
                        <td>
                          <Badge bg={statusVariant[derivedStatus] || 'secondary'} className="text-uppercase">
                            {derivedStatus}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
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
            {unresolvedCount > 0 ? (
              <Button variant="warning" onClick={handleRegenerate} disabled={regenerating || saving}>
                {regenerating ? 'Regenerating...' : 'Regenerate Study Plan'}
              </Button>
            ) : (
              <Button variant="outline-success" disabled>
                All courses passed
              </Button>
            )}
          </div>
        </>
      )}
    </AdviserLayout>
  );
};

export default GradeEntry;