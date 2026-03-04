import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  Table,
  Button,
  Spinner,
  Alert,
  Badge
} from 'react-bootstrap';
import api from '../utils/api';

const StudyPlan = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/advising/my-plan');
      setPlan(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load study plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleGenerate = async () => {
    setError('');
    setSuccess('');
    setGenerating(true);
    try {
      const res = await api.post('/advising/generate');
      setPlan(res.data.data.plan);
      const { totalSubjects, totalUnits, term } = res.data.data.summary;
      setSuccess(
        `Study plan generated for ${term} — ${totalSubjects} subject(s), ${totalUnits} units.`
      );
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const subjects = plan?.PlanSubjects || [];
  const totalUnits = subjects.reduce((sum, ps) => sum + (ps.Subject?.units || 0), 0);
  const isApproved = plan?.status === 'approved';

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="warning" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">My Study Plan</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && <Alert variant="success">{success}</Alert>}

      {isApproved && (
        <Alert variant="success" className="fs-5">
          <Alert.Heading>Plan Approved</Alert.Heading>
          Your Study Plan has been Approved by your Adviser. It is now locked and submitted for demand forecasting.
        </Alert>
      )}

      {!isApproved && (
        <Button
          variant="warning"
          className="mb-3"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Generating…
            </>
          ) : (
            'Generate New Study Plan'
          )}
        </Button>
      )}

      {!plan ? (
        <Card body className="text-center text-muted">
          No study plan yet. Click the button above to generate one.
        </Card>
      ) : (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>
              <strong>Plan #{plan.id}</strong>{' '}
              <Badge bg={plan.status === 'approved' ? 'success' : 'info'} className="ms-2">
                {plan.status}
              </Badge>
            </span>
            <span className="text-muted">
              {subjects.length} subject(s) &middot; {totalUnits} units
            </span>
          </Card.Header>
          <Card.Body>
            {subjects.length === 0 ? (
              <p className="text-muted mb-0">
                No subjects recommended — you may have completed all eligible courses for this term.
              </p>
            ) : (
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Course Code</th>
                    <th>Title</th>
                    <th>Units</th>
                    <th>Target Term</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((ps, idx) => (
                    <tr key={ps.id}>
                      <td>{idx + 1}</td>
                      <td>{ps.Subject?.course_code}</td>
                      <td>{ps.Subject?.title}</td>
                      <td>{ps.Subject?.units}</td>
                      <td>{ps.target_term}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default StudyPlan;
