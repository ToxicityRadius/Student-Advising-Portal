import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
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

  const showFeedback = (variant, message) => setAlert({ variant, message });
  const clearFeedback = () => setAlert({ variant: '', message: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setAlert({ variant: '', message: '' });
    try {
      const [curriculumRes, coursesRes, ccRes, prereqRes, coreqRes, tracksRes] = await Promise.all([
        api.get(`/curriculums/${id}`),
        api.get('/courses'),
        api.get(`/curriculums/${id}/courses`),
        api.get(`/curriculums/${id}/prerequisites`),
        api.get(`/curriculums/${id}/corequisites`),
        api.get(`/curriculums/${id}/elective-tracks`)
      ]);

      setCurriculum(curriculumRes.data?.data || null);
      setCourses(coursesRes.data?.data || []);
      setCurriculumCourses(ccRes.data?.data || []);
      setPrerequisites(prereqRes.data?.data || []);
      setCorequisites(coreqRes.data?.data || []);
      setTracks(tracksRes.data?.data || []);
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
        showFeedback('success', 'Course added to curriculum structure.');
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
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="text-muted">Rows are year levels and columns are semester slots.</div>
            {busy && <Spinner size="sm" animation="border" />}
          </div>

          <Table bordered responsive>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Year Level</th>
                {SEMESTERS.map((sem) => (
                  <th key={sem.value}>{sem.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {YEARS.map((year) => (
                <tr key={year}>
                  <td className="fw-semibold">Year {year}</td>
                  {SEMESTERS.map((sem) => {
                    const slotKey = `${year}-${sem.value}`;
                    const slotCourses = structureBySlot[slotKey] || [];

                    return (
                      <td key={slotKey}>
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          {slotCourses.map((entry) => (
                            <Badge
                              pill
                              bg={entry.isElective ? 'warning' : 'primary'}
                              text={entry.isElective ? 'dark' : 'light'}
                              key={entry.id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => removeFromStructure(entry.id)}
                              title="Click to remove"
                            >
                              {entry.Course?.code} ({entry.Course?.units}u)
                            </Badge>
                          ))}
                          {slotCourses.length === 0 && <span className="text-muted small">No courses</span>}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openPicker({
                              mode: 'structure',
                              title: `Add Course: Year ${year} ${sem.label}`,
                              yearLevel: year,
                              semester: sem.value
                            })}
                          >
                            Add Course
                          </Button>
                          <Form.Check
                            type="checkbox"
                            label="Elective"
                            checked={addStructureAsElective}
                            onChange={(e) => setAddStructureAsElective(e.target.checked)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
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

          <Row className="g-3">
            {tracks.map((track) => {
              const slot = trackSlotById[track.id] || { yearLevel: '', semester: '' };

              return (
                <Col key={track.id} lg={6}>
                  <Card>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="mb-1">{track.name}</h5>
                          <div className="text-muted small">{track.description || 'No description'}</div>
                        </div>
                        <Button size="sm" variant="outline-danger" onClick={() => deleteTrack(track.id)}>
                          Delete
                        </Button>
                      </div>

                      <div className="d-flex gap-2 mb-2">
                        <Form.Select
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
                        <Form.Select
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
                        <Button
                          variant="outline-primary"
                          onClick={() => openPicker({ mode: 'track', trackId: track.id, title: `Add Course to ${track.name}` })}
                        >
                          Add Course
                        </Button>
                      </div>

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
                            {entry.Course?.code}
                            {entry.yearLevel ? ` Y${entry.yearLevel}` : ''}
                            {entry.semester ? ` S${entry.semester}` : ''}
                          </Badge>
                        ))}
                        {(track.ElectiveTrackCourses || []).length === 0 && (
                          <span className="text-muted small">No courses assigned.</span>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {tracks.length === 0 && (
            <div className="text-muted">No elective tracks yet.</div>
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
