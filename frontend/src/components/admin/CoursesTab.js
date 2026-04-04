import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import PaginationControls from '../../components/PaginationControls';

const CoursesTab = ({
  courses,
  coursesQuery,
  setCoursesQuery,
  coursesMeta,
  courseForm,
  setCourseForm,
  createCourse,
  openEditCourse,
  deleteCourse,
  submitting,
  courseUnitsFilter,
  setCourseUnitsFilter,
  courseCodePrefixFilter,
  setCourseCodePrefixFilter,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const unitsMatch =
        courseUnitsFilter === 'all' || Number(course.units) === Number(courseUnitsFilter);
      const prefixMatch =
        courseCodePrefixFilter === 'all' ||
        String(course.code || '')
          .toUpperCase()
          .startsWith(courseCodePrefixFilter);
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

  const handleCreateSubmit = async (event) => {
    await createCourse(event);
    setShowCreateModal(false);
  };

  return (
    <>
      <Card className="mb-3">
        <Card.Body>
          <div className="fw-semibold mb-2">Course List Controls</div>
          <div className="d-flex flex-column flex-md-row gap-2">
            <Form.Control
              placeholder="Search courses"
              value={coursesQuery.search}
              onChange={(event) =>
                setCoursesQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))
              }
            />
            <Form.Select
              value={courseUnitsFilter}
              onChange={(event) => setCourseUnitsFilter(event.target.value)}
              style={{ maxWidth: 160 }}
            >
              <option value="all">All Units</option>
              <option value="1">1 Unit</option>
              <option value="2">2 Units</option>
              <option value="3">3 Units</option>
              <option value="4">4 Units</option>
              <option value="5">5 Units</option>
            </Form.Select>
            <Form.Select
              value={courseCodePrefixFilter}
              onChange={(event) => setCourseCodePrefixFilter(event.target.value)}
              style={{ maxWidth: 180 }}
            >
              <option value="all">All Prefixes</option>
              <option value="CPE">CPE</option>
              <option value="MATH">MATH</option>
              <option value="ENG">ENG</option>
              <option value="GEN">GEN</option>
            </Form.Select>
            <Button
              variant="primary"
              className="text-nowrap"
              onClick={() => setShowCreateModal(true)}
            >
              Create Course
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-2 mb-3">
        {Object.keys(courseUnitSummary).length > 0 ? (
          Object.entries(courseUnitSummary).map(([units, count]) => (
            <Col key={units} md={3}>
              <Card className="h-100">
                <Card.Body className="py-2">
                  <div className="small text-muted">{units} Unit</div>
                  <div className="fw-semibold">{count} course(s)</div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <div className="text-muted small">No courses match current filters.</div>
          </Col>
        )}
      </Row>

      <div className="d-flex flex-column flex-md-row gap-2 mb-3">
        <Form.Select
          value={coursesQuery.sortBy}
          onChange={(event) =>
            setCoursesQuery((prev) => ({ ...prev, page: 1, sortBy: event.target.value }))
          }
          style={{ maxWidth: 220 }}
        >
          <option value="code">Sort by Code</option>
          <option value="name">Sort by Name</option>
          <option value="units">Sort by Units</option>
          <option value="createdAt">Sort by Created Date</option>
        </Form.Select>
        <Form.Select
          value={coursesQuery.sortOrder}
          onChange={(event) =>
            setCoursesQuery((prev) => ({ ...prev, page: 1, sortOrder: event.target.value }))
          }
          style={{ maxWidth: 180 }}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </Form.Select>
      </div>

      <Table striped bordered hover responsive className="table-fixed-cols">
        <thead>
          <tr>
            <th style={{ width: '12%' }}>Code</th>
            <th style={{ width: '30%' }}>Name</th>
            <th style={{ width: '16%' }}>Curriculum Year</th>
            <th style={{ width: '8%' }}>Units</th>
            <th style={{ width: '9%' }}>Lec / Lab</th>
            <th className="text-end" style={{ width: '25%' }}>
              Actions
            </th>
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
                {course.isElective && <div className="small text-muted">Elective</div>}
              </td>
              <td>{course.units}</td>
              <td className="small">
                {course.lectureHours !== null || course.laboratoryHours !== null
                  ? `${course.lectureHours ?? '-'} / ${course.laboratoryHours ?? '-'}`
                  : '—'}
              </td>
              <td className="text-end">
                <Button
                  size="sm"
                  variant="outline-primary"
                  className="me-2"
                  onClick={() => openEditCourse(course)}
                >
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
              <td colSpan={6} className="text-center text-muted py-4">
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
        onPageSizeChange={(nextSize) =>
          setCoursesQuery((prev) => ({ ...prev, page: 1, pageSize: nextSize }))
        }
      />

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Course</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Code</Form.Label>
              <Form.Control
                value={courseForm.code}
                onChange={(event) =>
                  setCourseForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={courseForm.name}
                onChange={(event) =>
                  setCourseForm((prev) => ({ ...prev, name: event.target.value }))
                }
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
                onChange={(event) =>
                  setCourseForm((prev) => ({ ...prev, units: event.target.value }))
                }
                required
              />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Lecture Hours</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    placeholder="optional"
                    value={courseForm.lectureHours}
                    onChange={(event) =>
                      setCourseForm((prev) => ({ ...prev, lectureHours: event.target.value }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Lab Hours</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    placeholder="optional"
                    value={courseForm.laboratoryHours}
                    onChange={(event) =>
                      setCourseForm((prev) => ({ ...prev, laboratoryHours: event.target.value }))
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Max Students per Section</Form.Label>
              <Form.Control
                type="number"
                min={1}
                placeholder="optional (overrides global cap)"
                value={courseForm.maxStudentsPerSection}
                onChange={(event) =>
                  setCourseForm((prev) => ({ ...prev, maxStudentsPerSection: event.target.value }))
                }
              />
              <Form.Text className="text-muted">
                Leave blank to use the global section cap. Set to 30 for labs, 45 for lecture rooms,
                etc.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default CoursesTab;
