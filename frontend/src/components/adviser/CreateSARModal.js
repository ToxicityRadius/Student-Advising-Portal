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
  onLookupEmail,
  curriculums = [],
  defaultCurriculumId,
  submitting = false
}) => {
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState('');
  const [lookupState, setLookupState] = useState({
    loading: false,
    variant: '',
    message: '',
    autoFilledFields: [],
    hasExistingSar: false
  });

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
    setLookupState({
      loading: false,
      variant: '',
      message: '',
      autoFilledFields: [],
      hasExistingSar: false
    });
  }, [resolvedDefaultCurriculumId, show]);

  const handleClose = () => {
    setError('');
    onHide();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'email') {
      setLookupState((previous) => ({
        ...previous,
        variant: '',
        message: '',
        autoFilledFields: [],
        hasExistingSar: false
      }));
    }
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleLookup = async () => {
    if (!onLookupEmail) {
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    if (!normalizedEmail.endsWith('@tip.edu.ph')) {
      setLookupState({
        loading: false,
        variant: 'warning',
        message: 'Enter a valid T.I.P. email to search for a student profile.',
        autoFilledFields: [],
        hasExistingSar: false
      });
      return;
    }

    setLookupState((previous) => ({ ...previous, loading: true }));

    try {
      const result = await onLookupEmail(normalizedEmail);
      const autofill = result?.autofill || {};
      const autoFilledFields = Array.isArray(result?.autoFilledFields) ? result.autoFilledFields : [];

      setForm((previous) => ({
        ...previous,
        email: normalizedEmail,
        studentName: autofill.studentName ?? previous.studentName,
        studentNumber: autofill.studentNumber ?? previous.studentNumber,
        yearLevel: autofill.yearLevel ? String(autofill.yearLevel) : previous.yearLevel,
        curriculumId: autofill.curriculumId ? String(autofill.curriculumId) : previous.curriculumId
      }));

      const variant = result?.foundStudentAccount ? (result?.hasExistingSar ? 'warning' : 'success') : 'secondary';

      setLookupState({
        loading: false,
        variant,
        message: result?.message || 'Lookup complete.',
        autoFilledFields,
        hasExistingSar: Boolean(result?.hasExistingSar)
      });
    } catch (lookupError) {
      setLookupState({
        loading: false,
        variant: 'danger',
        message: lookupError?.response?.data?.message || 'Unable to fetch student profile by email.',
        autoFilledFields: [],
        hasExistingSar: false
      });
    }
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

          {lookupState.message && (
            <Alert variant={lookupState.variant || 'info'} className="mb-3">
              {lookupState.message}
              {lookupState.autoFilledFields.length > 0 && (
                <div className="small mt-2">
                  Auto-populated fields: {lookupState.autoFilledFields.join(', ')}
                </div>
              )}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleLookup}
                placeholder="student@tip.edu.ph"
                required
              />
              <Button
                type="button"
                variant="outline-primary"
                onClick={handleLookup}
                disabled={lookupState.loading || submitting}
              >
                {lookupState.loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            <Form.Text muted>Email is the primary lookup field for SAR autofill.</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Student Name</Form.Label>
            <Form.Control
              name="studentName"
              value={form.studentName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
            {lookupState.autoFilledFields.includes('studentName') && (
              <Form.Text className="text-success">Auto-filled from student profile (editable).</Form.Text>
            )}
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
            {lookupState.autoFilledFields.includes('studentNumber') && (
              <Form.Text className="text-success">Auto-filled from student profile (editable).</Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Year Level</Form.Label>
            <Form.Select name="yearLevel" value={form.yearLevel} onChange={handleChange} required>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </Form.Select>
            {lookupState.autoFilledFields.includes('yearLevel') && (
              <Form.Text className="text-success">Defaulted from student profile.</Form.Text>
            )}
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
            {lookupState.autoFilledFields.includes('curriculumId') && (
              <Form.Text className="text-success">Defaulted using student/active curriculum.</Form.Text>
            )}
            {!lookupState.loading && lookupState.variant === 'secondary' && !lookupState.hasExistingSar && (
              <Form.Text className="text-muted">No account match found — this record will be created as unlinked.</Form.Text>
            )}
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