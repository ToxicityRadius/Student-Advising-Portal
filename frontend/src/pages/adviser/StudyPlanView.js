import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
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

const StudyPlanView = () => {
  const { sarId, versionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sar, setSar] = useState(null);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    const loadPlan = async () => {
      setLoading(true);
      setError('');

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
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Failed to load the study plan version.'));
        setSar(null);
        setVersion(null);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [sarId, versionId]);

  const groupedCourses = useMemo(() => {
    const groups = new Map();

    if (!version?.StudyPlanCourses) {
      return [];
    }

    version.StudyPlanCourses.forEach((courseEntry) => {
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
  }, [version]);

  return (
    <AdviserLayout activePage="students" pageTitle="Study Plan View">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Study Plan View</h2>
          <p className="text-muted mb-0">Read-only view of the generated study plan version.</p>
        </div>
        <Button as={Link} to={`/adviser/students/${sarId}`} variant="outline-secondary">
          Back to Record
        </Button>
      </div>

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
        </>
      ) : null}
    </AdviserLayout>
  );
};

export default StudyPlanView;