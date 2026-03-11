import React, { useMemo, useState } from 'react';
import { Badge, Button, Form, InputGroup, ListGroup, Modal } from 'react-bootstrap';

const CoursePickerModal = ({
  show,
  onHide,
  courses = [],
  onSelect,
  title = 'Select Course',
  excludeCourseIds = []
}) => {
  const [query, setQuery] = useState('');

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = new Set(excludeCourseIds.map((id) => Number(id)));

    return courses
      .filter((course) => !excluded.has(Number(course.id)))
      .filter((course) => {
        if (!q) {
          return true;
        }
        return (
          String(course.code || '').toLowerCase().includes(q) ||
          String(course.name || '').toLowerCase().includes(q)
        );
      });
  }, [courses, excludeCourseIds, query]);

  const handleClose = () => {
    setQuery('');
    onHide();
  };

  const handleSelect = (course) => {
    onSelect(course);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <InputGroup className="mb-3">
          <InputGroup.Text>Search</InputGroup.Text>
          <Form.Control
            placeholder="Type course code or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <ListGroup style={{ maxHeight: 420, overflowY: 'auto' }}>
          {filteredCourses.map((course) => (
            <ListGroup.Item
              key={course.id}
              className="d-flex justify-content-between align-items-center"
              action
              onClick={() => handleSelect(course)}
            >
              <div>
                <strong>{course.code}</strong>
                <div className="text-muted small">{course.name}</div>
              </div>
              <Badge bg="dark">{course.units} units</Badge>
            </ListGroup.Item>
          ))}
          {filteredCourses.length === 0 && (
            <ListGroup.Item className="text-muted text-center py-4">
              No courses found.
            </ListGroup.Item>
          )}
        </ListGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CoursePickerModal;
