import React, { useMemo, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import Select from 'react-select';

const CoursePickerModal = ({
  show,
  onHide,
  courses = [],
  onSelect,
  title = 'Select Course',
  excludeCourseIds = []
}) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const options = useMemo(() => {
    const excluded = new Set(excludeCourseIds.map((id) => Number(id)));

    return courses
      .filter((course) => !excluded.has(Number(course.id)))
      .map((course) => ({
        value: Number(course.id),
        label: `${course.code} - ${course.name}`,
        units: course.units,
        course
      }));
  }, [courses, excludeCourseIds]);

  const handleClose = () => {
    setSelectedOption(null);
    onHide();
  };

  const handleSelect = () => {
    if (!selectedOption?.course) {
      return;
    }

    onSelect(selectedOption.course);
    handleClose();
  };

  const optionLabel = ({ label, units }) => (
    <div className="d-flex justify-content-between align-items-center">
      <span>{label}</span>
      <span className="text-muted small">{units} units</span>
    </div>
  );

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Select
          value={selectedOption}
          onChange={(option) => setSelectedOption(option)}
          options={options}
          placeholder="Search by course code or name"
          isSearchable
          isClearable
          formatOptionLabel={optionLabel}
          noOptionsMessage={() => 'No courses found.'}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 })
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleSelect} disabled={!selectedOption}>
          Select Course
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CoursePickerModal;
