import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Tab,
  Table,
  Tabs
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PaginationControls from '../../components/PaginationControls';
import ConfirmModal from '../../components/ConfirmModal';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import useDebouncedValue from '../../utils/useDebouncedValue';

const initialCurriculumForm = { name: '', description: '' };
const initialCourseForm = { code: '', name: '', units: 3 };
const initialEquivalencyForm = { courseId: '', equivalentCourseId: '', notes: '' };

const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const CurriculumManagement = () => {
  const navigate = useNavigate();

  const [tabKey, setTabKey] = useState('curricula');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const hasLoadedOnceRef = useRef(false);

  const [curricula, setCurricula] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [equivalencies, setEquivalencies] = useState([]);

  const [curriculaQuery, setCurriculaQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'createdAt', sortOrder: 'desc' });
  const [coursesQuery, setCoursesQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'code', sortOrder: 'asc' });
  const [equivsQuery, setEquivsQuery] = useState({ page: 1, pageSize: 12, search: '', sortBy: 'id', sortOrder: 'desc' });
  const debouncedCurriculaSearch = useDebouncedValue(curriculaQuery.search, 350);
  const debouncedCoursesSearch = useDebouncedValue(coursesQuery.search, 350);
  const debouncedEquivsSearch = useDebouncedValue(equivsQuery.search, 350);

  const [curriculaMeta, setCurriculaMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
  const [coursesMeta, setCoursesMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });
  const [equivsMeta, setEquivsMeta] = useState({ page: 1, pageSize: 12, totalPages: 1, totalItems: 0 });

  const [curriculumForm, setCurriculumForm] = useState(initialCurriculumForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [equivalencyForm, setEquivalencyForm] = useState(initialEquivalencyForm);

  const [editingCourse, setEditingCourse] = useState(null);
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);

  const [courseUnitsFilter, setCourseUnitsFilter] = useState('all');
  const [courseCodePrefixFilter, setCourseCodePrefixFilter] = useState('all');

  const [selectedCurriculumIdForCsv, setSelectedCurriculumIdForCsv] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });

  const activeCurriculumId = useMemo(() => {
    const active = curricula.find((item) => item.isActive);
    return active ? active.id : null;
  }, [curricula]);

  useEffect(() => {
    if (!selectedCurriculumIdForCsv && activeCurriculumId) {
      setSelectedCurriculumIdForCsv(String(activeCurriculumId));
    }
  }, [activeCurriculumId, selectedCurriculumIdForCsv]);

  const showFeedback = (variant, message) => setAlert({ variant, message });
  const clearFeedback = () => setAlert({ variant: '', message: '' });

  const loadAll = useCallback(async () => {
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    setAlert({ variant: '', message: '' });
    try {
      const curriculumListRequest = api.get('/curriculums', {
        params: {
          page: curriculaQuery.page,
          pageSize: curriculaQuery.pageSize,
          sortBy: curriculaQuery.sortBy,
          sortOrder: curriculaQuery.sortOrder,
          search: debouncedCurriculaSearch,
          compact: true,
          _ts: Date.now()
        },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });

      const [curriculaRes, coursesRes, equivalenciesRes, courseOptionsRes] = await Promise.all([
        curriculumListRequest,
        api.get('/courses', {
          params: {
            page: coursesQuery.page,
            pageSize: coursesQuery.pageSize,
            sortBy: coursesQuery.sortBy,
            sortOrder: coursesQuery.sortOrder,
            search: debouncedCoursesSearch
          }
        }),
        api.get('/equivalencies', {
          params: {
            page: equivsQuery.page,
            pageSize: equivsQuery.pageSize,
            sortBy: equivsQuery.sortBy,
            sortOrder: equivsQuery.sortOrder,
            search: debouncedEquivsSearch
          }
        }),
        api.get('/courses', { params: { page: 1, pageSize: 500, sortBy: 'code', sortOrder: 'asc' } })
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
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, [
    curriculaQuery.page,
    curriculaQuery.pageSize,
    curriculaQuery.sortBy,
    curriculaQuery.sortOrder,
    debouncedCurriculaSearch,
    coursesQuery.page,
    coursesQuery.pageSize,
    coursesQuery.sortBy,
    coursesQuery.sortOrder,
    debouncedCoursesSearch,
    equivsQuery.page,
    equivsQuery.pageSize,
    equivsQuery.sortBy,
    equivsQuery.sortOrder,
    debouncedEquivsSearch
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createCurriculum = async (event) => {
    event.preventDefault();
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
      setCurricula((prev) => prev.map((item) => ({ ...item, isActive: item.id === id })));
      setSelectedCurriculumIdForCsv(String(id));
      await loadAll();
      showFeedback('success', 'Active curriculum updated.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to activate curriculum.'));
    } finally {
      setSubmitting(false);
    }
  };

  const createCourse = async (event) => {
    event.preventDefault();
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
    if (!editingCourse) return;

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
    setConfirmDialog({
      show: true,
      title: 'Delete Course',
      message: 'Delete this course? This only works if the course is not referenced.',
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, show: false }));
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
      }
    });
  };

  const createEquivalency = async (event) => {
    event.preventDefault();

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
    setConfirmDialog({
      show: true,
      title: 'Delete Equivalency',
      message: 'Delete this equivalency?',
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, show: false }));
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
      }
    });
  };

  const previewCsvImport = async () => {
    if (!selectedCurriculumIdForCsv) {
      showFeedback('danger', 'Select a curriculum before previewing import.');
      return;
    }
    if (!csvFile) {
      showFeedback('danger', 'Select a CSV file to preview.');
      return;
    }

    setImporting(true);
    clearFeedback();

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const response = await api.post(`/curriculums/${selectedCurriculumIdForCsv}/import/csv/preview`, formData);
      setImportPreview(response.data?.data || null);
      showFeedback('success', 'Import preview generated. Review row-level results before applying.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to generate import preview.'));
    } finally {
      setImporting(false);
    }
  };

  const applyCsvImport = async () => {
    if (!selectedCurriculumIdForCsv) {
      showFeedback('danger', 'Select a curriculum before applying import.');
      return;
    }
    if (!csvFile) {
      showFeedback('danger', 'Select a CSV file to apply import.');
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Apply CSV Import',
      message: 'Apply CSV import now? This replaces curriculum structure/prerequisite/corequisite/track mappings with transactional safety.',
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, show: false }));
        setImporting(true);
        clearFeedback();
        try {
          const formData = new FormData();
          formData.append('file', csvFile);
          const response = await api.post(`/curriculums/${selectedCurriculumIdForCsv}/import/csv/apply`, formData);
          setImportPreview(response.data?.data || null);
          await loadAll();
          showFeedback('success', response.data?.message || 'CSV import applied successfully.');
        } catch (error) {
          const payload = error?.response?.data?.data;
          if (payload) {
            setImportPreview(payload);
          }
          showFeedback('danger', getErrorMessage(error, 'Failed to apply CSV import.'));
        } finally {
          setImporting(false);
        }
      }
    });
  };

  const exportCsv = async () => {
    if (!selectedCurriculumIdForCsv) {
      showFeedback('danger', 'Select a curriculum before exporting.');
      return;
    }

    setExporting(true);
    clearFeedback();
    try {
      const response = await api.get(`/curriculums/${selectedCurriculumIdForCsv}/export/csv`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers['content-disposition'] || '';
      const matched = disposition.match(/filename="?([^";]+)"?/i);
      link.href = objectUrl;
      link.download = matched?.[1] || `curriculum-${selectedCurriculumIdForCsv}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      showFeedback('success', 'Curriculum CSV exported.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to export curriculum CSV.'));
    } finally {
      setExporting(false);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const unitsMatch = courseUnitsFilter === 'all' || Number(course.units) === Number(courseUnitsFilter);
      const prefixMatch = courseCodePrefixFilter === 'all' || String(course.code || '').toUpperCase().startsWith(courseCodePrefixFilter);
      return unitsMatch && prefixMatch;
    });
  }, [courses, courseUnitsFilter, courseCodePrefixFilter]);

  const courseUnitSummary = useMemo(() => {
    return filteredCourses.reduce((acc, course) => {
      const key = Number(course.units || 0);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [filteredCourses]);

  const getCourseCurriculumYears = (course) => {
    const years = (course.CurriculumCourses || [])
      .map((entry) => {
        const name = String(entry.Curriculum?.name || '');
        const match = name.match(/\b(19|20)\d{2}\b/);
        return match ? match[0] : null;
      })
      .filter(Boolean);

    return [...new Set(years)];
  };

  if (loading) {
    return (
      <AdminLayout activePage="curriculum" pageTitle="Curriculum Management">
        <div className="text-center py-5"><Spinner animation="border" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="curriculum" pageTitle="Curriculum Management">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Curriculum Management</h2>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      <Tabs activeKey={tabKey} onSelect={(key) => setTabKey(key || 'curricula')} className="mb-3">
        <Tab eventKey="curricula" title="Curricula">
          <Row className="g-3 mb-3">
            <Col lg={4}>
              <div className="border rounded p-3 bg-light h-100">
                <h5>Create Curriculum</h5>
                <Form onSubmit={createCurriculum}>
                  <Form.Group className="mb-2">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      value={curriculumForm.name}
                      onChange={(event) => setCurriculumForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={curriculumForm.description}
                      onChange={(event) => setCurriculumForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </Form.Group>
                  <Button type="submit" disabled={submitting}>Create</Button>
                </Form>
              </div>
            </Col>

            <Col lg={8}>
              <Card className="h-100">
                <Card.Body>
                  <h5 className="mb-1">CSV Import/Export</h5>
                  <div className="text-muted small mb-3">Export a curriculum CSV, preview a new CSV with row-level validation, then apply with transactional safety.</div>

                  <Row className="g-2 align-items-end">
                    <Col md={4}>
                      <Form.Label>Curriculum</Form.Label>
                      <Form.Select
                        value={selectedCurriculumIdForCsv}
                        onChange={(event) => setSelectedCurriculumIdForCsv(event.target.value)}
                      >
                        <option value="">Select curriculum</option>
                        {curricula.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}{item.isActive ? ' (Active)' : ''}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={5}>
                      <Form.Label>CSV File</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(event) => {
                          setCsvFile(event.target.files?.[0] || null);
                          setImportPreview(null);
                        }}
                      />
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                      <Button variant="outline-primary" onClick={exportCsv} disabled={exporting || importing || !selectedCurriculumIdForCsv}>
                        {exporting ? 'Exporting...' : 'Export CSV'}
                      </Button>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2 mt-3">
                    <Button variant="outline-secondary" onClick={previewCsvImport} disabled={importing || exporting || !csvFile || !selectedCurriculumIdForCsv}>
                      {importing ? 'Working...' : 'Preview Import'}
                    </Button>
                    <Button variant="success" onClick={applyCsvImport} disabled={importing || exporting || !csvFile || !selectedCurriculumIdForCsv}>
                      {importing ? 'Applying...' : 'Apply Import'}
                    </Button>
                  </div>

                  {importPreview && (
                    <div className="mt-3 border rounded p-3 bg-light">
                      <div className="fw-semibold mb-1">Import Summary</div>
                      <div className="small text-muted mb-2">
                        Total rows: {importPreview.summary?.totalRows || 0} · Dry run: {String(Boolean(importPreview.dryRun))}
                      </div>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        {Object.entries(importPreview.summary?.byType || {}).map(([type, count]) => (
                          <Badge key={type} bg="secondary">{type}: {count}</Badge>
                        ))}
                      </div>
                      {importPreview.hasErrors ? (
                        <>
                          <div className="text-danger small fw-semibold mb-2">Row-level errors must be resolved before successful apply.</div>
                          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                            <Table size="sm" bordered>
                              <thead>
                                <tr>
                                  <th>Row</th>
                                  <th>Type</th>
                                  <th>Error</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(importPreview.rowErrors || []).slice(0, 30).map((row, idx) => (
                                  <tr key={`${row.rowNumber}-${idx}`}>
                                    <td>{row.rowNumber}</td>
                                    <td>{row.rowType || '-'}</td>
                                    <td>{row.message}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="text-success small">No validation errors detected.</div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

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
                  <td>{item.isActive ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-primary" className="me-2" onClick={() => navigate(`/admin/curriculum/${item.id}`)}>
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
                  <td colSpan={4} className="text-center text-muted py-4">No curricula found.</td>
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
                      onChange={(event) => setCourseForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      value={courseForm.name}
                      onChange={(event) => setCourseForm((prev) => ({ ...prev, name: event.target.value }))}
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
                      onChange={(event) => setCourseForm((prev) => ({ ...prev, units: event.target.value }))}
                      required
                    />
                  </Form.Group>
                  <Button type="submit" disabled={submitting}>Create</Button>
                </Form>
              </div>
            </Col>

            <Col lg={8}>
              <Card className="mb-3">
                <Card.Body>
                  <div className="fw-semibold mb-2">Course List Controls</div>
                  <div className="d-flex flex-column flex-md-row gap-2">
                    <Form.Control
                      placeholder="Search courses"
                      value={coursesQuery.search}
                      onChange={(event) => setCoursesQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
                    />
                    <Form.Select value={courseUnitsFilter} onChange={(event) => setCourseUnitsFilter(event.target.value)} style={{ maxWidth: 160 }}>
                      <option value="all">All Units</option>
                      <option value="1">1 Unit</option>
                      <option value="2">2 Units</option>
                      <option value="3">3 Units</option>
                      <option value="4">4 Units</option>
                      <option value="5">5 Units</option>
                    </Form.Select>
                    <Form.Select value={courseCodePrefixFilter} onChange={(event) => setCourseCodePrefixFilter(event.target.value)} style={{ maxWidth: 180 }}>
                      <option value="all">All Prefixes</option>
                      <option value="CPE">CPE</option>
                      <option value="MATH">MATH</option>
                      <option value="ENG">ENG</option>
                      <option value="GEN">GEN</option>
                    </Form.Select>
                  </div>
                </Card.Body>
              </Card>

              <Row className="g-2 mb-3">
                {Object.keys(courseUnitSummary).length > 0 ? Object.entries(courseUnitSummary).map(([units, count]) => (
                  <Col key={units} md={3}>
                    <Card className="h-100">
                      <Card.Body className="py-2">
                        <div className="small text-muted">{units} Unit</div>
                        <div className="fw-semibold">{count} course(s)</div>
                      </Card.Body>
                    </Card>
                  </Col>
                )) : (
                  <Col><div className="text-muted small">No courses match current filters.</div></Col>
                )}
              </Row>

              <div className="d-flex flex-column flex-md-row gap-2 mb-3">
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
                    <th>Curriculum Year</th>
                    <th>Units</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.code}</td>
                      <td>{course.name}</td>
                      <td>
                        <div>
                          {getCourseCurriculumYears(course).length > 0
                            ? getCourseCurriculumYears(course).join(', ')
                            : '-'}
                        </div>
                        {course.isElective && (
                          <div className="small text-muted">Elective</div>
                        )}
                      </td>
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
                  {filteredCourses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">No courses found.</td>
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
                      onChange={(event) => setEquivalencyForm((prev) => ({ ...prev, courseId: event.target.value }))}
                      required
                    >
                      <option value="">Select course</option>
                      {courseOptions.map((course) => (
                        <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Equivalent Course</Form.Label>
                    <Form.Select
                      value={equivalencyForm.equivalentCourseId}
                      onChange={(event) => setEquivalencyForm((prev) => ({ ...prev, equivalentCourseId: event.target.value }))}
                      required
                    >
                      <option value="">Select equivalent course</option>
                      {courseOptions.map((course) => (
                        <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={equivalencyForm.notes}
                      onChange={(event) => setEquivalencyForm((prev) => ({ ...prev, notes: event.target.value }))}
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
                        <Button size="sm" variant="outline-danger" onClick={() => deleteEquivalency(item.id)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                  {equivalencies.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">No equivalencies found.</td>
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
                  onChange={(event) => setEditingCourse((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  value={editingCourse.name}
                  onChange={(event) => setEditingCourse((prev) => ({ ...prev, name: event.target.value }))}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Units</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={9}
                  value={editingCourse.units}
                  onChange={(event) => setEditingCourse((prev) => ({ ...prev, units: event.target.value }))}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCourseEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEditedCourse} disabled={submitting}>Save</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Confirm"
        onCancel={() => setConfirmDialog(d => ({ ...d, show: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </AdminLayout>
  );
};

export default CurriculumManagement;