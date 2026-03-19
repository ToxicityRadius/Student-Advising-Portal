import React, { useEffect, useMemo, useState } from 'react';
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
import AdminLayout from '../../components/admin/AdminLayout';
import useDebouncedValue from '../../utils/useDebouncedValue';

import { getErrorMessage } from '../../utils/errorHelpers';
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

const sortByCourseCode = (a, b) => (a.courseCode || '').localeCompare(b.courseCode || '');

const DemandTable = React.memo(({ rows, emptyMessage, countHeader }) => (
  <Table striped bordered hover responsive className="table-fixed-cols">
    <thead>
      <tr>
        <th className="col-code">Course Code</th>
        <th className="col-name">Course Name</th>
        <th className="col-units">Units</th>
        <th className="text-end" style={{ width: '14%' }}>{countHeader}</th>
        <th className="text-end" style={{ width: '16%' }}>Expected Sections</th>
      </tr>
    </thead>
    <tbody>
      {rows.length > 0 ? rows.map((row) => (
        <tr key={`${row.courseId || row.courseCode}-${row.courseCode}`}>
          <td className="fw-semibold">{row.courseCode}</td>
          <td>{row.courseName}</td>
          <td>{row.units ?? '-'}</td>
          <td className="text-end fw-semibold">{row.studentCount}</td>
          <td className="text-end fw-semibold">{row.expectedSections ?? '-'}</td>
        </tr>
      )) : (
        <tr>
          <td colSpan={5} className="text-center text-muted py-4">{emptyMessage}</td>
        </tr>
      )}
    </tbody>
  </Table>
));

const ComparisonDifference = React.memo(({ value }) => {
  const badgeVariant = value > 0 ? 'success' : value < 0 ? 'danger' : 'secondary';
  const prefix = value > 0 ? '+' : '';

  return <Badge bg={badgeVariant}>{`${prefix}${value}`}</Badge>;
});

const SnapshotDemandTable = React.memo(({ title, rows, emptyMessage }) => (
  <div className="mb-3">
    <h6 className="mb-2">{title}</h6>
    <DemandTable rows={rows} emptyMessage={emptyMessage} countHeader="Students" />
  </div>
));

const ChartContainer = React.memo(({ title, subtitle, children, emptyMessage, hasData }) => (
  <Card className="mb-3">
    <Card.Body>
      <div className="mb-2">
        <h6 className="mb-1">{title}</h6>
        {subtitle && <div className="text-muted small">{subtitle}</div>}
      </div>
      {hasData ? children : <div className="text-muted">{emptyMessage}</div>}
    </Card.Body>
  </Card>
));

const ForecastDashboard = () => {
  const [tabLoading, setTabLoading] = useState({ current: true, next: false, comparison: false, history: false });
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

  const currentRequestQuery = useMemo(() => ({ ...currentQuery, search: debouncedCurrentSearch }), [currentQuery, debouncedCurrentSearch]);
  const nextRequestQuery = useMemo(() => ({ ...nextQuery, search: debouncedNextSearch }), [nextQuery, debouncedNextSearch]);
  const comparisonRequestQuery = useMemo(() => ({ ...comparisonQuery, search: debouncedComparisonSearch }), [comparisonQuery, debouncedComparisonSearch]);
  const historyRequestQuery = useMemo(() => ({ ...historyQuery, search: debouncedHistorySearch }), [historyQuery, debouncedHistorySearch]);

  // ── Current tab ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (tabKey !== 'current') return;
    let cancelled = false;
    setTabLoading((prev) => ({ ...prev, current: true }));
    setNoCurrentTerm(false);
    api.get('/forecast/current', { params: currentRequestQuery })
      .then((res) => {
        if (cancelled) return;
        setCurrentDemand(res.data.items || res.data.data || []);
        setCurrentMeta(res.data.meta || EMPTY_META);
        setMeta((prev) => ({ ...prev, current: res.data.meta || null }));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          setNoCurrentTerm(true);
          setAlert({ variant: 'info', message: 'No active current term is set. Activate a term in Term Management to generate current and next-term forecast visuals.' });
        } else {
          setAlert({ variant: 'danger', message: getErrorMessage(err, 'Failed to load current demand.') });
        }
      })
      .finally(() => { if (!cancelled) setTabLoading((prev) => ({ ...prev, current: false })); });
    return () => { cancelled = true; };
  }, [tabKey, currentRequestQuery]);

  // ── Next tab ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tabKey !== 'next') return;
    let cancelled = false;
    setTabLoading((prev) => ({ ...prev, next: true }));
    api.get('/forecast/next', { params: nextRequestQuery })
      .then((res) => {
        if (cancelled) return;
        setNextForecast(res.data.items || res.data.data || []);
        setNextMeta(res.data.meta || EMPTY_META);
        setMeta((prev) => ({ ...prev, next: res.data.meta || null }));
      })
      .catch((err) => {
        if (cancelled) return;
        setAlert({ variant: 'danger', message: getErrorMessage(err, 'Failed to load next-term forecast.') });
      })
      .finally(() => { if (!cancelled) setTabLoading((prev) => ({ ...prev, next: false })); });
    return () => { cancelled = true; };
  }, [tabKey, nextRequestQuery]);

  // ── Comparison tab ────────────────────────────────────────────────────────
  useEffect(() => {
    if (tabKey !== 'comparison') return;
    let cancelled = false;
    setTabLoading((prev) => ({ ...prev, comparison: true }));
    api.get('/forecast/comparison', { params: comparisonRequestQuery })
      .then((res) => {
        if (cancelled) return;
        setComparison(res.data.items || res.data.data || []);
        setComparisonMeta(res.data.meta || EMPTY_META);
        setMeta((prev) => ({ ...prev, comparison: res.data.meta || null }));
      })
      .catch((err) => {
        if (cancelled) return;
        setAlert({ variant: 'danger', message: getErrorMessage(err, 'Failed to load comparison data.') });
      })
      .finally(() => { if (!cancelled) setTabLoading((prev) => ({ ...prev, comparison: false })); });
    return () => { cancelled = true; };
  }, [tabKey, comparisonRequestQuery]);

  // ── History tab ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (tabKey !== 'history') return;
    let cancelled = false;
    setTabLoading((prev) => ({ ...prev, history: true }));
    api.get('/forecast/history', { params: historyRequestQuery })
      .then((res) => {
        if (cancelled) return;
        setHistory(res.data.items || res.data.data || []);
        setHistoryMeta(res.data.meta || EMPTY_META);
      })
      .catch((err) => {
        if (cancelled) return;
        setAlert({ variant: 'danger', message: getErrorMessage(err, 'Failed to load forecast history.') });
      })
      .finally(() => { if (!cancelled) setTabLoading((prev) => ({ ...prev, history: false })); });
    return () => { cancelled = true; };
  }, [tabKey, historyRequestQuery]);

  const historyCount = useMemo(() => historyMeta.totalItems || history.length, [historyMeta.totalItems, history.length]);

  const currentTotalDemand = Number(meta.current?.validatedSarCount || 0);
  const nextTotalDemand = Number(meta.next?.validatedSarCount || 0);
  const demandDelta = nextTotalDemand - currentTotalDemand;
  const currentSectionCap = Number(meta.current?.sectionCap || 40);

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
    <AdminLayout activePage="forecast" pageTitle="Forecast Dashboard">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h2 className="mb-1">Forecast Dashboard</h2>
          <p className="text-muted mb-0">Current demand, next-semester forecast, historical snapshots, and forecast-to-actual comparison.</p>
        </div>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {tabLoading.current ? (
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
                  <div className="text-muted small mb-1">Validated SAR Records</div>
                  <div className="fw-semibold fs-5">{currentTotalDemand}</div>
                  <div className="text-muted small">Unique validated students in current term</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-start border-success border-5 shadow-sm">
                <Card.Body>
                  <div className="text-muted small mb-1">Projected Validated SARs</div>
                  <div className="fw-semibold fs-5">{nextTotalDemand}</div>
                  <div className="text-muted small">Unique validated students for next-term context</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-start border-info border-5 shadow-sm">
                <Card.Body>
                  <div className="text-muted small mb-1">Configured Section Cap</div>
                  <div className="fw-semibold fs-5">{currentSectionCap}</div>
                  <div className="text-muted small">Students per section</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-start border-secondary border-5 shadow-sm">
                <Card.Body>
                  <div className="text-muted small mb-1">Validated SAR Delta</div>
                  <div className="fw-semibold fs-5">{demandDelta > 0 ? `+${demandDelta}` : demandDelta}</div>
                  <div className="text-muted small">Next-term validated SARs minus current validated SARs</div>
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

          <Tabs activeKey={tabKey} onSelect={(key) => { setTabKey(key || 'current'); setAlert({ variant: '', message: '' }); }} className="mb-3">
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
                      <div className="text-muted small">Expected sections are computed as ceil(student demand / section cap).</div>
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
                      <option value="expectedSections">Sort by Expected Sections</option>
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
              {tabLoading.next && <div className="text-center py-5"><Spinner animation="border" /></div>}
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
                    <div className="text-muted small">Based on validated SAR records and pending courses in active study plans.</div>
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
                      <option value="expectedSections">Sort by Expected Sections</option>
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
              {tabLoading.comparison && <div className="text-center py-5"><Spinner animation="border" /></div>}
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
                  <Table striped bordered hover responsive className="table-fixed-cols">
                    <thead>
                      <tr>
                        <th className="col-code">Course Code</th>
                        <th className="col-name">Course Name</th>
                        <th className="text-end" style={{ width: '14%' }}>Forecasted</th>
                        <th className="text-end" style={{ width: '12%' }}>Actual</th>
                        <th className="text-end" style={{ width: '14%' }}>Difference</th>
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
              {tabLoading.history && <div className="text-center py-5"><Spinner animation="border" /></div>}
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
    </AdminLayout>
  );
};

export default ForecastDashboard;