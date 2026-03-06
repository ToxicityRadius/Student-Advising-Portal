import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Card,
  Spinner,
  Alert,
  Button,
  Row,
  Col,
  ListGroup,
  Badge
} from 'react-bootstrap';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../utils/api';

const PIE_COLORS = ['#dc3545', '#ffc107', '#198754', '#0d6efd', '#6f42c1', '#20c997'];

const DemandForecasting = () => {
  const [demandData, setDemandData] = useState([]);
  const [atRiskData, setAtRiskData] = useState([]);
  const [lowEfficiencyAlerts, setLowEfficiencyAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchForecast = async () => {
    try {
      setError('');
      const res = await api.get('/forecasting/demand');
      setDemandData(res.data.demandData || []);
      setAtRiskData(res.data.atRiskData || []);
      setLowEfficiencyAlerts(res.data.lowEfficiencyAlerts || []);
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

  const topDemandData = useMemo(
    () => [...demandData].sort((a, b) => b.expectedCount - a.expectedCount).slice(0, 15),
    [demandData]
  );

  const topAtRiskData = useMemo(
    () => [...atRiskData].sort((a, b) => b.atRiskCount - a.atRiskCount).slice(0, 8),
    [atRiskData]
  );

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" /> Loading demand data…
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">Demand Forecasting Decision Support System</h2>
          <p className="text-muted mb-0">Visual analytics for projected demand, risk pipeline, and efficiency flags.</p>
        </div>
        <Button variant="outline-dark" onClick={() => window.print()}>
          Print / Export
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="shadow-sm">
            <Card.Header className="fw-semibold">Projected Subject Demand</Card.Header>
            <Card.Body style={{ height: 420 }}>
              {topDemandData.length === 0 ? (
                <Alert variant="info" className="mb-0">No projected demand data found.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDemandData} margin={{ top: 20, right: 20, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subjectCode" angle={-35} textAnchor="end" interval={0} height={90} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="expectedCount" name="Expected Students" fill="#0d6efd" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="shadow-sm h-100">
            <Card.Header className="fw-semibold">The At-Risk Pipeline</Card.Header>
            <Card.Body style={{ height: 360 }}>
              {topAtRiskData.length === 0 ? (
                <Alert variant="success" className="mb-0">No at-risk signals found for the active term.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topAtRiskData}
                      dataKey="atRiskCount"
                      nameKey="subjectCode"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label
                    >
                      {topAtRiskData.map((entry, index) => (
                        <Cell key={entry.subjectCode} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="shadow-sm h-100">
            <Card.Header className="fw-semibold d-flex justify-content-between align-items-center">
              <span>Low-Efficiency Flags</span>
              <Badge bg="warning" text="dark">{lowEfficiencyAlerts.length}</Badge>
            </Card.Header>
            <Card.Body>
              {lowEfficiencyAlerts.length === 0 ? (
                <Alert variant="success" className="mb-0">No low-efficiency alerts right now.</Alert>
              ) : (
                <ListGroup variant="flush">
                  {lowEfficiencyAlerts.map((item) => (
                    <ListGroup.Item key={`${item.SubjectId}-${item.targetTerm || item.target_term || item.targetTerm}`}>
                      <div className="fw-semibold">{item.subjectCode}</div>
                      <div className="small text-muted">{item.title}</div>
                      <div className="small mt-1">
                        Expected demand: <Badge bg="danger">{item.expectedCount}</Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DemandForecasting;
