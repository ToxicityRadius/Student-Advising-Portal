import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../components/admin/AdminLayout';
import PaginationControls from '../../components/PaginationControls';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHelpers';
import useDebouncedValue from '../../utils/useDebouncedValue';

const statusVariant = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const termLabel = (yearLevel, semester) => {
  const semesterLabels = {
    1: '1st Semester',
    2: '2nd Semester',
    3: 'Summer',
  };

  return `Year ${yearLevel}, ${semesterLabels[semester] || `Semester ${semester}`}`;
};

const adviserName = (user) => {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.email || 'Adviser';
};

const formatDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};

const PrerequisiteOverrides = () => {
  const [requests, setRequests] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [programId, setProgramId] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });
  const [notesById, setNotesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [alert, setAlert] = useState({ variant: '', message: '' });

  const requestCount = useMemo(
    () => meta.totalItems || requests.length,
    [meta.totalItems, requests.length],
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const params = {
        page,
        pageSize,
        search: debouncedSearch.trim(),
        sortBy,
        sortOrder,
        ...(statusFilter === 'all' ? {} : { status: statusFilter }),
        ...(programId ? { programId } : {}),
      };
      const [response, programResponse] = await Promise.all([
        api.get('/prerequisite-overrides', { params }),
        api.get('/programs'),
      ]);
      setRequests(response.data?.data || response.data?.items || []);
      setMeta(response.data?.meta || { page: 1, pageSize, totalItems: 0, totalPages: 1 });
      setPrograms(programResponse.data?.data || []);
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to load prerequisite override requests.'),
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, programId, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, programId, sortBy, sortOrder, statusFilter]);

  const decideRequest = async (request, status) => {
    setSubmittingId(request.id);
    setAlert({ variant: '', message: '' });

    try {
      await api.patch(`/prerequisite-overrides/${request.id}/decision`, {
        status,
        decisionNotes: notesById[request.id] || '',
      });

      await loadRequests();
      setAlert({
        variant: 'success',
        message:
          status === 'approved'
            ? 'Prerequisite override approved.'
            : 'Prerequisite override rejected.',
      });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, `Failed to ${status} prerequisite override.`),
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <AdminLayout activePage="overrides" pageTitle="Prerequisite Overrides">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Prerequisite Overrides</h2>
          <p className="text-muted mb-0">
            Review adviser requests for same-term prerequisite enrollment.
          </p>
        </div>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      <Card className="shadow-sm">
        <Card.Body>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
            <div>
              <h5 className="mb-1">Approval Queue</h5>
              <Badge bg="secondary">{requestCount} requests</Badge>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Form.Control
                type="search"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 220 }}
              />
              <Form.Select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                style={{ width: 180 }}
              >
                <option value="">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </Form.Select>
              <Form.Select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split(':');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                style={{ width: 160 }}
              >
                <option value="createdAt:desc">Newest</option>
                <option value="createdAt:asc">Oldest</option>
              </Form.Select>
              <Form.Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ width: 140 }}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </Form.Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <Table responsive hover className="table-fixed-cols">
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Student</th>
                    <th style={{ width: '8%' }}>Program</th>
                    <th style={{ width: '14%' }}>Prerequisite</th>
                    <th style={{ width: '14%' }}>Dependent</th>
                    <th style={{ width: '10%' }}>Term</th>
                    <th style={{ width: '18%' }}>Reason / Notes</th>
                    <th style={{ width: '12%' }}>Decision</th>
                    <th style={{ width: '8%' }} className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const prerequisiteCourse = request.prerequisiteCourse || {};
                    const dependentCourse = request.dependentCourse || {};
                    const isPending = request.status === 'pending';
                    const decisionActor = request.decidedByAdmin;
                    const decisionActorName = decisionActor
                      ? [decisionActor.firstName, decisionActor.lastName]
                          .filter(Boolean)
                          .join(' ')
                          .trim() || decisionActor.email
                      : null;
                    const decisionDate = formatDate(request.decidedAt);

                    return (
                      <tr key={request.id}>
                        <td>
                          <div className="fw-semibold">{request.sar?.studentName || 'Student'}</div>
                          <div className="text-muted small">
                            {request.sar?.studentNumber || 'No student number'}
                          </div>
                          <div className="text-muted small">
                            By {adviserName(request.requestedByAdviser)}
                          </div>
                        </td>
                        <td className="text-muted small">{request.program?.code || 'N/A'}</td>
                        <td>
                          <div className="fw-semibold">{prerequisiteCourse.code}</div>
                          <div className="text-muted small">{prerequisiteCourse.name}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{dependentCourse.code}</div>
                          <div className="text-muted small">{dependentCourse.name}</div>
                        </td>
                        <td>{termLabel(request.yearLevel, request.semester)}</td>
                        <td>
                          <div>{request.reason}</div>
                          <Badge
                            bg={statusVariant[request.status] || 'secondary'}
                            className="mt-2 text-uppercase"
                          >
                            {request.status}
                          </Badge>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            className="mt-2"
                            value={notesById[request.id] || ''}
                            disabled={!isPending || submittingId === request.id}
                            aria-label={`Decision notes for ${prerequisiteCourse.code} and ${dependentCourse.code}`}
                            onChange={(event) =>
                              setNotesById((currentNotes) => ({
                                ...currentNotes,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="Decision notes"
                          />
                        </td>
                        <td>
                          {decisionActorName ? (
                            <div className="small">
                              <div className="fw-semibold">{decisionActorName}</div>
                              {decisionDate && <div className="text-muted">{decisionDate}</div>}
                              {request.decisionNotes && (
                                <div className="text-muted fst-italic mt-1">
                                  "{request.decisionNotes}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small">Pending</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-flex flex-wrap justify-content-end gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              disabled={!isPending || submittingId === request.id}
                              onClick={() => decideRequest(request, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={!isPending || submittingId === request.id}
                              onClick={() => decideRequest(request, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No prerequisite override requests found.
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

export default PrerequisiteOverrides;
