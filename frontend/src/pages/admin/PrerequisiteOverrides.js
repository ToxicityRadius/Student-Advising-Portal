import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHelpers';

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

const PrerequisiteOverrides = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [notesById, setNotesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [alert, setAlert] = useState({ variant: '', message: '' });

  const requestCount = useMemo(() => requests.length, [requests]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const params = statusFilter === 'all' ? {} : { status: statusFilter };
      const response = await api.get('/prerequisite-overrides', { params });
      setRequests(response.data?.data || response.data?.items || []);
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to load prerequisite override requests.'),
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const decideRequest = async (request, status) => {
    setSubmittingId(request.id);
    setAlert({ variant: '', message: '' });

    try {
      await api.patch(`/prerequisite-overrides/${request.id}/decision`, {
        status,
        decisionNotes: notesById[request.id] || '',
      });

      setRequests((currentRequests) =>
        currentRequests.map((currentRequest) =>
          currentRequest.id === request.id ? { ...currentRequest, status } : currentRequest,
        ),
      );
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
            <Form.Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ maxWidth: 220 }}
              aria-label="Filter prerequisite overrides by status"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </Form.Select>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover className="table-fixed-cols">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Student</th>
                  <th style={{ width: '18%' }}>Prerequisite</th>
                  <th style={{ width: '18%' }}>Dependent</th>
                  <th style={{ width: '14%' }}>Term</th>
                  <th style={{ width: '18%' }}>Reason</th>
                  <th style={{ width: '14%' }} className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const prerequisiteCourse = request.prerequisiteCourse || {};
                  const dependentCourse = request.dependentCourse || {};
                  const isPending = request.status === 'pending';

                  return (
                    <tr key={request.id}>
                      <td>
                        <div className="fw-semibold">{request.sar?.studentName || 'Student'}</div>
                        <div className="text-muted small">
                          {request.sar?.studentNumber || 'No student number'}
                        </div>
                        <div className="text-muted small">
                          Requested by {adviserName(request.requestedByAdviser)}
                        </div>
                      </td>
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
                    <td colSpan={6} className="text-center text-muted py-4">
                      No prerequisite override requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
};

export default PrerequisiteOverrides;
