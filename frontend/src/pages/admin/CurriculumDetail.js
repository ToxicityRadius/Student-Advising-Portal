import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  ListGroup,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs,
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import CoursePickerModal from '../../components/admin/CoursePickerModal';
import ConfirmModal from '../../components/ConfirmModal';
import AdviserLayout from '../../components/adviser/AdviserLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHelpers';

const YEARS = [1, 2, 3, 4];
const SEMESTERS = [
  { value: 1, label: 'Semester 1' },
  { value: 2, label: 'Semester 2' },
  { value: 3, label: 'Summer' },
];

const emptyTrackForm = { name: '', description: '' };

const CurriculumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState({ variant: '', message: '' });
  const [tabKey, setTabKey] = useState('structure');

  const [curriculum, setCurriculum] = useState(null);
  const [courses, setCourses] = useState([]);
  const [curriculumCourses, setCurriculumCourses] = useState([]);
  const [prerequisites, setPrerequisites] = useState([]);
  const [corequisites, setCorequisites] = useState([]);
  const [tracks, setTracks] = useState([]);

  const [pickerState, setPickerState] = useState({
    show: false,
    mode: '',
    title: '',
    yearLevel: null,
    semester: null,
    trackId: null,
    target: '',
  });

  const [selectedPrereq, setSelectedPrereq] = useState({ course: null, prerequisite: null });
  const [selectedCoreq, setSelectedCoreq] = useState({ course: null, corequisite: null });
  const [addStructureAsElective, setAddStructureAsElective] = useState(false);
  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [trackCourseSlotById, setTrackCourseSlotById] = useState({});
  const [dirtyTrackSlotIds, setDirtyTrackSlotIds] = useState([]);

  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [structureAddSlot, setStructureAddSlot] = useState({ yearLevel: '1', semester: '1' });
  const semesterLabel = (s) => (s === 3 ? 'Summer' : `Semester ${s}`);

  const sortedStructure = useMemo(() => {
    return [...curriculumCourses].sort(
      (a, b) =>
        a.yearLevel - b.yearLevel ||
        a.semester - b.semester ||
        (a.Course?.code || '').localeCompare(b.Course?.code || ''),
    );
  }, [curriculumCourses]);

  const showFeedback = (variant, message) => setAlert({ variant, message });
  const clearFeedback = () => setAlert({ variant: '', message: '' });

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const [curriculumRes, coursesRes, ccRes] = await Promise.all([
        api.get(`/curriculums/${id}`, { params: { compact: true } }),
        api.get('/courses', {
          params: { page: 1, pageSize: 200, sortBy: 'code', sortOrder: 'asc' },
        }),
        api.get(`/curriculums/${id}/courses`, {
          params: { page: 1, pageSize: 200, sortBy: 'yearLevel', sortOrder: 'asc' },
        }),
      ]);

      setCurriculum(curriculumRes.data?.data || null);
      setCourses(coursesRes.data?.items || coursesRes.data?.data || []);
      setCurriculumCourses(ccRes.data?.items || ccRes.data?.data || []);
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to load curriculum detail data.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPrerequisites = useCallback(async () => {
    const response = await api.get(`/curriculums/${id}/prerequisites`, {
      params: { page: 1, pageSize: 200, sortBy: 'id', sortOrder: 'desc' },
    });
    setPrerequisites(response.data?.items || response.data?.data || []);
  }, [id]);

  const loadCorequisites = useCallback(async () => {
    const response = await api.get(`/curriculums/${id}/corequisites`, {
      params: { page: 1, pageSize: 200, sortBy: 'id', sortOrder: 'desc' },
    });
    setCorequisites(response.data?.items || response.data?.data || []);
  }, [id]);

  const loadTracks = useCallback(async () => {
    const response = await api.get(`/curriculums/${id}/elective-tracks`, {
      params: { page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' },
    });
    const nextTracks = response.data?.items || response.data?.data || [];
    setTracks(nextTracks);
    setTrackCourseSlotById(
      nextTracks.reduce((acc, track) => {
        (track.ElectiveTrackCourses || []).forEach((entry) => {
          acc[entry.id] = {
            yearLevel: entry.yearLevel ? String(entry.yearLevel) : '',
            semester: entry.semester ? String(entry.semester) : '',
          };
        });
        return acc;
      }, {}),
    );
    setDirtyTrackSlotIds([]);
  }, [id]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    const loadTabData = async () => {
      try {
        if (tabKey === 'prerequisites' && prerequisites.length === 0) {
          await loadPrerequisites();
        }
        if (tabKey === 'corequisites' && corequisites.length === 0) {
          await loadCorequisites();
        }
        if (tabKey === 'tracks' && tracks.length === 0) {
          await loadTracks();
        }
      } catch (error) {
        showFeedback('danger', getErrorMessage(error, 'Failed to load tab data.'));
      }
    };

    loadTabData();
  }, [
    tabKey,
    prerequisites.length,
    corequisites.length,
    tracks.length,
    loadPrerequisites,
    loadCorequisites,
    loadTracks,
  ]);

  const openPicker = (nextState) => {
    setPickerState({
      show: true,
      mode: '',
      title: 'Select Course',
      yearLevel: null,
      semester: null,
      trackId: null,
      target: '',
      ...nextState,
    });
  };

  const closePicker = () => {
    setPickerState({
      show: false,
      mode: '',
      title: '',
      yearLevel: null,
      semester: null,
      trackId: null,
      target: '',
    });
  };

  const handlePickerSelect = async (course) => {
    try {
      if (pickerState.mode === 'structure') {
        setBusy(true);
        await api.post(`/curriculums/${id}/courses`, {
          courseId: course.id,
          yearLevel: pickerState.yearLevel,
          semester: pickerState.semester,
          isElective: addStructureAsElective,
        });
        setAddStructureAsElective(false);
        await loadBaseData();
      } else if (pickerState.mode === 'prereq') {
        if (pickerState.target === 'course') {
          setSelectedPrereq((prev) => ({ ...prev, course }));
        } else {
          setSelectedPrereq((prev) => ({ ...prev, prerequisite: course }));
        }
      } else if (pickerState.mode === 'coreq') {
        if (pickerState.target === 'course') {
          setSelectedCoreq((prev) => ({ ...prev, course }));
        } else {
          setSelectedCoreq((prev) => ({ ...prev, corequisite: course }));
        }
      } else if (pickerState.mode === 'track') {
        setBusy(true);
        await api.post(`/elective-tracks/${pickerState.trackId}/courses`, {
          courseId: course.id,
        });
        await loadTracks();
        showFeedback('success', 'Course assigned to elective track.');
      }
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Unable to process selected course.'));
    } finally {
      setBusy(false);
      closePicker();
    }
  };

  const removeFromStructure = async (ccId) => {
    setConfirmDialog({
      show: true,
      title: 'Remove Course',
      message: 'Remove this course from curriculum structure?',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, show: false }));
        setBusy(true);
        clearFeedback();
        try {
          await api.delete(`/curriculums/${id}/courses/${ccId}`);
          await loadBaseData();
          showFeedback('success', 'Course removed from structure.');
        } catch (error) {
          showFeedback('danger', getErrorMessage(error, 'Failed to remove curriculum course.'));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const addPrerequisite = async () => {
    if (!selectedPrereq.course || !selectedPrereq.prerequisite) {
      showFeedback('danger', 'Select both a course and a prerequisite course.');
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await api.post(`/curriculums/${id}/prerequisites`, {
        courseId: selectedPrereq.course.id,
        prerequisiteCourseId: selectedPrereq.prerequisite.id,
      });
      setSelectedPrereq({ course: null, prerequisite: null });
      await loadPrerequisites();
      showFeedback('success', 'Prerequisite added.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to add prerequisite.'));
    } finally {
      setBusy(false);
    }
  };

  const removePrerequisite = async (prereqId) => {
    setConfirmDialog({
      show: true,
      title: 'Remove Prerequisite',
      message: 'Remove this prerequisite?',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, show: false }));
        setBusy(true);
        clearFeedback();
        try {
          await api.delete(`/curriculums/${id}/prerequisites/${prereqId}`);
          await loadPrerequisites();
          showFeedback('success', 'Prerequisite removed.');
        } catch (error) {
          showFeedback('danger', getErrorMessage(error, 'Failed to remove prerequisite.'));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const addCorequisite = async () => {
    if (!selectedCoreq.course || !selectedCoreq.corequisite) {
      showFeedback('danger', 'Select both a course and a co-requisite course.');
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await api.post(`/curriculums/${id}/corequisites`, {
        courseId: selectedCoreq.course.id,
        coRequisiteCourseId: selectedCoreq.corequisite.id,
      });
      setSelectedCoreq({ course: null, corequisite: null });
      await loadCorequisites();
      showFeedback('success', 'Co-requisite added.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to add co-requisite.'));
    } finally {
      setBusy(false);
    }
  };

  const removeCorequisite = async (coreqId) => {
    setConfirmDialog({
      show: true,
      title: 'Remove Co-requisite',
      message: 'Remove this co-requisite?',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, show: false }));
        setBusy(true);
        clearFeedback();
        try {
          await api.delete(`/curriculums/${id}/corequisites/${coreqId}`);
          await loadCorequisites();
          showFeedback('success', 'Co-requisite removed.');
        } catch (error) {
          showFeedback('danger', getErrorMessage(error, 'Failed to remove co-requisite.'));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const createTrack = async (e) => {
    e.preventDefault();
    setBusy(true);
    clearFeedback();

    try {
      await api.post(`/curriculums/${id}/elective-tracks`, trackForm);
      setTrackForm(emptyTrackForm);
      await loadTracks();
      showFeedback('success', 'Elective track created.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to create elective track.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteTrack = async (trackId) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Elective Track',
      message: 'Delete this elective track?',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, show: false }));
        setBusy(true);
        clearFeedback();
        try {
          await api.delete(`/elective-tracks/${trackId}`);
          await loadTracks();
          showFeedback('success', 'Elective track deleted.');
        } catch (error) {
          showFeedback('danger', getErrorMessage(error, 'Failed to delete elective track.'));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const removeTrackCourse = async (trackId, etcId) => {
    setConfirmDialog({
      show: true,
      title: 'Remove Track Course',
      message: 'Remove this course from the elective track?',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, show: false }));
        setBusy(true);
        clearFeedback();
        try {
          await api.delete(`/elective-tracks/${trackId}/courses/${etcId}`);
          await loadTracks();
          showFeedback('success', 'Course removed from elective track.');
        } catch (error) {
          showFeedback('danger', getErrorMessage(error, 'Failed to remove course from track.'));
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const pickerExcludedCourseIds = useMemo(() => {
    if (pickerState.mode === 'prereq') {
      if (pickerState.target === 'course') {
        return selectedPrereq.prerequisite ? [selectedPrereq.prerequisite.id] : [];
      }

      return selectedPrereq.course ? [selectedPrereq.course.id] : [];
    }

    if (pickerState.mode === 'coreq') {
      if (pickerState.target === 'course') {
        return selectedCoreq.corequisite ? [selectedCoreq.corequisite.id] : [];
      }

      return selectedCoreq.course ? [selectedCoreq.course.id] : [];
    }

    return [];
  }, [
    pickerState.mode,
    pickerState.target,
    selectedPrereq.course,
    selectedPrereq.prerequisite,
    selectedCoreq.course,
    selectedCoreq.corequisite,
  ]);

  const saveAllTrackCourseSlots = async () => {
    if (dirtyTrackSlotIds.length === 0) {
      return;
    }

    const trackIdByEntryId = tracks.reduce((acc, track) => {
      (track.ElectiveTrackCourses || []).forEach((entry) => {
        acc[entry.id] = track.id;
      });
      return acc;
    }, {});

    const updates = dirtyTrackSlotIds.map((entryId) => {
      const slot = trackCourseSlotById[entryId] || { yearLevel: '', semester: '' };
      return {
        entryId,
        trackId: trackIdByEntryId[entryId],
        yearLevel: slot.yearLevel,
        semester: slot.semester,
      };
    });

    const invalidUpdate = updates.find(
      (item) => !item.trackId || !item.yearLevel || !item.semester,
    );
    if (invalidUpdate) {
      showFeedback(
        'danger',
        'Set both year and semester for all edited elective subjects before saving.',
      );
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await Promise.all(
        updates.map((item) =>
          api.put(`/elective-tracks/${item.trackId}/courses/${item.entryId}`, {
            yearLevel: item.yearLevel,
            semester: item.semester,
          }),
        ),
      );
      await loadTracks();
      showFeedback(
        'success',
        `Saved ${updates.length} elective subject placement${updates.length !== 1 ? 's' : ''}.`,
      );
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to save elective subject placements.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AdviserLayout activePage="curriculum" pageTitle="Curriculum Detail">
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      </AdviserLayout>
    );
  }

  return (
    <AdviserLayout activePage="curriculum" pageTitle="Curriculum Detail">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">{curriculum?.name || 'Curriculum Detail'}</h2>
          <div className="text-muted">{curriculum?.description || 'No description provided.'}</div>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate('/admin/curriculum')}>
          Back
        </Button>
      </div>

      {alert.message && <Alert variant={alert.variant}>{alert.message}</Alert>}

      <Tabs activeKey={tabKey} onSelect={(key) => setTabKey(key || 'structure')} className="mb-3">
        <Tab eventKey="structure" title="Structure">
          {/* ── Add Course ─────────────────────────────────────────────── */}
          {isAdmin && (
            <Card className="mb-3">
              <Card.Body>
                <h6 className="mb-2">Add Course to Structure</h6>
                <Row className="g-2 align-items-end">
                  <Col xs={6} md={3}>
                    <Form.Label className="small mb-1">Year Level</Form.Label>
                    <Form.Select
                      size="sm"
                      value={structureAddSlot.yearLevel}
                      onChange={(e) =>
                        setStructureAddSlot((prev) => ({ ...prev, yearLevel: e.target.value }))
                      }
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col xs={6} md={3}>
                    <Form.Label className="small mb-1">Semester</Form.Label>
                    <Form.Select
                      size="sm"
                      value={structureAddSlot.semester}
                      onChange={(e) =>
                        setStructureAddSlot((prev) => ({ ...prev, semester: e.target.value }))
                      }
                    >
                      {SEMESTERS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col xs={12} md={4} className="d-flex align-items-end gap-2">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() =>
                        openPicker({
                          mode: 'structure',
                          title: `Add Course — Year ${structureAddSlot.yearLevel} ${semesterLabel(Number(structureAddSlot.semester))}`,
                          yearLevel: Number(structureAddSlot.yearLevel),
                          semester: Number(structureAddSlot.semester),
                        })
                      }
                    >
                      Pick Course
                    </Button>
                    <Form.Check
                      type="checkbox"
                      label="Mark as Elective"
                      className="small"
                      checked={addStructureAsElective}
                      onChange={(e) => setAddStructureAsElective(e.target.checked)}
                    />
                  </Col>
                  {busy && (
                    <Col xs="auto">
                      <Spinner size="sm" animation="border" />
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* ── Course list ─────────────────────────────────────────────── */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted small">
              {sortedStructure.length} course{sortedStructure.length !== 1 ? 's' : ''} in curriculum
            </span>
          </div>

          <ListGroup variant="flush" className="border rounded">
            {sortedStructure.length === 0 && (
              <ListGroup.Item className="text-center text-muted py-4">
                No courses in curriculum structure yet.
              </ListGroup.Item>
            )}
            {sortedStructure.map((entry, idx) => {
              const isFirstOnPage = idx === 0;
              const prevEntry = sortedStructure[idx - 1];
              const isNewGroup =
                isFirstOnPage ||
                prevEntry?.yearLevel !== entry.yearLevel ||
                prevEntry?.semester !== entry.semester;

              return (
                <React.Fragment key={entry.id}>
                  {isNewGroup && (
                    <ListGroup.Item
                      className="bg-light py-1 px-3"
                      style={{ borderBottom: '1px solid #dee2e6' }}
                    >
                      <span className="fw-semibold small text-secondary">
                        Year {entry.yearLevel} — {semesterLabel(entry.semester)}
                      </span>
                    </ListGroup.Item>
                  )}
                  <ListGroup.Item className="py-2 px-3">
                    <Row className="g-2 align-items-center">
                      <Col xs={12} md={9}>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span className="fw-semibold" style={{ minWidth: 90 }}>
                            {entry.Course?.code}
                          </span>
                          <span className="text-muted small">{entry.Course?.name}</span>
                          <Badge bg="secondary">{entry.Course?.units}u</Badge>
                          {entry.isElective && (
                            <Badge bg="warning" text="dark">
                              Elective
                            </Badge>
                          )}
                        </div>
                      </Col>
                      {isAdmin && (
                        <Col xs={12} md={3} className="text-md-end">
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => removeFromStructure(entry.id)}
                          >
                            Remove
                          </Button>
                        </Col>
                      )}
                    </Row>
                  </ListGroup.Item>
                </React.Fragment>
              );
            })}
          </ListGroup>
        </Tab>

        <Tab eventKey="prerequisites" title="Prerequisites">
          {isAdmin && (
            <Card className="mb-3">
              <Card.Body>
                <h5 className="mb-3">Add Prerequisite</h5>
                <Row className="g-2 align-items-end">
                  <Col md={4}>
                    <Form.Label>Course</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        readOnly
                        value={
                          selectedPrereq.course
                            ? `${selectedPrereq.course.code} - ${selectedPrereq.course.name}`
                            : ''
                        }
                        placeholder="Select course"
                      />
                      <Button
                        variant="outline-primary"
                        onClick={() =>
                          openPicker({
                            mode: 'prereq',
                            target: 'course',
                            title: 'Select Dependent Course',
                          })
                        }
                      >
                        Pick
                      </Button>
                    </div>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Prerequisite Course</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        readOnly
                        value={
                          selectedPrereq.prerequisite
                            ? `${selectedPrereq.prerequisite.code} - ${selectedPrereq.prerequisite.name}`
                            : ''
                        }
                        placeholder="Select prerequisite"
                      />
                      <Button
                        variant="outline-primary"
                        onClick={() =>
                          openPicker({
                            mode: 'prereq',
                            target: 'prerequisite',
                            title: 'Select Prerequisite Course',
                          })
                        }
                      >
                        Pick
                      </Button>
                    </div>
                  </Col>
                  <Col md={4}>
                    <Button onClick={addPrerequisite} disabled={busy}>
                      Add Prerequisite
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          <Table striped bordered hover responsive className="table-fixed-cols">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Course</th>
                <th style={{ width: '40%' }}>Prerequisite</th>
                {isAdmin && (
                  <th className="text-end" style={{ width: '20%' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {prerequisites.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.Course?.code} - {item.Course?.name}
                  </td>
                  <td>
                    {item.PrerequisiteCourse?.code} - {item.PrerequisiteCourse?.name}
                  </td>
                  {isAdmin && (
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => removePrerequisite(item.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {prerequisites.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 3 : 2} className="text-center text-muted py-4">
                    No prerequisite rules configured.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Tab>

        <Tab eventKey="corequisites" title="Co-Requisites">
          {isAdmin && (
            <Card className="mb-3">
              <Card.Body>
                <h5 className="mb-3">Add Co-Requisite</h5>
                <Row className="g-2 align-items-end">
                  <Col md={4}>
                    <Form.Label>Course</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        readOnly
                        value={
                          selectedCoreq.course
                            ? `${selectedCoreq.course.code} - ${selectedCoreq.course.name}`
                            : ''
                        }
                        placeholder="Select course"
                      />
                      <Button
                        variant="outline-primary"
                        onClick={() =>
                          openPicker({
                            mode: 'coreq',
                            target: 'course',
                            title: 'Select Primary Course',
                          })
                        }
                      >
                        Pick
                      </Button>
                    </div>
                  </Col>
                  <Col md={4}>
                    <Form.Label>Co-Requisite Course</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        readOnly
                        value={
                          selectedCoreq.corequisite
                            ? `${selectedCoreq.corequisite.code} - ${selectedCoreq.corequisite.name}`
                            : ''
                        }
                        placeholder="Select co-requisite"
                      />
                      <Button
                        variant="outline-primary"
                        onClick={() =>
                          openPicker({
                            mode: 'coreq',
                            target: 'corequisite',
                            title: 'Select Co-Requisite Course',
                          })
                        }
                      >
                        Pick
                      </Button>
                    </div>
                  </Col>
                  <Col md={4}>
                    <Button onClick={addCorequisite} disabled={busy}>
                      Add Co-Requisite
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          <Table striped bordered hover responsive className="table-fixed-cols">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Course</th>
                <th style={{ width: '40%' }}>Co-Requisite</th>
                {isAdmin && (
                  <th className="text-end" style={{ width: '20%' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {corequisites.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.Course?.code} - {item.Course?.name}
                  </td>
                  <td>
                    {item.CoRequisiteCourse?.code} - {item.CoRequisiteCourse?.name}
                  </td>
                  {isAdmin && (
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => removeCorequisite(item.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {corequisites.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 3 : 2} className="text-center text-muted py-4">
                    No co-requisite rules configured.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Tab>

        <Tab eventKey="tracks" title="Elective Tracks">
          {isAdmin && (
            <Card className="mb-3">
              <Card.Body>
                <h5>Create Elective Track</h5>
                <Form onSubmit={createTrack}>
                  <Row className="g-2 align-items-end">
                    <Col md={4}>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        value={trackForm.name}
                        onChange={(e) =>
                          setTrackForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        value={trackForm.description}
                        onChange={(e) =>
                          setTrackForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                      />
                    </Col>
                    <Col md={2}>
                      <Button type="submit" disabled={busy}>
                        Create
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          )}

          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted small">
              {tracks.length} elective track{tracks.length !== 1 ? 's' : ''}
            </span>
            {isAdmin && (
              <Button
                size="sm"
                variant="primary"
                onClick={saveAllTrackCourseSlots}
                disabled={busy || dirtyTrackSlotIds.length === 0}
              >
                {dirtyTrackSlotIds.length > 0
                  ? `Save All Slot Changes (${dirtyTrackSlotIds.length})`
                  : 'Save All Slot Changes'}
              </Button>
            )}
          </div>

          {tracks.length === 0 ? (
            <div className="text-muted">No elective tracks yet.</div>
          ) : (
            <ListGroup className="mb-3">
              {tracks.map((track) => {
                return (
                  <ListGroup.Item key={track.id} className="p-3">
                    <Row className="g-2 align-items-start mb-2">
                      <Col xs={12} md={9}>
                        <strong>{track.name}</strong>
                        <div className="text-muted small">
                          {track.description || 'No description'}
                        </div>
                      </Col>
                      {isAdmin && (
                        <Col xs={12} md={3} className="text-md-end">
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => deleteTrack(track.id)}
                          >
                            Delete
                          </Button>
                        </Col>
                      )}
                    </Row>

                    {isAdmin && (
                      <Row className="g-2 align-items-end mb-2">
                        <Col xs={12} md={3}>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() =>
                              openPicker({
                                mode: 'track',
                                trackId: track.id,
                                title: `Add Course to ${track.name}`,
                              })
                            }
                          >
                            Add Course
                          </Button>
                        </Col>
                      </Row>
                    )}

                    <div className="d-flex flex-column gap-2">
                      {(track.ElectiveTrackCourses || []).map((entry) => {
                        const entrySlot = trackCourseSlotById[entry.id] || {
                          yearLevel: entry.yearLevel ? String(entry.yearLevel) : '',
                          semester: entry.semester ? String(entry.semester) : '',
                        };

                        return (
                          <div key={entry.id} className="border rounded p-2 bg-light-subtle">
                            <div className="d-flex flex-column flex-lg-row justify-content-between gap-2 mb-2">
                              <div>
                                <div className="fw-semibold">
                                  {entry.Course?.code} - {entry.Course?.name || 'Unnamed Course'}
                                </div>
                                <div className="text-muted small">
                                  {entrySlot.yearLevel && entrySlot.semester
                                    ? `Placed at Year ${entrySlot.yearLevel}, ${SEMESTERS.find((item) => String(item.value) === String(entrySlot.semester))?.label || `Semester ${entrySlot.semester}`}`
                                    : 'Placement not set.'}
                                </div>
                              </div>
                              <Badge bg="info" text="dark" className="align-self-start">
                                {entry.Course?.units || 0} units
                              </Badge>
                            </div>

                            {isAdmin && (
                              <Row className="g-2 align-items-end">
                                <Col xs={12} sm={4} md={3}>
                                  <Form.Select
                                    size="sm"
                                    value={entrySlot.yearLevel}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setTrackCourseSlotById((prev) => ({
                                        ...prev,
                                        [entry.id]: { ...entrySlot, yearLevel: value },
                                      }));
                                      setDirtyTrackSlotIds((prev) =>
                                        prev.includes(entry.id) ? prev : [...prev, entry.id],
                                      );
                                    }}
                                  >
                                    <option value="">Select year</option>
                                    {YEARS.map((year) => (
                                      <option key={year} value={year}>
                                        Year {year}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Col>
                                <Col xs={12} sm={4} md={3}>
                                  <Form.Select
                                    size="sm"
                                    value={entrySlot.semester}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setTrackCourseSlotById((prev) => ({
                                        ...prev,
                                        [entry.id]: { ...entrySlot, semester: value },
                                      }));
                                      setDirtyTrackSlotIds((prev) =>
                                        prev.includes(entry.id) ? prev : [...prev, entry.id],
                                      );
                                    }}
                                  >
                                    <option value="">Select semester</option>
                                    {SEMESTERS.map((sem) => (
                                      <option key={sem.value} value={sem.value}>
                                        {sem.label}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Col>
                                <Col xs={12} sm={4} md={6}>
                                  <div className="d-flex gap-2 justify-content-sm-end">
                                    <Button
                                      size="sm"
                                      variant="outline-danger"
                                      onClick={() => removeTrackCourse(track.id, entry.id)}
                                      disabled={busy}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </Col>
                              </Row>
                            )}
                          </div>
                        );
                      })}
                      {(track.ElectiveTrackCourses || []).length === 0 && (
                        <span className="text-muted small">No courses assigned.</span>
                      )}
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Tab>
      </Tabs>

      <CoursePickerModal
        show={pickerState.show}
        onHide={closePicker}
        courses={courses}
        onSelect={handlePickerSelect}
        title={pickerState.title || 'Select Course'}
        excludeCourseIds={pickerExcludedCourseIds}
      />

      <ConfirmModal
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Remove"
        onCancel={() => setConfirmDialog((d) => ({ ...d, show: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </AdviserLayout>
  );
};

export default CurriculumDetail;
