import React, { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Image, InputGroup, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CreateSARModal from '../../components/adviser/CreateSARModal';
import PaginationControls from '../../components/PaginationControls';
import api from '../../utils/api';
import { fetchCurriculumsCached } from '../../utils/curriculumsCache';
import { buildProfileImageUrl, getInitials } from '../../utils/profileImage';
import AdviserLayout from '../../components/adviser/AdviserLayout';

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const StudentList = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [sars, setSars] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortBy, setSortBy] = useState('studentName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [meta, setMeta] = useState({ page: 1, pageSize: 12, totalItems: 0, totalPages: 1 });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const [sarResponse, curriculumData] = await Promise.all([
        api.get('/sars', {
          params: {
            page,
            pageSize,
            search: deferredSearch.trim(),
            sortBy,
            sortOrder
          }
        }),
        fetchCurriculumsCached({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' })
      ]);

      setSars(sarResponse.data?.items || sarResponse.data?.data || []);
      setMeta(sarResponse.data?.meta || { page: 1, pageSize, totalItems: 0, totalPages: 1 });
      setCurriculums(curriculumData?.items || curriculumData?.data || []);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load student records.') });
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const activeCurriculum = curriculums.find((curriculum) => curriculum.isActive) || null;

  const handleCreateSar = async (payload) => {
    setSubmitting(true);
    setAlert({ variant: '', message: '' });

    try {
      await api.post('/sars', payload);
      await loadData();
      setAlert({ variant: 'success', message: 'Student academic record created successfully.' });
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to create the student academic record.') });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupEmail = async (email) => {
    const response = await api.get('/sars/autofill', { params: { email } });
    return response.data?.data || null;
  };

  return (
    <AdviserLayout activePage="students" pageTitle="Student Academic Records">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Student Academic Records</h2>
          <p className="text-muted mb-0">Search, review, and initialize study plans for students.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create New Record</Button>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text>Search</InputGroup.Text>
            <Form.Control
              placeholder="Search by student name or student number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
          <div className="d-flex flex-column flex-md-row gap-2 mt-3">
            <Form.Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ maxWidth: 220 }}>
              <option value="studentName">Sort by Name</option>
              <option value="studentNumber">Sort by Student Number</option>
              <option value="email">Sort by Email</option>
              <option value="yearLevel">Sort by Year Level</option>
              <option value="createdAt">Sort by Created Date</option>
            </Form.Select>
            <Form.Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} style={{ maxWidth: 180 }}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Form.Select>
          </div>
          <div className="text-muted small mt-2">
            {activeCurriculum ? `Active curriculum default: ${activeCurriculum.name}` : 'No active curriculum is currently set.'}
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
                    <th>Student</th>
                    <th>Student Number</th>
                    <th>Email</th>
                    <th>Link Status</th>
                    <th>Year Level</th>
                    <th>Curriculum</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sars.map((sar) => (
                    <tr key={sar.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {buildProfileImageUrl(sar.Student?.profile_picture) ? (
                            <Image
                              src={buildProfileImageUrl(sar.Student?.profile_picture)}
                              roundedCircle
                              width={32}
                              height={32}
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              {getInitials(sar.studentName)}
                            </div>
                          )}
                          <span>{sar.studentName}</span>
                        </div>
                      </td>
                      <td>{sar.studentNumber}</td>
                      <td>{sar.email}</td>
                      <td>
                        <Badge bg={sar.isLinkedToAccount ? 'success' : 'secondary'} className="text-uppercase">
                          {sar.isLinkedToAccount ? 'linked' : 'unlinked'}
                        </Badge>
                      </td>
                      <td>Year {sar.yearLevel}</td>
                      <td>{sar.Curriculum?.name || 'Unassigned'}</td>
                      <td className="text-end">
                        <Button as={Link} to={`/adviser/students/${sar.id}`} size="sm" variant="outline-primary">
                          View Record
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {sars.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No student academic records found.
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

      <CreateSARModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSubmit={handleCreateSar}
        onLookupEmail={handleLookupEmail}
        curriculums={curriculums}
        defaultCurriculumId={activeCurriculum?.id}
        submitting={submitting}
      />
    </AdviserLayout>
  );
};

export default StudentList;