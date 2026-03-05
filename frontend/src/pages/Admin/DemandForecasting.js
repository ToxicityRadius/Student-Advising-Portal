import React, { useEffect, useState } from 'react';
import { Container, Table, Badge, Spinner, Alert, Form, Button } from 'react-bootstrap';
import api from '../../utils/api';

const BOTTLENECK_THRESHOLD = 15;

const DemandForecasting = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [termFilter, setTermFilter] = useState('');

  const fetchForecast = async () => {
    try {
      setError('');
      const res = await api.get('/forecasting/demand');
      setData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load demand forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenSection = async (SubjectId, target_term) => {
    try {
      await api.post('/forecasting/open', { SubjectId, target_term });
      await fetchForecast();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open section');
    }
  };

  // Derive unique terms for the filter dropdown
  const terms = [...new Set(data.map(d => d.target_term))].sort();
  const filtered = termFilter ? data.filter(d => d.target_term === termFilter) : data;

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" /> Loading demand data…
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-1">Demand Forecasting &amp; Bottlenecks</h2>
      <p className="text-muted mb-3">
        Aggregated student demand per subject from all <strong>approved</strong> study plans.
        Rows highlighted in red indicate potential bottlenecks (≥ {BOTTLENECK_THRESHOLD} students).
      </p>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Group className="mb-3" style={{ maxWidth: 320 }}>
        <Form.Label>Filter by Term</Form.Label>
        <Form.Select value={termFilter} onChange={e => setTermFilter(e.target.value)}>
          <option value="">All Terms</option>
          {terms.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Form.Select>
      </Form.Group>

      {filtered.length === 0 ? (
        <Alert variant="info">No approved study-plan data found.</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Target Term</th>
              <th>Course Code</th>
              <th>Course Title</th>
              <th>Units</th>
              <th className="text-center">Student Demand</th>
              <th className="text-center">Action / Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => {
              const isBottleneck = row.student_count >= BOTTLENECK_THRESHOLD;
              return (
                <tr key={idx} className={isBottleneck ? 'table-danger' : ''}>
                  <td>{row.target_term}</td>
                  <td>{row.course_code}</td>
                  <td>{row.title}</td>
                  <td>{row.units}</td>
                  <td className="text-center">
                    {isBottleneck ? (
                      <Badge bg="danger" className="fs-6">
                        {row.student_count} — BOTTLENECK
                      </Badge>
                    ) : (
                      row.student_count
                    )}
                  </td>
                  <td className="text-center">
                    {isBottleneck && row.is_opened === true ? (
                      <Badge bg="success">Section Opened</Badge>
                    ) : isBottleneck && !row.is_opened ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenSection(row.subject_id, row.target_term)}
                      >
                        Open Section
                      </Button>
                    ) : (
                      <Badge bg="secondary">Normal Demand</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default DemandForecasting;
