import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';

const EditSARModal = ({
  show,
  onHide,
  onSubmit,
  sar,
  curriculums = [],
  submitting = false
}) => {
  const [form, setForm] = useState({
    studentName: '',
    studentNumber: '',
    yearLevel: '1',
    curriculumId: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !sar) {
      return;
    }

    setForm({
      studentName: sar.studentName || '',
      studentNumber: sar.studentNumber || '',
      yearLevel: String(sar.yearLevel || '1'),
      curriculumId: sar.Curriculum?.id ? String(sar.Curriculum.id) : ''
    });
    setError('');
  }, [show, sar]);

  const handleClose = () => {
    setError('');
    onHide();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const studentName = form.studentName.trim();
    const studentNumber = form.studentNumber.trim();

    if (!studentName) {
      setError('Student name is required.');
      return;
    }

    if (!studentNumber) {
      setError('Student number is required.');
      return;
    }

    if (!form.curriculumId) {
      setError('Please select a curriculum.');
      return;
    }

    try {
      await onSubmit({
        studentName,
        studentNumber,
        yearLevel: Number(form.yearLevel),
        curriculumId: Number(form.curriculumId)
      });
      handleClose();
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Failed to update the student academic record.');
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Student Academic Record</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Student Name</Form.Label>
            <Form.Control
              name="studentName"
              value={form.studentName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Student Number</Form.Label>
            <Form.Control
              name="studentNumber"
              value={form.studentNumber}
              onChange={handleChange}
              placeholder="e.g. 1234567"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Year Level</Form.Label>
            <Form.Select name="yearLevel" value={form.yearLevel} onChange={handleChange} required>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Curriculum</Form.Label>
            <Form.Select
              name="curriculumId"
              value={form.curriculumId}
              onChange={handleChange}
              disabled={curriculums.length === 0}
              required
            >
              <option value="">Select curriculum</option>
              {curriculums.map((curriculum) => (
                <option key={curriculum.id} value={curriculum.id}>
                  {curriculum.name}{curriculum.isActive ? ' (Active)' : ''}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {sar?.isLinkedToAccount && (
            <p className="text-muted small mt-3 mb-0">
              <strong>Note:</strong> Changing the student name or student number will automatically
              update the linked student profile.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditSARModal;
