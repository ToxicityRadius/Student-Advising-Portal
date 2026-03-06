import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Container, Spinner, Table } from 'react-bootstrap';
import api from '../../utils/api';

const CourseOfferingManager = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTerm, setActiveTerm] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  const offeredIds = useMemo(
    () => new Set((offerings || []).map((offering) => offering.SubjectId)),
    [offerings]
  );

  const fetchOfferingsForTerm = useCallback(async (termName) => {
    if (!termName) {
      setOfferings([]);
      return;
    }

    const response = await api.get(`/course-offerings/${encodeURIComponent(termName)}`);
    setOfferings(response.data.data || []);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [termRes, subjectRes] = await Promise.all([
        api.get('/terms/active'),
        api.get('/curriculum/subjects')
      ]);

      const term = termRes.data.data || null;
      setActiveTerm(term);
      setSubjects(subjectRes.data.data || []);

      if (term?.term_name) {
        await fetchOfferingsForTerm(term.term_name);
      } else {
        setOfferings([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course offerings');
    } finally {
      setLoading(false);
    }
  }, [fetchOfferingsForTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (subjectId) => {
    if (!activeTerm?.term_name) return;

    try {
      setTogglingId(subjectId);
      setError('');
      await api.post('/course-offerings/toggle', {
        target_term: activeTerm.term_name,
        SubjectId: subjectId
      });
      await fetchOfferingsForTerm(activeTerm.term_name);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle offering');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" variant="warning" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-3">Course Offering Manager</h2>
      <p className="text-muted mb-4">
        Active Term: <strong>{activeTerm?.term_name || 'No active term set'}</strong>
      </p>

      {error && <Alert variant="danger">{error}</Alert>}
      {!activeTerm && <Alert variant="warning">Set an active term first to manage offerings.</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Curriculum Term</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => {
            const isOpen = offeredIds.has(subject.id);

            return (
              <tr key={subject.id}>
                <td>{subject.course_code}</td>
                <td>{subject.title}</td>
                <td>{subject.seasonal_term || 'N/A'}</td>
                <td>
                  {isOpen ? (
                    <Badge bg="success">OPEN</Badge>
                  ) : (
                    <Badge bg="secondary">CLOSED</Badge>
                  )}
                </td>
                <td>
                  <Button
                    size="sm"
                    variant={isOpen ? 'danger' : 'primary'}
                    disabled={!activeTerm || togglingId === subject.id}
                    onClick={() => handleToggle(subject.id)}
                  >
                    {togglingId === subject.id
                      ? 'Updating...'
                      : (isOpen ? 'Close Section' : 'Open Section')}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
};

export default CourseOfferingManager;
