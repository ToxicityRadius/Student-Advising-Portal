import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import api from '../../utils/api';
import PaginationControls from '../../components/PaginationControls';
import AdminLayout from '../../components/admin/AdminLayout';

const initialForm = {
  schoolYear: '',
  semester: '1'
};

const semesterLabel = {
  1: '1st Semester',
  2: '2nd Semester',
  3: 'Summer'
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const TermManagement = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });

  const [currentTerm, setCurrentTerm] = useState(null);
  const [terms, setTerms] = useState([]);
  const [allTerms, setAllTerms] = useState([]);
  const [termsMeta, setTermsMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
  const [termsQuery, setTermsQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'schoolYear', sortOrder: 'desc' });
  const [form, setForm] = useState(initialForm);

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [termToActivate, setTermToActivate] = useState(null);

  const [showEndModal, setShowEndModal] = useState(false);

  const pastTerms = useMemo(() => {
    if (!currentTerm) {
      return allTerms;
    }

    return allTerms.filter((term) => term.id !== currentTerm.id);
  }, [allTerms, currentTerm]);

  const showFeedback = (variant, message) => setAlert({ variant, message });

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });

    try {
      const [currentRes, termsRes, allTermsRes] = await Promise.all([
        api.get('/terms/current'),
        api.get('/terms', { params: termsQuery }),
        api.get('/terms', { params: { page: 1, pageSize: 200, sortBy: 'schoolYear', sortOrder: 'desc' } })
      ]);

      setCurrentTerm(currentRes.data?.data || null);
      setTerms(termsRes.data?.items || termsRes.data?.data || []);
      setTermsMeta(termsRes.data?.meta || { page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
      setAllTerms(allTermsRes.data?.items || allTermsRes.data?.data || []);
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to load term data.'));
    } finally {
      setLoading(false);
    }
  }, [termsQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTerm = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setAlert({ variant: '', message: '' });

    try {
      await api.post('/terms', {
        schoolYear: form.schoolYear.trim(),
        semester: Number(form.semester)
      });

      setForm(initialForm);
      await loadData();
      showFeedback('success', 'Academic term created successfully.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to create term.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openActivateModal = (term) => {
    setTermToActivate(term);
    setShowActivateModal(true);
  };

  const confirmActivateTerm = async () => {
    if (!termToActivate) {
      return;
    }

    setSubmitting(true);
    setAlert({ variant: '', message: '' });

    try {
      await api.patch(`/terms/${termToActivate.id}/activate`);
      setShowActivateModal(false);
      setTermToActivate(null);
      await loadData();
      showFeedback('success', 'Term activated. Active study plans are now marked for revalidation.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to activate term.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmEndCurrentTerm = async () => {
    setSubmitting(true);
    setAlert({ variant: '', message: '' });

    try {
      await api.patch('/terms/current/end');
      setShowEndModal(false);
      await loadData();
      showFeedback('success', 'Current term ended and a forecast snapshot was stored.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to end current term.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout activePage="terms" pageTitle="Term Management">
      <h2 className="mb-3">Term Management</h2>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Card className="mb-4 border-start border-primary border-5 shadow-sm">
            <Card.Body>
              <Row className="align-items-center">
                <Col md={8}>
                  <h5 className="mb-2">Current Active Term</h5>
                  {currentTerm ? (
                    <div>
                      <div className="fw-semibold fs-5">{currentTerm.schoolYear}</div>
                      <div className="text-muted">{semesterLabel[currentTerm.semester] || `Semester ${currentTerm.semester}`}</div>
                      <div className="mt-2">
                        <Badge bg="success">Active</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted mb-0">No active term.</p>
                  )}
                </Col>
                <Col md={4} className="text-md-end mt-3 mt-md-0">
                  <Button
                    variant="outline-danger"
                    disabled={!currentTerm || submitting}
                    onClick={() => setShowEndModal(true)}
                  >
                    End Current Term
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Row className="g-3 mb-4">
            <Col lg={4}>
              <Card className="h-100">
                <Card.Body>
                  <h5 className="mb-3">Create New Term</h5>
                  <Form onSubmit={handleCreateTerm}>
                    <Form.Group className="mb-3">
                      <Form.Label>School Year</Form.Label>
                      <Form.Control
                        placeholder="e.g. 2026-2027"
                        value={form.schoolYear}
                        onChange={(e) => setForm((prev) => ({ ...prev, schoolYear: e.target.value }))}
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Semester</Form.Label>
                      <Form.Select
                        value={form.semester}
                        onChange={(e) => setForm((prev) => ({ ...prev, semester: e.target.value }))}
                        required
                      >
                        <option value="1">1st Semester</option>
                        <option value="2">2nd Semester</option>
                        <option value="3">Summer</option>
                      </Form.Select>
                    </Form.Group>
                    <Button type="submit" disabled={submitting}>Create Term</Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={8}>
              <Card>
                <Card.Body>
                  <h5 className="mb-3">All Terms</h5>
                  <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                    <Form.Control
                      placeholder="Search school year or semester"
                      value={termsQuery.search}
                      onChange={(event) => setTermsQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                    />
                    <Form.Select
                      value={termsQuery.sortBy}
                      onChange={(event) => setTermsQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                      style={{ maxWidth: 220 }}
                    >
                      <option value="schoolYear">Sort by School Year</option>
                      <option value="semester">Sort by Semester</option>
                      <option value="id">Sort by ID</option>
                    </Form.Select>
                    <Form.Select
                      value={termsQuery.sortOrder}
                      onChange={(event) => setTermsQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                      style={{ maxWidth: 180 }}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </Form.Select>
                  </div>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>School Year</th>
                        <th>Semester</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((term) => (
                        <tr key={term.id}>
                          <td>{term.schoolYear}</td>
                          <td>{semesterLabel[term.semester] || `Semester ${term.semester}`}</td>
                          <td>
                            {term.isCurrent ? <Badge bg="success">Current</Badge> : <Badge bg="secondary">Past / Inactive</Badge>}
                          </td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              disabled={submitting || term.isCurrent}
                              onClick={() => openActivateModal(term)}
                            >
                              Activate Term
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {terms.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-4">No terms available.</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  <PaginationControls
                    page={termsMeta.page}
                    totalPages={termsMeta.totalPages}
                    pageSize={termsMeta.pageSize}
                    onPageChange={(nextPage) => setTermsQuery((prev) => ({ ...prev, page: nextPage }))}
                    onPageSizeChange={(nextSize) => setTermsQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card>
            <Card.Body>
              <h6 className="mb-2">Past Terms</h6>
              {pastTerms.length > 0 ? (
                <ul className="mb-0">
                  {pastTerms.map((term) => (
                    <li key={term.id}>
                      {term.schoolYear} — {semesterLabel[term.semester] || `Semester ${term.semester}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">No past terms yet.</p>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      <Modal show={showActivateModal} onHide={() => setShowActivateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Activate Term</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {termToActivate ? (
            <p className="mb-0">
              Activate <strong>{termToActivate.schoolYear}</strong> ({semesterLabel[termToActivate.semester] || `Semester ${termToActivate.semester}`})?
              This ends the current advising cycle and marks active study plans for revalidation.
            </p>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActivateModal(false)} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={confirmActivateTerm} disabled={submitting}>Confirm Activate</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEndModal} onHide={() => setShowEndModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>End Current Term</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            End the current term now? This will set an end timestamp and store the current forecast snapshot.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEndModal(false)} disabled={submitting}>Cancel</Button>
          <Button variant="danger" onClick={confirmEndCurrentTerm} disabled={submitting}>Confirm End Term</Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
};

export default TermManagement;
