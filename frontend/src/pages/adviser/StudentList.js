import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, InputGroup, Pagination, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CreateSARModal from '../../components/adviser/CreateSARModal';
import api from '../../utils/api';

const pageSize = 10;

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const StudentList = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [sars, setSars] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const [sarResponse, curriculumResponse] = await Promise.all([
        api.get('/sars'),
        api.get('/curriculums')
      ]);

      setSars(sarResponse.data?.data || []);
      setCurriculums(curriculumResponse.data?.data || []);
    } catch (error) {
      setAlert({ variant: 'danger', message: getErrorMessage(error, 'Failed to load student records.') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSars = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return sars;
    }

    return sars.filter((sar) => (
      String(sar.studentName || '').toLowerCase().includes(query) ||
      String(sar.studentNumber || '').toLowerCase().includes(query)
    ));
  }, [deferredSearch, sars]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredSars.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedSars = filteredSars.slice(pageStart, pageStart + pageSize);
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

  return (
    <div className="container py-4">
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
                  {paginatedSars.map((sar) => (
                    <tr key={sar.id}>
                      <td>{sar.studentName}</td>
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

                  {paginatedSars.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No student academic records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              {filteredSars.length > pageSize && (
                <Pagination className="mb-0 justify-content-end">
                  <Pagination.Prev
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  />
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <Pagination.Item
                      key={page}
                      active={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  />
                </Pagination>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <CreateSARModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSubmit={handleCreateSar}
        curriculums={curriculums}
        defaultCurriculumId={activeCurriculum?.id}
        submitting={submitting}
      />
    </div>
  );
};

export default StudentList;