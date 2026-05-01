import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  InputGroup,
  Modal,
  Spinner,
  Table,
} from 'react-bootstrap';
import AdminLayout from '../../components/admin/AdminLayout';
import PaginationControls from '../../components/PaginationControls';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHelpers';
import { getRoleLabel, isSuperadmin } from '../../utils/roles';
import useDebouncedValue from '../../utils/useDebouncedValue';

const EMPTY_META = { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 };

const userName = (user) => {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.email || 'User';
};

const adviserName = (adviser) => {
  const name = [adviser?.firstName, adviser?.lastName].filter(Boolean).join(' ').trim();
  return name || adviser?.email || 'Unassigned';
};

const assignedPrograms = (user) => {
  if (Array.isArray(user?.AssignedPrograms) && user.AssignedPrograms.length > 0) {
    return user.AssignedPrograms;
  }
  const program = user?.CurriculumRef?.Program;
  return program ? [program] : [];
};

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adviserFilter, setAdviserFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'student',
    isActive: true,
  });

  const superadmin = isSuperadmin(user);

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const params = {
        page,
        pageSize,
        search: debouncedSearch.trim(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (adviserFilter) params.adviserId = adviserFilter;
      if (programFilter) params.programId = programFilter;

      const [usersResponse, advisersResponse, programsResponse] = await Promise.all([
        api.get('/users', { params }),
        api.get('/users', {
          params: {
            role: 'adviser',
            status: 'active',
            page: 1,
            pageSize: 200,
            sortBy: 'lastName',
            sortOrder: 'asc',
            ...(programFilter ? { programId: programFilter } : {}),
          },
        }),
        api.get('/programs'),
      ]);

      setUsers(usersResponse.data?.items || usersResponse.data?.users || []);
      setMeta(usersResponse.data?.meta || EMPTY_META);
      setAdvisers(advisersResponse.data?.items || advisersResponse.data?.users || []);
      const nextPrograms = programsResponse.data?.data || [];
      setPrograms(nextPrograms);
      if (!superadmin && !programFilter && nextPrograms.length > 0) {
        setProgramFilter(String(nextPrograms[0].id));
      }
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to load users.'),
      });
    } finally {
      setLoading(false);
    }
  }, [
    adviserFilter,
    debouncedSearch,
    page,
    pageSize,
    programFilter,
    roleFilter,
    statusFilter,
    superadmin,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [adviserFilter, debouncedSearch, programFilter, roleFilter, statusFilter]);

  const roleOptions = useMemo(() => {
    if (superadmin) return ['superadmin', 'admin', 'adviser', 'student'];
    return ['adviser', 'student'];
  }, [superadmin]);

  const openEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setEditForm({
      firstName: targetUser.firstName || '',
      lastName: targetUser.lastName || '',
      email: targetUser.email || '',
      role: targetUser.role || 'student',
      isActive: Boolean(targetUser.isActive),
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({ firstName: '', lastName: '', email: '', role: 'student', isActive: true });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingUser) return;
    setSubmittingId(editingUser.id);
    setAlert({ variant: '', message: '' });
    try {
      const payload = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        isActive: editForm.isActive,
      };
      if (superadmin) {
        payload.role = editForm.role;
      }
      await api.put(`/users/${editingUser.id}`, payload);
      closeEditModal();
      await loadData();
      setAlert({ variant: 'success', message: 'User profile updated.' });
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to update user.') });
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleStatus = async (targetUser) => {
    setSubmittingId(targetUser.id);
    setAlert({ variant: '', message: '' });
    try {
      await api.patch(`/users/${targetUser.id}/toggle-status`);
      await loadData();
      setAlert({ variant: 'success', message: 'User status updated.' });
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to update status.') });
    } finally {
      setSubmittingId(null);
    }
  };

  const assignAdviser = async (targetUser, adviserId) => {
    if (!adviserId) return;
    setSubmittingId(targetUser.id);
    setAlert({ variant: '', message: '' });
    try {
      await api.put(`/users/${targetUser.id}/assign-adviser`, { adviserId: Number(adviserId) });
      await loadData();
      setAlert({ variant: 'success', message: 'Adviser assignment updated.' });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to assign adviser.'),
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const saveProgramAssignments = async (targetUser, selectedOptions) => {
    const programIds = Array.from(selectedOptions).map((option) => Number(option.value));
    setSubmittingId(targetUser.id);
    setAlert({ variant: '', message: '' });
    try {
      await api.put(`/programs/users/${targetUser.id}/assignments`, { programIds });
      await loadData();
      setAlert({ variant: 'success', message: 'Program assignments updated.' });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: getErrorMessage(error, 'Failed to update program assignments.'),
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <AdminLayout activePage="users" pageTitle="Users">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">User Management</h2>
          <p className="text-muted mb-0">
            {superadmin
              ? 'Search users, assign advisers, manage status, and maintain staff program scope.'
              : 'Search users and assign advisers within your program scope.'}
          </p>
        </div>
        <Badge bg="secondary" className="align-self-start align-self-lg-center">
          {meta.totalItems || 0} users
        </Badge>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div className="d-flex flex-column flex-xl-row gap-2">
            <InputGroup>
              <InputGroup.Text>Search</InputGroup.Text>
              <Form.Control
                placeholder="Name, email, or role"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
            <Form.Select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              style={{ maxWidth: 190 }}
              aria-label="Role filter"
            >
              <option value="">All Roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ maxWidth: 170 }}
              aria-label="Status filter"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
            <Form.Select
              value={adviserFilter}
              onChange={(event) => setAdviserFilter(event.target.value)}
              style={{ maxWidth: 230 }}
              aria-label="Adviser filter"
            >
              <option value="">All Advisers</option>
              {advisers.map((adviser) => (
                <option key={adviser.id} value={adviser.id}>
                  {adviserName(adviser)}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
              style={{ maxWidth: 230 }}
              aria-label="Program filter"
            >
              {superadmin && <option value="">All Programs</option>}
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} - {program.name}
                </option>
              ))}
            </Form.Select>
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
              <Table responsive hover className="align-middle table-fixed-cols">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>User</th>
                    <th style={{ width: '12%' }}>Role</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '20%' }}>Program Scope</th>
                    <th style={{ width: '20%' }}>Adviser</th>
                    <th style={{ width: '16%' }} className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((targetUser) => {
                    const programsForUser = assignedPrograms(targetUser);
                    const isStudent = targetUser.role === 'student';
                    const isStaff = targetUser.role === 'admin' || targetUser.role === 'adviser';
                    const assignedProgramIds = new Set(
                      programsForUser.map((program) => String(program.id)),
                    );

                    return (
                      <tr key={targetUser.id}>
                        <td>
                          <div className="fw-semibold">{userName(targetUser)}</div>
                          <div className="text-muted small">{targetUser.email}</div>
                        </td>
                        <td>{getRoleLabel(targetUser.role) || targetUser.role}</td>
                        <td>
                          <Badge bg={targetUser.isActive ? 'success' : 'secondary'}>
                            {targetUser.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          {superadmin && isStaff ? (
                            <Form.Select
                              multiple
                              size="sm"
                              value={Array.from(assignedProgramIds)}
                              onChange={(event) =>
                                saveProgramAssignments(targetUser, event.target.selectedOptions)
                              }
                              disabled={submittingId === targetUser.id}
                              aria-label={`Program assignments for ${userName(targetUser)}`}
                            >
                              {programs.map((program) => (
                                <option key={program.id} value={program.id}>
                                  {program.code}
                                </option>
                              ))}
                            </Form.Select>
                          ) : programsForUser.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1">
                              {programsForUser.map((program) => (
                                <Badge key={program.id} bg="light" text="dark" className="border">
                                  {program.code}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          {isStudent ? (
                            <Form.Select
                              size="sm"
                              value={targetUser.Adviser?.id || ''}
                              onChange={(event) => assignAdviser(targetUser, event.target.value)}
                              disabled={submittingId === targetUser.id || advisers.length === 0}
                              aria-label={`Assign adviser for ${userName(targetUser)}`}
                            >
                              <option value="" disabled>
                                {targetUser.Adviser
                                  ? adviserName(targetUser.Adviser)
                                  : 'Select adviser'}
                              </option>
                              {advisers.map((adviser) => (
                                <option key={adviser.id} value={adviser.id}>
                                  {adviserName(adviser)}
                                </option>
                              ))}
                            </Form.Select>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td className="text-end">
                          {superadmin ? (
                            <div className="d-flex justify-content-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openEditModal(targetUser)}
                                disabled={submittingId === targetUser.id}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  targetUser.isActive ? 'outline-secondary' : 'outline-success'
                                }
                                onClick={() => toggleStatus(targetUser)}
                                disabled={submittingId === targetUser.id}
                              >
                                {targetUser.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted small">Insufficient Permission</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No users match the selected filters.
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
                pageSizeOptions={[10, 20, 50]}
              />
            </>
          )}
        </Card.Body>
      </Card>

      <Modal show={Boolean(editingUser)} onHide={closeEditModal} centered>
        <Form onSubmit={saveEdit}>
          <Modal.Header closeButton>
            <Modal.Title>Edit User</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="edit-first-name">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                value={editForm.firstName}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, firstName: event.target.value }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="edit-last-name">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={editForm.lastName}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, lastName: event.target.value }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="edit-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="edit-role">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={editForm.role}
                disabled={!superadmin}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Check
              type="switch"
              id="edit-user-active"
              label="Active"
              checked={editForm.isActive}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submittingId === editingUser?.id}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
};

export default UserManagement;
