import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  Alert,
  Badge,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs
} from 'react-bootstrap';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../../utils/api';
import PaginationControls from '../../components/PaginationControls';
import useDebouncedValue from '../../utils/useDebouncedValue';

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const EMPTY_META = { page: 1, pageSize: 12, totalPages: 1, totalItems: 0 };

const formatTimestamp = (value) => {
  if (!value) {
    return 'N/A';
  }

  try {
    return new Date(Number(value)).toLocaleString();
  } catch {
    return 'N/A';
  }
};

const sortByCourseCode = (left, right) => String(left.courseCode || '').localeCompare(String(right.courseCode || ''));

const DemandTable = ({ rows, emptyMessage, countHeader }) => (
  <Table striped bordered hover responsive>
    <thead>
      <tr>
        <th>Course Code</th>
        <th>Course Name</th>
        <th>Units</th>
        <th className="text-end">{countHeader}</th>
      </tr>
    </thead>
    <tbody>
      {rows.length > 0 ? rows.map((row) => (
        <tr key={`${row.courseId || row.courseCode}-${row.courseCode}`}>
          <td className="fw-semibold">{row.courseCode}</td>
          <td>{row.courseName}</td>
          <td>{row.units ?? '-'}</td>
          <td className="text-end fw-semibold">{row.studentCount}</td>
        </tr>
      )) : (
        <tr>
          <td colSpan={4} className="text-center text-muted py-4">{emptyMessage}</td>
        </tr>
      )}
    </tbody>
  </Table>
);

const ComparisonDifference = ({ value }) => {
  const badgeVariant = value > 0 ? 'success' : value < 0 ? 'danger' : 'secondary';
  const prefix = value > 0 ? '+' : '';

  return <Badge bg={badgeVariant}>{`${prefix}${value}`}</Badge>;
};

const SnapshotDemandTable = ({ title, rows, emptyMessage }) => (
  <div className="mb-3">
    <h6 className="mb-2">{title}</h6>
    <DemandTable rows={rows} emptyMessage={emptyMessage} countHeader="Students" />
  </div>
);

const ChartContainer = ({ title, subtitle, children, emptyMessage, hasData }) => (
  <Card className="mb-3">
    <Card.Body>
      <div className="mb-2">
        <h6 className="mb-1">{title}</h6>
        {subtitle && <div className="text-muted small">{subtitle}</div>}
      </div>
      {hasData ? children : <div className="text-muted">{emptyMessage}</div>}
    </Card.Body>
  </Card>
);

const ForecastDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [tabKey, setTabKey] = useState('current');
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [noCurrentTerm, setNoCurrentTerm] = useState(false);

  const [currentDemand, setCurrentDemand] = useState([]);
  const [nextForecast, setNextForecast] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState({ current: null, next: null, comparison: null });
  const [currentMeta, setCurrentMeta] = useState(EMPTY_META);
  const [nextMeta, setNextMeta] = useState(EMPTY_META);
  const [comparisonMeta, setComparisonMeta] = useState(EMPTY_META);
  const [historyMeta, setHistoryMeta] = useState(EMPTY_META);

  const [currentQuery, setCurrentQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'courseCode', sortOrder: 'asc' });
  const [nextQuery, setNextQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'courseCode', sortOrder: 'asc' });
  const [comparisonQuery, setComparisonQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'courseCode', sortOrder: 'asc' });
  const [historyQuery, setHistoryQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'createdAt', sortOrder: 'desc' });
  const [chartLimit, setChartLimit] = useState(10);
  const debouncedCurrentSearch = useDebouncedValue(currentQuery.search, 350);
  const debouncedNextSearch = useDebouncedValue(nextQuery.search, 350);
  const debouncedComparisonSearch = useDebouncedValue(comparisonQuery.search, 350);
  const debouncedHistorySearch = useDebouncedValue(historyQuery.search, 350);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    setNoCurrentTerm(false);

    try {
      const [currentResult, nextResult, comparisonResult, historyResult] = await Promise.allSettled([
        api.get('/forecast/current', { params: { ...currentQuery, search: debouncedCurrentSearch } }),
        api.get('/forecast/next', { params: { ...nextQuery, search: debouncedNextSearch } }),
        api.get('/forecast/comparison', { params: { ...comparisonQuery, search: debouncedComparisonSearch } }),
        api.get('/forecast/history', { params: { ...historyQuery, search: debouncedHistorySearch } })
      ]);

      const currentRes = currentResult.status === 'fulfilled' ? currentResult.value : null;
      const nextRes = nextResult.status === 'fulfilled' ? nextResult.value : null;
      const comparisonRes = comparisonResult.status === 'fulfilled' ? comparisonResult.value : null;
      const historyRes = historyResult.status === 'fulfilled' ? historyResult.value : null;

      setCurrentDemand((currentRes?.data?.items || currentRes?.data?.data || []).slice().sort(sortByCourseCode));
      setNextForecast((nextRes?.data?.items || nextRes?.data?.data || []).slice().sort(sortByCourseCode));
      setComparison((comparisonRes?.data?.items || comparisonRes?.data?.data || []).slice().sort(sortByCourseCode));
      setHistory(historyRes?.data?.items || historyRes?.data?.data || []);

      setCurrentMeta(currentRes?.data?.meta || EMPTY_META);
      setNextMeta(nextRes?.data?.meta || EMPTY_META);
      setComparisonMeta(comparisonRes?.data?.meta || EMPTY_META);
      setHistoryMeta(historyRes?.data?.meta || EMPTY_META);
      setMeta({
        current: currentRes?.data?.meta || null,
        next: nextRes?.data?.meta || null,
        comparison: comparisonRes?.data?.meta || null
      });

      const failedSections = [currentResult, nextResult, comparisonResult].filter((result) => result.status === 'rejected');
      const has404CurrentTerm = failedSections.some((result) => result?.reason?.response?.status === 404);

      if (has404CurrentTerm) {
        setNoCurrentTerm(true);
        setAlert({
          variant: 'info',
          message: 'No active current term is set. Activate a term in Term Management to generate current and next-term forecast visuals.'
        });
      } else if (failedSections.length > 0) {
        const firstError = failedSections[0]?.reason;
        setAlert({
          variant: 'warning',
          message: getErrorMessage(firstError, 'Some forecast sections are unavailable right now.')
        });
      }

      if (historyResult.status === 'rejected') {
        throw historyResult.reason;
      }
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to load forecasting data.')
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentQuery.page,
    currentQuery.pageSize,
    currentQuery.sortBy,
    currentQuery.sortOrder,
    debouncedCurrentSearch,
    nextQuery.page,
    nextQuery.pageSize,
    nextQuery.sortBy,
    nextQuery.sortOrder,
    debouncedNextSearch,
    comparisonQuery.page,
    comparisonQuery.pageSize,
    comparisonQuery.sortBy,
    comparisonQuery.sortOrder,
    debouncedComparisonSearch,
    historyQuery.page,
    historyQuery.pageSize,
    historyQuery.sortBy,
    historyQuery.sortOrder,
    debouncedHistorySearch
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const historyCount = useMemo(() => historyMeta.totalItems || history.length, [historyMeta.totalItems, history.length]);

  const currentTotalDemand = useMemo(() => currentDemand.reduce((sum, item) => sum + Number(item.studentCount || 0), 0), [currentDemand]);
  const nextTotalDemand = useMemo(() => nextForecast.reduce((sum, item) => sum + Number(item.studentCount || 0), 0), [nextForecast]);
  const demandDelta = nextTotalDemand - currentTotalDemand;

  const currentChartData = useMemo(
    () => currentDemand.slice().sort((a, b) => Number(b.studentCount) - Number(a.studentCount)).slice(0, chartLimit),
    [currentDemand, chartLimit]
  );

  const nextChartData = useMemo(
    () => nextForecast.slice().sort((a, b) => Number(b.studentCount) - Number(a.studentCount)).slice(0, chartLimit),
    [nextForecast, chartLimit]
  );

  const comparisonChartData = useMemo(
    () => comparison.slice().sort((a, b) => Math.abs(Number(b.difference)) - Math.abs(Number(a.difference))).slice(0, chartLimit),
    [comparison, chartLimit]
  );

  const historyTrendData = useMemo(
    () => history
      .slice()
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))
      .map((item) => ({
        label: `${item.schoolYear} S${item.semester}`,
        currentDemandRows: Number(item.currentDemandCount || 0),
        nextForecastRows: Number(item.nextSemesterForecastCount || 0)
      })),
    [history]
  );

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Forecast Dashboard</h2>
          <p className="text-muted mb-0">Current demand, next-semester forecast, historical snapshots, and forecast-to-actual comparison.</p>
        </div>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Row className="g-3 mb-3">
            <Col md={3}>
              <Card className="h-100 border-start border-primary border-5 shadow-sm">
                <Card.Body>
                  <div className="text-muted small mb-1">Current Term</div>
                  <div className="fw-semibold fs-6">{meta.current?.currentTerm?.schoolYear || 'No active term'}</div>
                  <div>{meta.current?.currentTerm?.semesterLabel || 'Unavailable'}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-start border-warning border-5 shadow-sm">
                <Card.Body>
                  <div className="text-muted small mb-1">Current Demand Total</div>
                  <div className="fw-semibold fs-5">{currentTotalDemand}</div>
                  <div className="text-muted small">Students across current-demand courses</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-start border-success border-5 shadow-sm">
                <Card.Body>
                  <div className="text-muted small mb-1">Projected Next-Term Total</div>
                  <div className="fw-semibold fs-5">{nextTotalDemand}</div>
                  <div className="text-muted small">Students across forecasted courses</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-start border-info border-5 shadow-sm">
                <Card.Body>
                  <div className="text-muted small mb-1">Projected Delta</div>
                  <div className="fw-semibold fs-5">{demandDelta > 0 ? `+${demandDelta}` : demandDelta}</div>
                  <div className="text-muted small">Next-term total minus current total</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-3">
            <Card.Body className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center">
              <div>
                <div className="fw-semibold">Chart Controls</div>
                <div className="text-muted small">Consistent legend and axis labels are applied across all charts.</div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Form.Label className="mb-0 small text-muted">Top Courses</Form.Label>
                <Form.Select
                  value={chartLimit}
                  onChange={(event) => setChartLimit(Number(event.target.value))}
                  style={{ maxWidth: 140 }}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                </Form.Select>
              </div>
            </Card.Body>
          </Card>

          <Tabs activeKey={tabKey} onSelect={(key) => setTabKey(key || 'current')} className="mb-3">
            <Tab eventKey="current" title="Current Demand">
              <ChartContainer
                title="Current Demand Distribution"
                subtitle="X-axis: Course code · Y-axis: Student count"
                hasData={!noCurrentTerm && currentChartData.length > 0}
                emptyMessage="No current-term demand chart data available."
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={currentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="courseCode" />
                    <YAxis allowDecimals={false} label={{ value: 'Students', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar name="Current Demand" dataKey="studentCount" fill="#0d6efd" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-1">Current Semester Demand</h5>
                      <div className="text-muted small">
                        {meta.current?.currentTerm
                          ? `${meta.current.currentTerm.schoolYear} · ${meta.current.currentTerm.semesterLabel}`
                          : 'No active term available'}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                    <Form.Control
                      placeholder="Search course code or name"
                      value={currentQuery.search}
                      onChange={(event) => setCurrentQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                    />
                    <Form.Select
                      value={currentQuery.sortBy}
                      onChange={(event) => setCurrentQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                      style={{ maxWidth: 220 }}
                    >
                      <option value="courseCode">Sort by Course Code</option>
                      <option value="courseName">Sort by Course Name</option>
                      <option value="units">Sort by Units</option>
                      <option value="studentCount">Sort by Students</option>
                    </Form.Select>
                    <Form.Select
                      value={currentQuery.sortOrder}
                      onChange={(event) => setCurrentQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                      style={{ maxWidth: 180 }}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </Form.Select>
                  </div>
                  <DemandTable
                    rows={currentDemand}
                    emptyMessage="No pending demand found for the current semester."
                    countHeader="Students"
                  />
                  <PaginationControls
                    page={currentMeta.page}
                    totalPages={currentMeta.totalPages}
                    pageSize={currentMeta.pageSize}
                    onPageChange={(nextPage) => setCurrentQuery((prev) => ({ ...prev, page: nextPage }))}
                    onPageSizeChange={(nextSize) => setCurrentQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                  />
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="next" title="Next Semester Forecast">
              <ChartContainer
                title="Next-Semester Forecast Distribution"
                subtitle="X-axis: Course code · Y-axis: Forecasted student count"
                hasData={!noCurrentTerm && nextChartData.length > 0}
                emptyMessage="No next-term forecast chart data available."
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={nextChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="courseCode" />
                    <YAxis allowDecimals={false} label={{ value: 'Forecasted Students', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar name="Forecasted Demand" dataKey="studentCount" fill="#198754" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <Card>
                <Card.Body>
                  <div className="mb-3">
                    <h5 className="mb-1">Next Semester Forecast</h5>
                    <div className="text-muted small">Based on active study plans from the current term context.</div>
                  </div>
                  <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                    <Form.Control
                      placeholder="Search course code or name"
                      value={nextQuery.search}
                      onChange={(event) => setNextQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                    />
                    <Form.Select
                      value={nextQuery.sortBy}
                      onChange={(event) => setNextQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                      style={{ maxWidth: 220 }}
                    >
                      <option value="courseCode">Sort by Course Code</option>
                      <option value="courseName">Sort by Course Name</option>
                      <option value="units">Sort by Units</option>
                      <option value="studentCount">Sort by Forecasted Students</option>
                    </Form.Select>
                    <Form.Select
                      value={nextQuery.sortOrder}
                      onChange={(event) => setNextQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                      style={{ maxWidth: 180 }}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </Form.Select>
                  </div>
                  <DemandTable
                    rows={nextForecast}
                    emptyMessage="No forecasted demand found for the next semester."
                    countHeader="Forecasted Students"
                  />
                  <PaginationControls
                    page={nextMeta.page}
                    totalPages={nextMeta.totalPages}
                    pageSize={nextMeta.pageSize}
                    onPageChange={(nextPage) => setNextQuery((prev) => ({ ...prev, page: nextPage }))}
                    onPageSizeChange={(nextSize) => setNextQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                  />
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="comparison" title="Comparison Report">
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Card className="h-100 border-start border-primary border-4">
                    <Card.Body>
                      <div className="text-muted small">Current Total</div>
                      <div className="fw-semibold fs-5">{currentTotalDemand}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-start border-success border-4">
                    <Card.Body>
                      <div className="text-muted small">Projected Total</div>
                      <div className="fw-semibold fs-5">{nextTotalDemand}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100 border-start border-info border-4">
                    <Card.Body>
                      <div className="text-muted small">Delta (Projected - Current)</div>
                      <div className="fw-semibold fs-5">{demandDelta > 0 ? `+${demandDelta}` : demandDelta}</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <ChartContainer
                title="Largest Forecast vs Actual Deltas"
                subtitle="X-axis: Course code · Y-axis: Difference (actual minus forecasted)"
                hasData={!noCurrentTerm && comparisonChartData.length > 0}
                emptyMessage="No comparison chart data available yet."
              >
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="courseCode" />
                    <YAxis allowDecimals={false} label={{ value: 'Difference', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar name="Difference" dataKey="difference" fill="#6f42c1" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <Card>
                <Card.Body>
                  <div className="mb-3">
                    <h5 className="mb-1">Forecast vs Actual</h5>
                    <div className="text-muted small">Difference is computed as actual demand minus the previous term's forecast.</div>
                    {meta.comparison?.previousSnapshot && (
                      <div className="text-muted small mt-1">
                        Comparing against snapshot from {meta.comparison.previousSnapshot.schoolYear} · {meta.comparison.previousSnapshot.semesterLabel}
                      </div>
                    )}
                  </div>

                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Course Code</th>
                        <th>Course Name</th>
                        <th className="text-end">Forecasted</th>
                        <th className="text-end">Actual</th>
                        <th className="text-end">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.length > 0 ? comparison.map((row) => (
                        <tr key={row.courseCode}>
                          <td className="fw-semibold">{row.courseCode}</td>
                          <td>{row.courseName}</td>
                          <td className="text-end">{row.forecastedDemand}</td>
                          <td className="text-end">{row.actualDemand}</td>
                          <td className="text-end"><ComparisonDifference value={row.difference} /></td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">
                            No comparison data available yet. Store a prior-term snapshot first.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                    <Form.Control
                      placeholder="Search course code or name"
                      value={comparisonQuery.search}
                      onChange={(event) => setComparisonQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                    />
                    <Form.Select
                      value={comparisonQuery.sortBy}
                      onChange={(event) => setComparisonQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                      style={{ maxWidth: 220 }}
                    >
                      <option value="courseCode">Sort by Course Code</option>
                      <option value="courseName">Sort by Course Name</option>
                      <option value="forecastedDemand">Sort by Forecasted</option>
                      <option value="actualDemand">Sort by Actual</option>
                      <option value="difference">Sort by Difference</option>
                    </Form.Select>
                    <Form.Select
                      value={comparisonQuery.sortOrder}
                      onChange={(event) => setComparisonQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                      style={{ maxWidth: 180 }}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </Form.Select>
                  </div>
                  <PaginationControls
                    page={comparisonMeta.page}
                    totalPages={comparisonMeta.totalPages}
                    pageSize={comparisonMeta.pageSize}
                    onPageChange={(nextPage) => setComparisonQuery((prev) => ({ ...prev, page: nextPage }))}
                    onPageSizeChange={(nextSize) => setComparisonQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                  />
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="history" title="Forecast History">
              <ChartContainer
                title="Historical Snapshot Trend"
                subtitle="X-axis: Snapshot term · Y-axis: Stored rows"
                hasData={historyTrendData.length > 0}
                emptyMessage="No snapshot history available for charting yet."
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} label={{ value: 'Rows', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="currentDemandRows" name="Current Demand Rows" stroke="#0d6efd" strokeWidth={2} />
                    <Line type="monotone" dataKey="nextForecastRows" name="Next Forecast Rows" stroke="#198754" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <Card>
                <Card.Body>
                  <div className="mb-3">
                    <h5 className="mb-1">Forecast Snapshot History</h5>
                    <div className="text-muted small">Expand any snapshot to inspect stored current-demand and next-semester forecast data.</div>
                    <div className="text-muted small mt-1">Total snapshots: {historyCount}</div>
                  </div>
                  <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                    <Form.Control
                      placeholder="Search snapshot school year"
                      value={historyQuery.search}
                      onChange={(event) => setHistoryQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                    />
                    <Form.Select
                      value={historyQuery.sortBy}
                      onChange={(event) => setHistoryQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                      style={{ maxWidth: 220 }}
                    >
                      <option value="createdAt">Sort by Stored Date</option>
                      <option value="schoolYear">Sort by School Year</option>
                      <option value="semester">Sort by Semester</option>
                    </Form.Select>
                    <Form.Select
                      value={historyQuery.sortOrder}
                      onChange={(event) => setHistoryQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                      style={{ maxWidth: 180 }}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </Form.Select>
                  </div>

                  {history.length > 0 ? (
                    <Accordion alwaysOpen>
                      {history.map((snapshot, index) => (
                        <Accordion.Item eventKey={String(index)} key={snapshot.id}>
                          <Accordion.Header>
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center w-100 pe-3 gap-1">
                              <span className="fw-semibold">{snapshot.schoolYear} · {snapshot.semesterLabel}</span>
                              <span className="text-muted small">
                                Stored {formatTimestamp(snapshot.createdAt)}
                                {snapshot.triggeredBy?.name ? ` · ${snapshot.triggeredBy.name}` : ''}
                              </span>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body>
                            <Row className="g-3 mb-2">
                              <Col md={6}>
                                <div className="small text-muted">Current demand rows</div>
                                <div className="fw-semibold">{snapshot.currentDemandCount}</div>
                              </Col>
                              <Col md={6}>
                                <div className="small text-muted">Next forecast rows</div>
                                <div className="fw-semibold">{snapshot.nextSemesterForecastCount}</div>
                              </Col>
                            </Row>

                            <SnapshotDemandTable
                              title="Current Demand Snapshot"
                              rows={(snapshot.snapshotData?.currentDemand || []).slice().sort(sortByCourseCode)}
                              emptyMessage="No current-demand rows stored in this snapshot."
                            />

                            <SnapshotDemandTable
                              title="Next Semester Forecast Snapshot"
                              rows={(snapshot.snapshotData?.nextSemesterForecast || []).slice().sort(sortByCourseCode)}
                              emptyMessage="No next-semester forecast rows stored in this snapshot."
                            />
                          </Accordion.Body>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-muted">No forecast snapshots stored yet.</div>
                  )}
                  <PaginationControls
                    page={historyMeta.page}
                    totalPages={historyMeta.totalPages}
                    pageSize={historyMeta.pageSize}
                    onPageChange={(nextPage) => setHistoryQuery((prev) => ({ ...prev, page: nextPage }))}
                    onPageSizeChange={(nextSize) => setHistoryQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                  />
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ForecastDashboard;