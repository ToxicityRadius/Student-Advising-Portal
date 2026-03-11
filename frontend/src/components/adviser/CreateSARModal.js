import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';

const initialFormState = {
  studentName: '',
  studentNumber: '',
  email: '',
  yearLevel: '1',
  curriculumId: ''
};

const CreateSARModal = ({
  show,
  onHide,
  onSubmit,
  curriculums = [],
  defaultCurriculumId,
  submitting = false
}) => {
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState('');

  const hasCurriculumOptions = curriculums.length > 0;

  const resolvedDefaultCurriculumId = useMemo(() => {
    if (defaultCurriculumId) {
      return String(defaultCurriculumId);
    }

    const activeCurriculum = curriculums.find((curriculum) => curriculum.isActive);
    return activeCurriculum ? String(activeCurriculum.id) : '';
  }, [curriculums, defaultCurriculumId]);

  useEffect(() => {
    if (!show) {
      return;
    }

    setForm({
      ...initialFormState,
      curriculumId: resolvedDefaultCurriculumId
    });
    setError('');
  }, [resolvedDefaultCurriculumId, show]);

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

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@tip.edu.ph')) {
      setError('Student email must end in @tip.edu.ph.');
      return;
    }

    if (!form.curriculumId) {
      setError('Please select a curriculum.');
      return;
    }

    try {
      await onSubmit({
        studentName: form.studentName.trim(),
        studentNumber: form.studentNumber.trim(),
        email: normalizedEmail,
        yearLevel: Number(form.yearLevel),
        curriculumId: Number(form.curriculumId)
      });
      handleClose();
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Failed to create the student academic record.');
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Student Academic Record</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {!hasCurriculumOptions && (
            <Alert variant="warning" className="mb-3">
              No curricula are available yet. Create or activate a curriculum before creating a record.
            </Alert>
          )}

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
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="student@tip.edu.ph"
              required
            />
            <Form.Text muted>Only T.I.P. student emails are allowed.</Form.Text>
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
              disabled={!hasCurriculumOptions}
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !hasCurriculumOptions}>
            {submitting ? 'Creating...' : 'Create Record'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateSARModal;