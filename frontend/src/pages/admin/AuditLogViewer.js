import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Card, Form, InputGroup, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../components/admin/AdminLayout';
import PaginationControls from '../../components/PaginationControls';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHelpers';

const actionVariant = {
  LOGIN: 'success',
  LOGIN_FAILURE: 'danger',
  LOGIN_FORCE_EMAIL_CHANGE: 'warning',
  LOGOUT: 'secondary',
  SAR_CREATE: 'primary',
  SAR_BULK_CREATE: 'primary',
  SAR_UPDATE: 'info',
  GRADE_ENTRY: 'info',
  GRADE_BULK_IMPORT: 'info',
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 1 });

  // Filters
  const [actions, setActions] = useState([]);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load distinct actions for filter dropdown
  useEffect(() => {
    api
      .get('/admin/audit-logs/actions')
      .then((res) => setActions(res.data?.data || []))
      .catch(() => {});
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const params = { page, pageSize };
      if (filterAction) params.action = filterAction;
      if (filterResource) params.resource = filterResource;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/admin/audit-logs', { params });
      setLogs(res.data?.data || []);
      setMeta(res.data?.meta || { page: 1, pageSize, totalItems: 0, totalPages: 1 });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to load audit logs.'),
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterAction, filterResource, search, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [filterAction, filterResource, search, startDate, endDate]);

  return (
    <AdminLayout activePage="audit" pageTitle="Audit Logs">
      <div className="mb-4">
        <h2 className="mb-1">Audit Logs</h2>
        <p className="text-muted mb-0">Review system activity and security-related events.</p>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row gap-2">
            <InputGroup style={{ maxWidth: 280 }}>
              <InputGroup.Text>Search</InputGroup.Text>
              <Form.Control
                placeholder="Action, resource, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

            <Form.Select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              style={{ maxWidth: 180 }}
            >
              <option value="">All Resources</option>
              <option value="auth">auth</option>
              <option value="sar">sar</option>
              <option value="grade">grade</option>
              <option value="user">user</option>
              <option value="curriculum">curriculum</option>
            </Form.Select>

            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ maxWidth: 170 }}
              placeholder="Start date"
            />
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ maxWidth: 170 }}
              placeholder="End date"
            />
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Timestamp</th>
                    <th style={{ width: '18%' }}>User</th>
                    <th style={{ width: '16%' }}>Action</th>
                    <th style={{ width: '12%' }}>Resource</th>
                    <th style={{ width: '10%' }}>Resource ID</th>
                    <th style={{ width: '12%' }}>IP</th>
                    <th style={{ width: '14%' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="small">{formatDate(log.createdAt)}</td>
                      <td>
                        {log.User ? (
                          <span>
                            {log.User.firstName} {log.User.lastName}{' '}
                            <span className="text-muted small">({log.User.role})</span>
                          </span>
                        ) : (
                          <span className="text-muted">System</span>
                        )}
                      </td>
                      <td>
                        <Badge bg={actionVariant[log.action] || 'secondary'}>{log.action}</Badge>
                      </td>
                      <td>{log.resource}</td>
                      <td className="small">{log.resourceId || '—'}</td>
                      <td className="small">{log.ipAddress || '—'}</td>
                      <td className="small">
                        {log.metadata && Object.keys(log.metadata).length > 0
                          ? Object.entries(log.metadata)
                              .filter(([k]) => k !== 'ip')
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No audit log entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <PaginationControls
                page={meta.page || page}
                totalPages={meta.totalPages || 1}
                pageSize={meta.pageSize || pageSize}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPage(1);
                  setPageSize(nextSize);
                }}
              />
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
};

export default AuditLogViewer;
