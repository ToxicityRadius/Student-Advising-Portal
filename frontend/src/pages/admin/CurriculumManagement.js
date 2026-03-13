import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PaginationControls from '../../components/PaginationControls';
import api from '../../utils/api';

const initialCurriculumForm = { name: '', description: '' };
const initialCourseForm = { code: '', name: '', units: 3 };
const initialEquivalencyForm = { courseId: '', equivalentCourseId: '', notes: '' };

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || fallback;
};

const CurriculumManagement = () => {
  const navigate = useNavigate();

  const [tabKey, setTabKey] = useState('curricula');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });

  const [curricula, setCurricula] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [equivalencies, setEquivalencies] = useState([]);

  const [curriculaQuery, setCurriculaQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'createdAt', sortOrder: 'desc' });
  const [coursesQuery, setCoursesQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'code', sortOrder: 'asc' });
  const [equivsQuery, setEquivsQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'id', sortOrder: 'desc' });

  const [curriculaMeta, setCurriculaMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
  const [coursesMeta, setCoursesMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
  const [equivsMeta, setEquivsMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });

  const [curriculumForm, setCurriculumForm] = useState(initialCurriculumForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [equivalencyForm, setEquivalencyForm] = useState(initialEquivalencyForm);

  const [editingCourse, setEditingCourse] = useState(null);
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);

  const activeCurriculumId = useMemo(() => {
    const active = curricula.find((item) => item.isActive);
    return active ? active.id : null;
  }, [curricula]);

  const showFeedback = (variant, message) => {
    setAlert({ variant, message });
  };

  const clearFeedback = () => {
    setAlert({ variant: '', message: '' });
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const [curriculaRes, coursesRes, equivalenciesRes, courseOptionsRes] = await Promise.all([
        api.get('/curriculums', { params: curriculaQuery }),
        api.get('/courses', { params: coursesQuery }),
        api.get('/equivalencies', { params: equivsQuery }),
        api.get('/courses', { params: { page: 1, pageSize: 200, sortBy: 'code', sortOrder: 'asc' } })
      ]);

      setCurricula(curriculaRes.data?.items || curriculaRes.data?.data || []);
      setCourses(coursesRes.data?.items || coursesRes.data?.data || []);
      setEquivalencies(equivalenciesRes.data?.items || equivalenciesRes.data?.data || []);
      setCourseOptions(courseOptionsRes.data?.items || courseOptionsRes.data?.data || []);

      setCurriculaMeta(curriculaRes.data?.meta || { page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
      setCoursesMeta(coursesRes.data?.meta || { page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
      setEquivsMeta(equivalenciesRes.data?.meta || { page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to load curriculum management data.'));
    } finally {
      setLoading(false);
    }
  }, [curriculaQuery, coursesQuery, equivsQuery]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createCurriculum = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    clearFeedback();

    try {
      await api.post('/curriculums', curriculumForm);
      setCurriculumForm(initialCurriculumForm);
      await loadAll();
      showFeedback('success', 'Curriculum created successfully.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to create curriculum.'));
    } finally {
      setSubmitting(false);
    }
  };

  const activateCurriculum = async (id) => {
    setSubmitting(true);
    clearFeedback();

    try {
      await api.patch(`/curriculums/${id}/activate`);
      await loadAll();
      showFeedback('success', 'Active curriculum updated.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to activate curriculum.'));
    } finally {
      setSubmitting(false);
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    clearFeedback();

    try {
      await api.post('/courses', {
        ...courseForm,
        units: Number(courseForm.units)
      });
      setCourseForm(initialCourseForm);
      await loadAll();
      showFeedback('success', 'Course created successfully.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to create course.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditCourse = (course) => {
    setEditingCourse({ ...course });
    setShowCourseEditModal(true);
  };

  const saveEditedCourse = async () => {
    if (!editingCourse) {
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      await api.put(`/courses/${editingCourse.id}`, {
        code: editingCourse.code,
        name: editingCourse.name,
        units: Number(editingCourse.units)
      });
      setShowCourseEditModal(false);
      setEditingCourse(null);
      await loadAll();
      showFeedback('success', 'Course updated successfully.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to update course.'));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Delete this course? This only works if the course is not referenced.')) {
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      await api.delete(`/courses/${courseId}`);
      await loadAll();
      showFeedback('success', 'Course deleted successfully.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Unable to delete course.'));
    } finally {
      setSubmitting(false);
    }
  };

  const createEquivalency = async (e) => {
    e.preventDefault();

    if (!equivalencyForm.courseId || !equivalencyForm.equivalentCourseId) {
      showFeedback('danger', 'Please select both courses for equivalency.');
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      await api.post('/equivalencies', {
        courseId: Number(equivalencyForm.courseId),
        equivalentCourseId: Number(equivalencyForm.equivalentCourseId),
        notes: equivalencyForm.notes || null
      });

      setEquivalencyForm(initialEquivalencyForm);
      await loadAll();
      showFeedback('success', 'Course equivalency added.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to add equivalency.'));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEquivalency = async (id) => {
    if (!window.confirm('Delete this equivalency?')) {
      return;
    }

    setSubmitting(true);
    clearFeedback();

    try {
      await api.delete(`/equivalencies/${id}`);
      await loadAll();
      showFeedback('success', 'Equivalency removed.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to remove equivalency.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Curriculum Management</h2>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Tabs activeKey={tabKey} onSelect={(key) => setTabKey(key || 'curricula')} className="mb-3">
          <Tab eventKey="curricula" title="Curricula">
            <Row className="g-3">
              <Col lg={4}>
                <div className="border rounded p-3 bg-light">
                  <h5>Create Curriculum</h5>
                  <Form onSubmit={createCurriculum}>
                    <Form.Group className="mb-2">
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        value={curriculumForm.name}
                        onChange={(e) => setCurriculumForm((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={curriculumForm.description}
                        onChange={(e) => setCurriculumForm((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </Form.Group>
                    <Button type="submit" disabled={submitting}>Create</Button>
                  </Form>
                </div>
              </Col>
              <Col lg={8}>
                <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                  <Form.Control
                    placeholder="Search curricula"
                    value={curriculaQuery.search}
                    onChange={(event) => setCurriculaQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                  />
                  <Form.Select
                    value={curriculaQuery.sortBy}
                    onChange={(event) => setCurriculaQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                    style={{ maxWidth: 220 }}
                  >
                    <option value="createdAt">Sort by Created Date</option>
                    <option value="name">Sort by Name</option>
                    <option value="isActive">Sort by Status</option>
                  </Form.Select>
                  <Form.Select
                    value={curriculaQuery.sortOrder}
                    onChange={(event) => setCurriculaQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                    style={{ maxWidth: 180 }}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </Form.Select>
                </div>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curricula.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.description || '-'}</td>
                        <td>
                          {item.isActive ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}
                        </td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => navigate(`/admin/curriculum/${item.id}`)}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant={item.id === activeCurriculumId ? 'success' : 'outline-success'}
                            disabled={submitting || item.id === activeCurriculumId}
                            onClick={() => activateCurriculum(item.id)}
                          >
                            Set Active
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {curricula.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No curricula found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
                <PaginationControls
                  page={curriculaMeta.page}
                  totalPages={curriculaMeta.totalPages}
                  pageSize={curriculaMeta.pageSize}
                  onPageChange={(nextPage) => setCurriculaQuery((prev) => ({ ...prev, page: nextPage }))}
                  onPageSizeChange={(nextSize) => setCurriculaQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                />
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="courses" title="Courses">
            <Row className="g-3">
              <Col lg={4}>
                <div className="border rounded p-3 bg-light">
                  <h5>Create Course</h5>
                  <Form onSubmit={createCourse}>
                    <Form.Group className="mb-2">
                      <Form.Label>Code</Form.Label>
                      <Form.Control
                        value={courseForm.code}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        value={courseForm.name}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Units</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        max={9}
                        value={courseForm.units}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, units: e.target.value }))}
                        required
                      />
                    </Form.Group>
                    <Button type="submit" disabled={submitting}>Create</Button>
                  </Form>
                </div>
              </Col>
              <Col lg={8}>
                <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                  <Form.Control
                    placeholder="Search courses"
                    value={coursesQuery.search}
                    onChange={(event) => setCoursesQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                  />
                  <Form.Select
                    value={coursesQuery.sortBy}
                    onChange={(event) => setCoursesQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                    style={{ maxWidth: 220 }}
                  >
                    <option value="code">Sort by Code</option>
                    <option value="name">Sort by Name</option>
                    <option value="units">Sort by Units</option>
                    <option value="createdAt">Sort by Created Date</option>
                  </Form.Select>
                  <Form.Select
                    value={coursesQuery.sortOrder}
                    onChange={(event) => setCoursesQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                    style={{ maxWidth: 180 }}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </Form.Select>
                </div>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Units</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.id}>
                        <td>{course.code}</td>
                        <td>{course.name}</td>
                        <td>{course.units}</td>
                        <td className="text-end">
                          <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openEditCourse(course)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline-danger" onClick={() => deleteCourse(course.id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {courses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No courses found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
                <PaginationControls
                  page={coursesMeta.page}
                  totalPages={coursesMeta.totalPages}
                  pageSize={coursesMeta.pageSize}
                  onPageChange={(nextPage) => setCoursesQuery((prev) => ({ ...prev, page: nextPage }))}
                  onPageSizeChange={(nextSize) => setCoursesQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                />
              </Col>
            </Row>
          </Tab>

          <Tab eventKey="equivalencies" title="Equivalencies">
            <Row className="g-3">
              <Col lg={4}>
                <div className="border rounded p-3 bg-light">
                  <h5>Add Equivalency</h5>
                  <Form onSubmit={createEquivalency}>
                    <Form.Group className="mb-2">
                      <Form.Label>Course</Form.Label>
                      <Form.Select
                        value={equivalencyForm.courseId}
                        onChange={(e) => setEquivalencyForm((prev) => ({ ...prev, courseId: e.target.value }))}
                        required
                      >
                        <option value="">Select course</option>
                        {courseOptions.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Equivalent Course</Form.Label>
                      <Form.Select
                        value={equivalencyForm.equivalentCourseId}
                        onChange={(e) => setEquivalencyForm((prev) => ({ ...prev, equivalentCourseId: e.target.value }))}
                        required
                      >
                        <option value="">Select equivalent course</option>
                        {courseOptions.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={equivalencyForm.notes}
                        onChange={(e) => setEquivalencyForm((prev) => ({ ...prev, notes: e.target.value }))}
                      />
                    </Form.Group>
                    <Button type="submit" disabled={submitting}>Save</Button>
                  </Form>
                </div>
              </Col>
              <Col lg={8}>
                <div className="d-flex flex-column flex-md-row gap-2 mb-3">
                  <Form.Control
                    placeholder="Search equivalencies"
                    value={equivsQuery.search}
                    onChange={(event) => setEquivsQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                  />
                  <Form.Select
                    value={equivsQuery.sortBy}
                    onChange={(event) => setEquivsQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))}
                    style={{ maxWidth: 220 }}
                  >
                    <option value="id">Sort by ID</option>
                  </Form.Select>
                  <Form.Select
                    value={equivsQuery.sortOrder}
                    onChange={(event) => setEquivsQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))}
                    style={{ maxWidth: 180 }}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </Form.Select>
                </div>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Equivalent</th>
                      <th>Notes</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equivalencies.map((item) => (
                      <tr key={item.id}>
                        <td>{item.Course?.code} - {item.Course?.name}</td>
                        <td>{item.EquivalentCourse?.code} - {item.EquivalentCourse?.name}</td>
                        <td>{item.notes || '-'}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => deleteEquivalency(item.id)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {equivalencies.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No equivalencies found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
                <PaginationControls
                  page={equivsMeta.page}
                  totalPages={equivsMeta.totalPages}
                  pageSize={equivsMeta.pageSize}
                  onPageChange={(nextPage) => setEquivsQuery((prev) => ({ ...prev, page: nextPage }))}
                  onPageSizeChange={(nextSize) => setEquivsQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))}
                />
              </Col>
            </Row>
          </Tab>
        </Tabs>
      )}

      <Modal show={showCourseEditModal} onHide={() => setShowCourseEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Course</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingCourse && (
            <>
              <Form.Group className="mb-2">
                <Form.Label>Code</Form.Label>
                <Form.Control
                  value={editingCourse.code}
                  onChange={(e) => setEditingCourse((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Units</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={9}
                  value={editingCourse.units}
                  onChange={(e) => setEditingCourse((prev) => ({ ...prev, units: e.target.value }))}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCourseEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveEditedCourse} disabled={submitting}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CurriculumManagement;
