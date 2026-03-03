import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Badge,
  Spinner,
  Alert,
  Accordion
} from 'react-bootstrap';
import api from '../../utils/api';

const CurriculumManager = () => {
  // ── State ──
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Curriculum form
  const [showCurrForm, setShowCurrForm] = useState(false);
  const [currForm, setCurrForm] = useState({ version_year: '', active_status: true });
  const [editingCurrId, setEditingCurrId] = useState(null);

  // Subject form
  const [showSubjForm, setShowSubjForm] = useState(false);
  const [subjForm, setSubjForm] = useState({
    curriculumId: '',
    course_code: '',
    title: '',
    units: 3,
    seasonal_term: ''
  });
  const [editingSubjId, setEditingSubjId] = useState(null);

  // Prerequisite modal
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [prereqForm, setPrereqForm] = useState({ subject_id: '', required_subj_id: '' });

  // Equivalency modal
  const [showEquivModal, setShowEquivModal] = useState(false);
  const [equivForm, setEquivForm] = useState({ source_subject_id: '', target_subject_id: '' });

  // All subjects flat list for prerequisite/equivalency dropdowns
  const allSubjects = curriculums.flatMap(c =>
    (c.Subjects || []).map(s => ({ ...s, curriculum: c.version_year }))
  );

  // ── Data Fetching ──
  const fetchCurriculums = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/curriculum');
      setCurriculums(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load curriculums');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurriculums();
  }, [fetchCurriculums]);

  // ── Helpers ──
  const clearMessages = () => { setError(''); setSuccess(''); };
  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  // ── Curriculum Handlers ──
  const handleCurrSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      if (editingCurrId) {
        await api.put(`/curriculum/${editingCurrId}`, currForm);
        flash('Curriculum updated');
      } else {
        await api.post('/curriculum', currForm);
        flash('Curriculum created');
      }
      setShowCurrForm(false);
      setCurrForm({ version_year: '', active_status: true });
      setEditingCurrId(null);
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editCurriculum = (c) => {
    setCurrForm({ version_year: c.version_year, active_status: c.active_status });
    setEditingCurrId(c.id);
    setShowCurrForm(true);
  };

  const deleteCurriculum = async (id) => {
    if (!window.confirm('Delete this curriculum and all its subjects?')) return;
    clearMessages();
    try {
      await api.delete(`/curriculum/${id}`);
      flash('Curriculum deleted');
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Subject Handlers ──
  const handleSubjSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      if (editingSubjId) {
        await api.put(`/curriculum/subjects/${editingSubjId}`, subjForm);
        flash('Subject updated');
      } else {
        await api.post('/curriculum/subjects', subjForm);
        flash('Subject created');
      }
      setShowSubjForm(false);
      setSubjForm({ curriculumId: '', course_code: '', title: '', units: 3, seasonal_term: '' });
      setEditingSubjId(null);
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const editSubject = (s) => {
    setSubjForm({
      curriculumId: s.CurriculumId,
      course_code: s.course_code,
      title: s.title,
      units: s.units,
      seasonal_term: s.seasonal_term || ''
    });
    setEditingSubjId(s.id);
    setShowSubjForm(true);
  };

  const deleteSubject = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    clearMessages();
    try {
      await api.delete(`/curriculum/subjects/${id}`);
      flash('Subject deleted');
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const openAddSubject = (currId) => {
    setSubjForm({ curriculumId: currId, course_code: '', title: '', units: 3, seasonal_term: '' });
    setEditingSubjId(null);
    setShowSubjForm(true);
  };

  // ── Prerequisite Handler ──
  const handlePrereqSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      await api.post('/curriculum/prerequisites', {
        subject_id: Number(prereqForm.subject_id),
        required_subj_id: Number(prereqForm.required_subj_id)
      });
      flash('Prerequisite added');
      setShowPrereqModal(false);
      setPrereqForm({ subject_id: '', required_subj_id: '' });
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add prerequisite');
    }
  };

  // ── Equivalency Handler ──
  const handleEquivSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      await api.post('/curriculum/equivalencies', {
        source_subject_id: Number(equivForm.source_subject_id),
        target_subject_id: Number(equivForm.target_subject_id)
      });
      flash('Equivalency rule added');
      setShowEquivModal(false);
      setEquivForm({ source_subject_id: '', target_subject_id: '' });
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add equivalency');
    }
  };

  // ── Delete Prerequisite ──
  const removePrerequisite = async (id) => {
    clearMessages();
    try {
      await api.delete(`/curriculum/prerequisites/${id}`);
      flash('Prerequisite removed');
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove prerequisite');
    }
  };

  // ── Delete Equivalency ──
  const removeEquivalency = async (id) => {
    clearMessages();
    try {
      await api.delete(`/curriculum/equivalencies/${id}`);
      flash('Equivalency removed');
      fetchCurriculums();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove equivalency');
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="warning" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Curriculum Manager</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* ── Top Actions ── */}
      <Row className="mb-3 g-2">
        <Col xs="auto">
          <Button variant="warning" onClick={() => { setEditingCurrId(null); setCurrForm({ version_year: '', active_status: true }); setShowCurrForm(true); }}>
            + New Curriculum
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="outline-secondary" onClick={() => setShowPrereqModal(true)}>
            Add Prerequisite
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="outline-secondary" onClick={() => setShowEquivModal(true)}>
            Add Equivalency
          </Button>
        </Col>
      </Row>

      {/* ── Curriculum List ── */}
      {curriculums.length === 0 ? (
        <Card body className="text-center text-muted">No curriculums yet. Create one to get started.</Card>
      ) : (
        <Accordion defaultActiveKey="0">
          {curriculums.map((c, idx) => (
            <Accordion.Item eventKey={String(idx)} key={c.id}>
              <Accordion.Header>
                <span className="me-2 fw-bold">{c.version_year}</span>
                <Badge bg={c.active_status ? 'success' : 'secondary'} className="me-2">
                  {c.active_status ? 'Active' : 'Inactive'}
                </Badge>
                <small className="text-muted">({(c.Subjects || []).length} subjects)</small>
              </Accordion.Header>
              <Accordion.Body>
                <div className="mb-2">
                  <Button size="sm" variant="outline-primary" className="me-2" onClick={() => editCurriculum(c)}>
                    Edit Curriculum
                  </Button>
                  <Button size="sm" variant="outline-danger" className="me-2" onClick={() => deleteCurriculum(c.id)}>
                    Delete Curriculum
                  </Button>
                  <Button size="sm" variant="success" onClick={() => openAddSubject(c.id)}>
                    + Add Subject
                  </Button>
                </div>

                {(c.Subjects || []).length === 0 ? (
                  <p className="text-muted mt-3">No subjects in this curriculum.</p>
                ) : (
                  <Table striped bordered hover responsive size="sm" className="mt-3">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Title</th>
                        <th>Units</th>
                        <th>Term</th>
                        <th style={{ width: '140px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.Subjects.map(s => (
                        <React.Fragment key={s.id}>
                          <tr>
                            <td>{s.course_code}</td>
                            <td>{s.title}</td>
                            <td>{s.units}</td>
                            <td>{s.seasonal_term || '—'}</td>
                            <td>
                              <Button size="sm" variant="outline-primary" className="me-1" onClick={() => editSubject(s)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => deleteSubject(s.id)}>
                                Del
                              </Button>
                            </td>
                          </tr>
                          {/* Prerequisites & Equivalencies nested row */}
                          {((s.prerequisites && s.prerequisites.length > 0) ||
                            (s.equivalencies && s.equivalencies.length > 0)) && (
                            <tr>
                              <td colSpan="5" className="ps-4 py-1" style={{ backgroundColor: '#f8f9fa' }}>
                                {s.prerequisites && s.prerequisites.length > 0 && (
                                  <div className="mb-1">
                                    <small className="text-muted me-2">Prerequisites:</small>
                                    {s.prerequisites.map(p => (
                                      <Badge
                                        key={p.id}
                                        bg="info"
                                        className="me-1"
                                        style={{ fontSize: '0.8em' }}
                                      >
                                        {p.RequiredSubject
                                          ? p.RequiredSubject.course_code
                                          : `ID ${p.required_subj_id}`}
                                        <span
                                          role="button"
                                          className="ms-1"
                                          style={{ cursor: 'pointer' }}
                                          onClick={() => removePrerequisite(p.id)}
                                          title="Remove prerequisite"
                                        >
                                          &times;
                                        </span>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {s.equivalencies && s.equivalencies.length > 0 && (
                                  <div>
                                    <small className="text-muted me-2">Equivalencies:</small>
                                    {s.equivalencies.map(e => (
                                      <Badge
                                        key={e.id}
                                        bg="warning"
                                        text="dark"
                                        className="me-1"
                                        style={{ fontSize: '0.8em' }}
                                      >
                                        &rarr; {e.TargetSubject
                                          ? e.TargetSubject.course_code
                                          : `ID ${e.target_subject_id}`}
                                        <span
                                          role="button"
                                          className="ms-1"
                                          style={{ cursor: 'pointer' }}
                                          onClick={() => removeEquivalency(e.id)}
                                          title="Remove equivalency"
                                        >
                                          &times;
                                        </span>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      {/* ── Curriculum Form Modal ── */}
      <Modal show={showCurrForm} onHide={() => setShowCurrForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCurrId ? 'Edit Curriculum' : 'New Curriculum'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCurrSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Version Year</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. 2024-2025"
                value={currForm.version_year}
                onChange={e => setCurrForm({ ...currForm, version_year: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Check
              type="switch"
              label="Active"
              checked={currForm.active_status}
              onChange={e => setCurrForm({ ...currForm, active_status: e.target.checked })}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCurrForm(false)}>Cancel</Button>
            <Button variant="warning" type="submit">{editingCurrId ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── Subject Form Modal ── */}
      <Modal show={showSubjForm} onHide={() => setShowSubjForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingSubjId ? 'Edit Subject' : 'Add Subject'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubjSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Curriculum</Form.Label>
              <Form.Select
                value={subjForm.curriculumId}
                onChange={e => setSubjForm({ ...subjForm, curriculumId: e.target.value })}
                required
              >
                <option value="">Select curriculum...</option>
                {curriculums.map(c => (
                  <option key={c.id} value={c.id}>{c.version_year}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Course Code</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. CS101"
                value={subjForm.course_code}
                onChange={e => setSubjForm({ ...subjForm, course_code: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Introduction to Programming"
                value={subjForm.title}
                onChange={e => setSubjForm({ ...subjForm, title: e.target.value })}
                required
              />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Units</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={subjForm.units}
                    onChange={e => setSubjForm({ ...subjForm, units: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Seasonal Term</Form.Label>
                  <Form.Select
                    value={subjForm.seasonal_term}
                    onChange={e => setSubjForm({ ...subjForm, seasonal_term: e.target.value })}
                  >
                    <option value="" disabled>Select Term</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Both Semesters">Both Semesters</option>
                    <option value="Summer">Summer</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSubjForm(false)}>Cancel</Button>
            <Button variant="warning" type="submit">{editingSubjId ? 'Update' : 'Add'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── Prerequisite Modal ── */}
      <Modal show={showPrereqModal} onHide={() => setShowPrereqModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Prerequisite</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePrereqSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Select
                value={prereqForm.subject_id}
                onChange={e => setPrereqForm({ ...prereqForm, subject_id: e.target.value })}
                required
              >
                <option value="">Select subject...</option>
                {allSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.course_code} — {s.title} ({s.curriculum})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Required Prerequisite Subject</Form.Label>
              <Form.Select
                value={prereqForm.required_subj_id}
                onChange={e => setPrereqForm({ ...prereqForm, required_subj_id: e.target.value })}
                required
              >
                <option value="">Select prerequisite...</option>
                {allSubjects
                  .filter(s => String(s.id) !== String(prereqForm.subject_id))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.course_code} — {s.title} ({s.curriculum})
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPrereqModal(false)}>Cancel</Button>
            <Button variant="warning" type="submit">Add Prerequisite</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── Equivalency Modal ── */}
      <Modal show={showEquivModal} onHide={() => setShowEquivModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Equivalency Rule</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEquivSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Source Subject</Form.Label>
              <Form.Select
                value={equivForm.source_subject_id}
                onChange={e => setEquivForm({ ...equivForm, source_subject_id: e.target.value })}
                required
              >
                <option value="">Select source subject...</option>
                {allSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.course_code} — {s.title} ({s.curriculum})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Equivalent Target Subject</Form.Label>
              <Form.Select
                value={equivForm.target_subject_id}
                onChange={e => setEquivForm({ ...equivForm, target_subject_id: e.target.value })}
                required
              >
                <option value="">Select target subject...</option>
                {allSubjects
                  .filter(s => String(s.id) !== String(equivForm.source_subject_id))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.course_code} — {s.title} ({s.curriculum})
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEquivModal(false)}>Cancel</Button>
            <Button variant="warning" type="submit">Add Equivalency</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default CurriculumManager;
