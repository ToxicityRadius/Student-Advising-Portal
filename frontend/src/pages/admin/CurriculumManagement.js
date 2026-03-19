import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Modal,
  Spinner,
  Tab,
  Tabs
} from 'react-bootstrap';
import ConfirmModal from '../../components/ConfirmModal';
import AdminLayout from '../../components/admin/AdminLayout';
import CurriculaTab from '../../components/admin/CurriculaTab';
import CoursesTab from '../../components/admin/CoursesTab';
import EquivalenciesTab from '../../components/admin/EquivalenciesTab';
import api from '../../utils/api';
import useDebouncedValue from '../../utils/useDebouncedValue';
import { getErrorMessage } from '../../utils/errorHelpers';

const initialCurriculumForm = { name: '', description: '' };
const initialCourseForm = { code: '', name: '', units: 3 };
const initialEquivalencyForm = { courseId: '', equivalentCourseId: '', notes: '' };

const CurriculumManagement = () => {

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
          <CurriculaTab
            curricula={curricula}
            curriculaQuery={curriculaQuery}
            setCurriculaQuery={setCurriculaQuery}
            curriculaMeta={curriculaMeta}
            curriculumForm={curriculumForm}
            setCurriculumForm={setCurriculumForm}
            createCurriculum={createCurriculum}
            activateCurriculum={activateCurriculum}
            activeCurriculumId={activeCurriculumId}
            submitting={submitting}
            selectedCurriculumIdForCsv={selectedCurriculumIdForCsv}
            setSelectedCurriculumIdForCsv={setSelectedCurriculumIdForCsv}
            csvFile={csvFile}
            setCsvFile={setCsvFile}
            importPreview={importPreview}
            setImportPreview={setImportPreview}
            importing={importing}
            exporting={exporting}
            previewCsvImport={previewCsvImport}
            applyCsvImport={applyCsvImport}
            exportCsv={exportCsv}
          />
        </Tab>

        <Tab eventKey="courses" title="Courses">
          <CoursesTab
            courses={courses}
            coursesQuery={coursesQuery}
            setCoursesQuery={setCoursesQuery}
            coursesMeta={coursesMeta}
            courseForm={courseForm}
            setCourseForm={setCourseForm}
            createCourse={createCourse}
            openEditCourse={openEditCourse}
            deleteCourse={deleteCourse}
            submitting={submitting}
            courseUnitsFilter={courseUnitsFilter}
            setCourseUnitsFilter={setCourseUnitsFilter}
            courseCodePrefixFilter={courseCodePrefixFilter}
            setCourseCodePrefixFilter={setCourseCodePrefixFilter}
          />
        </Tab>

        <Tab eventKey="equivalencies" title="Equivalencies">
          <EquivalenciesTab
            equivalencies={equivalencies}
            equivsQuery={equivsQuery}
            setEquivsQuery={setEquivsQuery}
            equivsMeta={equivsMeta}
            equivalencyForm={equivalencyForm}
            setEquivalencyForm={setEquivalencyForm}
            createEquivalency={createEquivalency}
            deleteEquivalency={deleteEquivalency}
            courseOptions={courseOptions}
            submitting={submitting}
          />
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