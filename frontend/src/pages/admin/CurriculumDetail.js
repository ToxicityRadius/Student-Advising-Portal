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
  Tabs
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import CoursePickerModal from '../../components/admin/CoursePickerModal';
import api from '../../utils/api';

const YEARS = [1, 2, 3, 4];
const SEMESTERS = [
  { value: 1, label: 'Semester 1' },
  { value: 2, label: 'Semester 2' },
  { value: 3, label: 'Summer' }
];

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || fallback;
};

const emptyTrackForm = { name: '', description: '' };

const CurriculumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
    target: ''
  });

  const [selectedPrereq, setSelectedPrereq] = useState({ course: null, prerequisite: null });
  const [selectedCoreq, setSelectedCoreq] = useState({ course: null, corequisite: null });
  const [addStructureAsElective, setAddStructureAsElective] = useState(false);
  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [trackSlotById, setTrackSlotById] = useState({});

  const [structureAddSlot, setStructureAddSlot] = useState({ yearLevel: '1', semester: '1' });

  const structureBySlot = useMemo(() => {
    const map = {};
    for (const entry of curriculumCourses) {
      const key = `${entry.yearLevel}-${entry.semester}`;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(entry);
    }
    return map;
  }, [curriculumCourses]);

  const semesterLabel = (s) => s === 3 ? 'Summer' : `Semester ${s}`;

  const sortedStructure = useMemo(() => {
    return [...curriculumCourses].sort((a, b) =>
      a.yearLevel - b.yearLevel ||
      a.semester - b.semester ||
      (a.Course?.code || '').localeCompare(b.Course?.code || '')
    );
  }, [curriculumCourses]);

  const showFeedback = (variant, message) => setAlert({ variant, message });
  const clearFeedback = () => setAlert({ variant: '', message: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const [curriculumRes, coursesRes, ccRes, prereqRes, coreqRes, tracksRes] = await Promise.all([
        api.get(`/curriculums/${id}`),
        api.get('/courses', { params: { page: 1, pageSize: 200, sortBy: 'code', sortOrder: 'asc' } }),
        api.get(`/curriculums/${id}/courses`, { params: { page: 1, pageSize: 200, sortBy: 'yearLevel', sortOrder: 'asc' } }),
        api.get(`/curriculums/${id}/prerequisites`, { params: { page: 1, pageSize: 200, sortBy: 'id', sortOrder: 'desc' } }),
        api.get(`/curriculums/${id}/corequisites`, { params: { page: 1, pageSize: 200, sortBy: 'id', sortOrder: 'desc' } }),
        api.get(`/curriculums/${id}/elective-tracks`, { params: { page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' } })
      ]);

      setCurriculum(curriculumRes.data?.data || null);
      setCourses(coursesRes.data?.items || coursesRes.data?.data || []);
      setCurriculumCourses(ccRes.data?.items || ccRes.data?.data || []);
      setPrerequisites(prereqRes.data?.items || prereqRes.data?.data || []);
      setCorequisites(coreqRes.data?.items || coreqRes.data?.data || []);
      setTracks(tracksRes.data?.items || tracksRes.data?.data || []);
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to load curriculum detail data.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openPicker = (nextState) => {
    setPickerState({
      show: true,
      mode: '',
      title: 'Select Course',
      yearLevel: null,
      semester: null,
      trackId: null,
      target: '',
      ...nextState
    });
  };

  const closePicker = () => {
    setPickerState({ show: false, mode: '', title: '', yearLevel: null, semester: null, trackId: null, target: '' });
  };

  const handlePickerSelect = async (course) => {
    try {
      if (pickerState.mode === 'structure') {
        setBusy(true);
        await api.post(`/curriculums/${id}/courses`, {
          courseId: course.id,
          yearLevel: pickerState.yearLevel,
          semester: pickerState.semester,
          isElective: addStructureAsElective
        });
        setAddStructureAsElective(false);
        await loadData();
      } else if (pickerState.mode === 'coreq') {
        if (pickerState.target === 'course') {
          setSelectedCoreq((prev) => ({ ...prev, course }));
        } else {
          setSelectedCoreq((prev) => ({ ...prev, corequisite: course }));
        }
      } else if (pickerState.mode === 'track') {
        const slot = trackSlotById[pickerState.trackId] || { yearLevel: '', semester: '' };
        setBusy(true);
        await api.post(`/elective-tracks/${pickerState.trackId}/courses`, {
          courseId: course.id,
          yearLevel: slot.yearLevel ? Number(slot.yearLevel) : null,
          semester: slot.semester ? Number(slot.semester) : null
        });
        await loadData();
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
    if (!window.confirm('Remove this course from curriculum structure?')) {
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await api.delete(`/curriculums/${id}/courses/${ccId}`);
      await loadData();
      showFeedback('success', 'Course removed from structure.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to remove curriculum course.'));
    } finally {
      setBusy(false);
    }
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
        prerequisiteCourseId: selectedPrereq.prerequisite.id
      });
      setSelectedPrereq({ course: null, prerequisite: null });
      await loadData();
      showFeedback('success', 'Prerequisite added.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to add prerequisite.'));
    } finally {
      setBusy(false);
    }
  };

  const removePrerequisite = async (prereqId) => {
    if (!window.confirm('Remove this prerequisite?')) {
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await api.delete(`/curriculums/${id}/prerequisites/${prereqId}`);
      await loadData();
      showFeedback('success', 'Prerequisite removed.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to remove prerequisite.'));
    } finally {
      setBusy(false);
    }
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
        coRequisiteCourseId: selectedCoreq.corequisite.id
      });
      setSelectedCoreq({ course: null, corequisite: null });
      await loadData();
      showFeedback('success', 'Co-requisite added.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to add co-requisite.'));
    } finally {
      setBusy(false);
    }
  };

  const removeCorequisite = async (coreqId) => {
    if (!window.confirm('Remove this co-requisite?')) {
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await api.delete(`/curriculums/${id}/corequisites/${coreqId}`);
      await loadData();
      showFeedback('success', 'Co-requisite removed.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to remove co-requisite.'));
    } finally {
      setBusy(false);
    }
  };

  const createTrack = async (e) => {
    e.preventDefault();
    setBusy(true);
    clearFeedback();

    try {
      await api.post(`/curriculums/${id}/elective-tracks`, trackForm);
      setTrackForm(emptyTrackForm);
      await loadData();
      showFeedback('success', 'Elective track created.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to create elective track.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteTrack = async (trackId) => {
    if (!window.confirm('Delete this elective track?')) {
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await api.delete(`/elective-tracks/${trackId}`);
      await loadData();
      showFeedback('success', 'Elective track deleted.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to delete elective track.'));
    } finally {
      setBusy(false);
    }
  };

  const removeTrackCourse = async (trackId, etcId) => {
    if (!window.confirm('Remove this course from the elective track?')) {
      return;
    }

    setBusy(true);
    clearFeedback();

    try {
      await api.delete(`/elective-tracks/${trackId}/courses/${etcId}`);
      await loadData();
      showFeedback('success', 'Course removed from elective track.');
    } catch (error) {
      showFeedback('danger', getErrorMessage(error, 'Failed to remove course from track.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-4">
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
          <Card className="mb-3">
            <Card.Body>
              <h6 className="mb-2">Add Course to Structure</h6>
              <Row className="g-2 align-items-end">
                <Col xs={6} md={3}>
                  <Form.Label className="small mb-1">Year Level</Form.Label>
                  <Form.Select
                    size="sm"
                    value={structureAddSlot.yearLevel}
                    onChange={(e) => setStructureAddSlot((prev) => ({ ...prev, yearLevel: e.target.value }))}
                  >
                    {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </Form.Select>
                </Col>
                <Col xs={6} md={3}>
                  <Form.Label className="small mb-1">Semester</Form.Label>
                  <Form.Select
                    size="sm"
                    value={structureAddSlot.semester}
                    onChange={(e) => setStructureAddSlot((prev) => ({ ...prev, semester: e.target.value }))}
                  >
                    {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Form.Select>
                </Col>
                <Col xs={12} md={4} className="d-flex align-items-end gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => openPicker({
                      mode: 'structure',
                      title: `Add Course — Year ${structureAddSlot.yearLevel} ${semesterLabel(Number(structureAddSlot.semester))}`,
                      yearLevel: Number(structureAddSlot.yearLevel),
                      semester: Number(structureAddSlot.semester)
                    })}
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
                {busy && <Col xs="auto"><Spinner size="sm" animation="border" /></Col>}
              </Row>
            </Card.Body>
          </Card>

          {/* ── Course list ─────────────────────────────────────────────── */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted small">{sortedStructure.length} course{sortedStructure.length !== 1 ? 's' : ''} in curriculum</span>
          </div>

          <ListGroup variant="flush" className="border rounded">
            {sortedStructure.length === 0 && (
              <ListGroup.Item className="text-center text-muted py-4">No courses in curriculum structure yet.</ListGroup.Item>
            )}
            {sortedStructure.map((entry, idx) => {
              const isFirstOnPage = idx === 0;
              const prevEntry = sortedStructure[idx - 1];
              const isNewGroup = isFirstOnPage ||
                prevEntry?.yearLevel !== entry.yearLevel ||
                prevEntry?.semester !== entry.semester;

              return (
                <React.Fragment key={entry.id}>
                  {isNewGroup && (
                    <ListGroup.Item className="bg-light py-1 px-3" style={{ borderBottom: '1px solid #dee2e6' }}>
                      <span className="fw-semibold small text-secondary">
                        Year {entry.yearLevel} — {semesterLabel(entry.semester)}
                      </span>
                    </ListGroup.Item>
                  )}
                  <ListGroup.Item className="py-2 px-3">
                    <Row className="g-2 align-items-center">
                      <Col xs={12} md={9}>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span className="fw-semibold" style={{ minWidth: 90 }}>{entry.Course?.code}</span>
                          <span className="text-muted small">{entry.Course?.name}</span>
                          <Badge bg="secondary">{entry.Course?.units}u</Badge>
                          {entry.isElective && <Badge bg="warning" text="dark">Elective</Badge>}
                        </div>
                      </Col>
                      <Col xs={12} md={3} className="text-md-end">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeFromStructure(entry.id)}
                        >
                          Remove
                        </Button>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                </React.Fragment>
              );
            })}
          </ListGroup>
        </Tab>

        <Tab eventKey="prerequisites" title="Prerequisites">
          <Card className="mb-3">
            <Card.Body>
              <h5 className="mb-3">Add Prerequisite</h5>
              <Row className="g-2 align-items-end">
                <Col md={4}>
                  <Form.Label>Course</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control readOnly value={selectedPrereq.course ? `${selectedPrereq.course.code} - ${selectedPrereq.course.name}` : ''} placeholder="Select course" />
                    <Button
                      variant="outline-primary"
                      onClick={() => openPicker({ mode: 'prereq', target: 'course', title: 'Select Dependent Course' })}
                    >
                      Pick
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  <Form.Label>Prerequisite Course</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control readOnly value={selectedPrereq.prerequisite ? `${selectedPrereq.prerequisite.code} - ${selectedPrereq.prerequisite.name}` : ''} placeholder="Select prerequisite" />
                    <Button
                      variant="outline-primary"
                      onClick={() => openPicker({ mode: 'prereq', target: 'prerequisite', title: 'Select Prerequisite Course' })}
                    >
                      Pick
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  <Button onClick={addPrerequisite} disabled={busy}>Add Prerequisite</Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Course</th>
                <th>Prerequisite</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prerequisites.map((item) => (
                <tr key={item.id}>
                  <td>{item.Course?.code} - {item.Course?.name}</td>
                  <td>{item.PrerequisiteCourse?.code} - {item.PrerequisiteCourse?.name}</td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-danger" onClick={() => removePrerequisite(item.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {prerequisites.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">No prerequisite rules configured.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Tab>

        <Tab eventKey="corequisites" title="Co-Requisites">
          <Card className="mb-3">
            <Card.Body>
              <h5 className="mb-3">Add Co-Requisite</h5>
              <Row className="g-2 align-items-end">
                <Col md={4}>
                  <Form.Label>Course</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control readOnly value={selectedCoreq.course ? `${selectedCoreq.course.code} - ${selectedCoreq.course.name}` : ''} placeholder="Select course" />
                    <Button
                      variant="outline-primary"
                      onClick={() => openPicker({ mode: 'coreq', target: 'course', title: 'Select Primary Course' })}
                    >
                      Pick
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  <Form.Label>Co-Requisite Course</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control readOnly value={selectedCoreq.corequisite ? `${selectedCoreq.corequisite.code} - ${selectedCoreq.corequisite.name}` : ''} placeholder="Select co-requisite" />
                    <Button
                      variant="outline-primary"
                      onClick={() => openPicker({ mode: 'coreq', target: 'corequisite', title: 'Select Co-Requisite Course' })}
                    >
                      Pick
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  <Button onClick={addCorequisite} disabled={busy}>Add Co-Requisite</Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Course</th>
                <th>Co-Requisite</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {corequisites.map((item) => (
                <tr key={item.id}>
                  <td>{item.Course?.code} - {item.Course?.name}</td>
                  <td>{item.CoRequisiteCourse?.code} - {item.CoRequisiteCourse?.name}</td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-danger" onClick={() => removeCorequisite(item.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {corequisites.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">No co-requisite rules configured.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Tab>

        <Tab eventKey="tracks" title="Elective Tracks">
          <Card className="mb-3">
            <Card.Body>
              <h5>Create Elective Track</h5>
              <Form onSubmit={createTrack}>
                <Row className="g-2 align-items-end">
                  <Col md={4}>
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      value={trackForm.name}
                      onChange={(e) => setTrackForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      value={trackForm.description}
                      onChange={(e) => setTrackForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </Col>
                  <Col md={2}>
                    <Button type="submit" disabled={busy}>Create</Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted small">{tracks.length} elective track{tracks.length !== 1 ? 's' : ''}</span>
          </div>

          {tracks.length === 0 ? (
            <div className="text-muted">No elective tracks yet.</div>
          ) : (
            <ListGroup className="mb-3">
              {tracks.map((track) => {
                const slot = trackSlotById[track.id] || { yearLevel: '', semester: '' };
                return (
                  <ListGroup.Item key={track.id} className="p-3">
                    <Row className="g-2 align-items-start mb-2">
                      <Col xs={12} md={9}>
                        <strong>{track.name}</strong>
                        <div className="text-muted small">{track.description || 'No description'}</div>
                      </Col>
                      <Col xs={12} md={3} className="text-md-end">
                        <Button size="sm" variant="outline-danger" onClick={() => deleteTrack(track.id)}>
                          Delete
                        </Button>
                      </Col>
                    </Row>

                    <Row className="g-2 align-items-end mb-2">
                      <Col xs={12} sm={4} md={3}>
                        <Form.Select
                          size="sm"
                          value={slot.yearLevel}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTrackSlotById((prev) => ({ ...prev, [track.id]: { ...slot, yearLevel: value } }));
                          }}
                        >
                          <option value="">Year (optional)</option>
                          {YEARS.map((year) => (
                            <option key={year} value={year}>Year {year}</option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col xs={12} sm={5} md={3}>
                        <Form.Select
                          size="sm"
                          value={slot.semester}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTrackSlotById((prev) => ({ ...prev, [track.id]: { ...slot, semester: value } }));
                          }}
                        >
                          <option value="">Semester (optional)</option>
                          {SEMESTERS.map((sem) => (
                            <option key={sem.value} value={sem.value}>{sem.label}</option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col xs={12} sm={3} md={3}>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openPicker({ mode: 'track', trackId: track.id, title: `Add Course to ${track.name}` })}
                        >
                          Add Course
                        </Button>
                      </Col>
                    </Row>

                    <div className="d-flex flex-wrap gap-2">
                      {(track.ElectiveTrackCourses || []).map((entry) => (
                        <Badge
                          key={entry.id}
                          bg="info"
                          text="dark"
                          style={{ cursor: 'pointer' }}
                          title="Click to remove"
                          onClick={() => removeTrackCourse(track.id, entry.id)}
                        >
                          {entry.Course?.code} - {entry.Course?.name || 'Unnamed Course'}
                          {entry.yearLevel ? ` • Y${entry.yearLevel}` : ''}
                          {entry.semester ? ` • S${entry.semester}` : ''}
                        </Badge>
                      ))}
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
      />
    </div>
  );
};

export default CurriculumDetail;
