import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, ListGroup, Row, Spinner, Table } from 'react-bootstrap';
import api from '../../utils/api';

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const semesterLabels = {
  1: '1st Semester',
  2: '2nd Semester',
  3: 'Summer'
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Date(Number(value)).toLocaleString();
};

const getYearSemesterKey = (course) => `${course.yearLevel}-${course.semester}`;

const MyRecord = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [sar, setSar] = useState(null);

  const loadMyRecord = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const listResponse = await api.get('/sars');
      const ownSar = Array.isArray(listResponse.data?.data) ? listResponse.data.data[0] : null;

      if (!ownSar) {
        setSar(null);
        return;
      }

      const sarResponse = await api.get(`/sars/${ownSar.id}`);
      setSar(sarResponse.data?.data || null);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load your academic record.') });
      setSar(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyRecord();
  }, [loadMyRecord]);

  const activeVersion = sar?.activeStudyPlanVersion || null;

  const groupedCourses = useMemo(() => {
    const courses = Array.isArray(activeVersion?.StudyPlanCourses) ? [...activeVersion.StudyPlanCourses] : [];

    courses.sort((left, right) => {
      if (Number(left.yearLevel) !== Number(right.yearLevel)) {
        return Number(left.yearLevel) - Number(right.yearLevel);
      }

      if (Number(left.semester) !== Number(right.semester)) {
        return Number(left.semester) - Number(right.semester);
      }

      return String(left.Course?.code || '').localeCompare(String(right.Course?.code || ''));
    });

    return courses.reduce((accumulator, course) => {
      const key = getYearSemesterKey(course);
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(course);
      return accumulator;
    }, {});
  }, [activeVersion]);

  const sortedYearSemesterKeys = useMemo(() => {
    return Object.keys(groupedCourses).sort((left, right) => {
      const [leftYear, leftSemester] = left.split('-').map(Number);
      const [rightYear, rightSemester] = right.split('-').map(Number);

      if (leftYear !== rightYear) {
        return leftYear - rightYear;
      }

      return leftSemester - rightSemester;
    });
  }, [groupedCourses]);

  const handleExportPDF = async () => {
    if (!sar?.id) {
      return;
    }

    setExporting(true);
    setAlert({ variant: '', message: '' });

    try {
      const response = await api.get(`/sars/${sar.id}/export/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SAR-${sar.studentNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to export the record as PDF.') });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">My Academic Record</h2>
          <p className="text-muted mb-0">View your student record and active study plan details.</p>
        </div>
        <Button onClick={handleExportPDF} disabled={!sar?.id || exporting}>
          {exporting ? 'Exporting...' : 'Export as PDF'}
        </Button>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : !sar ? (
        <Card className="shadow-sm">
          <Card.Body>
            <p className="text-muted mb-0">No academic record is linked to your account yet.</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Row className="g-4 mb-4">
            <Col lg={6}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <h5 className="mb-3">Student Information</h5>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Name</span>
                      <strong>{sar.studentName}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Student Number</span>
                      <strong>{sar.studentNumber}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Email</span>
                      <strong>{sar.email}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Year Level</span>
                      <strong>Year {sar.yearLevel}</strong>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <h5 className="mb-3">Program Information</h5>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Curriculum</span>
                      <strong>{sar.Curriculum?.name || 'N/A'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Elective Track</span>
                      <strong>{sar.ElectiveTrack?.name || 'Not selected'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between align-items-center">
                      <span className="text-muted">Active Plan</span>
                      {activeVersion ? (
                        <Badge bg="success">Version {activeVersion.versionNumber}</Badge>
                      ) : (
                        <Badge bg="secondary">No active version</Badge>
                      )}
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 d-flex justify-content-between">
                      <span className="text-muted">Validated At</span>
                      <strong>{formatDateTime(activeVersion?.validatedAt)}</strong>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Active Study Plan</h5>

              {!activeVersion ? (
                <p className="text-muted mb-0">No active study plan version is available yet.</p>
              ) : sortedYearSemesterKeys.length === 0 ? (
                <p className="text-muted mb-0">The active study plan has no scheduled courses.</p>
              ) : (
                sortedYearSemesterKeys.map((key) => {
                  const [yearLevel, semester] = key.split('-').map(Number);
                  const courses = groupedCourses[key] || [];

                  return (
                    <div key={key} className="mb-4">
                      <h6 className="mb-2">Year {yearLevel} - {semesterLabels[semester] || `Semester ${semester}`}</h6>
                      <Table responsive hover size="sm">
                        <thead>
                          <tr>
                            <th>Course Code</th>
                            <th>Course Name</th>
                            <th className="text-end">Units</th>
                            <th className="text-end">Grade</th>
                            <th className="text-end">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map((course) => (
                            <tr key={course.id}>
                              <td>{course.Course?.code || 'N/A'}</td>
                              <td>{course.Course?.name || 'N/A'}</td>
                              <td className="text-end">{course.Course?.units ?? '-'}</td>
                              <td className="text-end">{course.grade || 'Pending'}</td>
                              <td className="text-end text-uppercase">{course.status || 'pending'}</td>
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
        </>
      )}
    </div>
  );
};

export default MyRecord;
