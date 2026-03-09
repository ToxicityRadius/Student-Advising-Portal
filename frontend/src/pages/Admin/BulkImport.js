import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import api from '../../utils/api';

const BulkImport = () => {
  // ── Users import state ──
  const [userFile, setUserFile] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userResult, setUserResult] = useState(null);
  const [userError, setUserError] = useState('');

  // ── Grades import state ──
  const [gradeFile, setGradeFile] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [gradeError, setGradeError] = useState('');

  // ── Subjects import state ──
  const [subjectFile, setSubjectFile] = useState(null);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectResult, setSubjectResult] = useState(null);
  const [subjectError, setSubjectError] = useState('');

  // ── Import Users ──
  const handleUserImport = async (e) => {
    e.preventDefault();
    if (!userFile) return;

    setUserLoading(true);
    setUserError('');
    setUserResult(null);

    const formData = new FormData();
    formData.append('file', userFile);

    try {
      const res = await api.post('/import/users', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUserResult(res.data);
    } catch (err) {
      setUserError(err.response?.data?.message || 'Import failed');
    } finally {
      setUserLoading(false);
    }
  };

  // ── Import Grades ──
  const handleGradeImport = async (e) => {
    e.preventDefault();
    if (!gradeFile) return;

    setGradeLoading(true);
    setGradeError('');
    setGradeResult(null);

    const formData = new FormData();
    formData.append('file', gradeFile);

    try {
      const res = await api.post('/import/grades', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGradeResult(res.data);
    } catch (err) {
      setGradeError(err.response?.data?.message || 'Import failed');
    } finally {
      setGradeLoading(false);
    }
  };

  // ── Import Subjects ──
  const handleSubjectImport = async (e) => {
    e.preventDefault();
    if (!subjectFile) return;

    setSubjectLoading(true);
    setSubjectError('');
    setSubjectResult(null);

    const formData = new FormData();
    formData.append('file', subjectFile);

    try {
      const res = await api.post('/import/subjects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubjectResult(res.data);
    } catch (err) {
      setSubjectError(err.response?.data?.message || 'Import failed');
    } finally {
      setSubjectLoading(false);
    }
  };

  const renderResult = (result) => {
    if (!result) return null;
    return (
      <Alert variant="success" className="mt-3">
        <strong>{result.message}</strong>
        {result.data && (
          <div className="mt-2">
            <small>
              Created: {result.data.created} | Skipped: {result.data.skipped}
              {result.data.prereqCreated !== undefined && ` | Prerequisites linked: ${result.data.prereqCreated}`}
            </small>
            {result.data.errors && result.data.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-danger">
                  {result.data.errors.length} error(s)
                </summary>
                <ul className="mb-0 mt-1">
                  {result.data.errors.map((e, i) => (
                    <li key={i}>
                      <small>{e.reason}</small>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </Alert>
    );
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Bulk Import</h2>

      <Row className="g-4">
        {/* ── Student Masterlist Import ── */}
        <Col md={6}>
          <Card>
            <Card.Header className="bg-warning text-dark fw-bold">
              Import Student Masterlist
            </Card.Header>
            <Card.Body>
              <p className="text-muted small mb-3">
                Upload a CSV file with columns: <code>studentId</code>, <code>firstName</code>, <code>lastName</code>, <code>email</code>.
                <br />
                Existing users (by email) will be skipped. New users receive a default password.
              </p>
              <Form onSubmit={handleUserImport}>
                <Form.Group className="mb-3">
                  <Form.Label>CSV File</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    onChange={e => setUserFile(e.target.files[0])}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="warning" disabled={userLoading || !userFile}>
                  {userLoading ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Importing...
                    </>
                  ) : (
                    'Import Users'
                  )}
                </Button>
              </Form>

              {userError && <Alert variant="danger" className="mt-3">{userError}</Alert>}
              {renderResult(userResult)}
            </Card.Body>
          </Card>
        </Col>

        {/* ── Historical Grades Import ── */}
        <Col md={6}>
          <Card>
            <Card.Header className="bg-warning text-dark fw-bold">
              Import Historical Grades
            </Card.Header>
            <Card.Body>
              <p className="text-muted small mb-3">
                Upload a CSV file with columns: <code>studentId</code>, <code>course_code</code>, <code>grade_value</code>, <code>term_taken</code>.
                <br />
                The student and subject must already exist. Grades are imported as "verified".
              </p>
              <Form onSubmit={handleGradeImport}>
                <Form.Group className="mb-3">
                  <Form.Label>CSV File</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    onChange={e => setGradeFile(e.target.files[0])}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="warning" disabled={gradeLoading || !gradeFile}>
                  {gradeLoading ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Importing...
                    </>
                  ) : (
                    'Import Grades'
                  )}
                </Button>
              </Form>

              {gradeError && <Alert variant="danger" className="mt-3">{gradeError}</Alert>}
              {renderResult(gradeResult)}
            </Card.Body>
          </Card>
        </Col>

        {/* ── Curriculum Subjects Import ── */}
        <Col md={6}>
          <Card>
            <Card.Header className="bg-warning text-dark fw-bold">
              Import Curriculum Subjects
            </Card.Header>
            <Card.Body>
              <p className="text-muted small mb-3">
                Upload a CSV file with columns: <code>curriculum_year</code>, <code>course_code</code>, <code>descriptive_title</code>, <code>lecture_hours</code>, <code>laboratory_hours</code>, <code>credit_units</code>, <code>prerequisite</code>.
                <br />
                The <code>curriculum_year</code> must match an existing curriculum (e.g., <em>BS CpE – 2025</em>). Use comma-separated values in <code>prerequisite</code> for multiple prereqs. Existing subjects are skipped.
              </p>
              <Form onSubmit={handleSubjectImport}>
                <Form.Group className="mb-3">
                  <Form.Label>CSV File</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    onChange={e => setSubjectFile(e.target.files[0])}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="warning" disabled={subjectLoading || !subjectFile}>
                  {subjectLoading ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Importing...
                    </>
                  ) : (
                    'Import Subjects'
                  )}
                </Button>
              </Form>

              {subjectError && <Alert variant="danger" className="mt-3">{subjectError}</Alert>}
              {renderResult(subjectResult)}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BulkImport;
