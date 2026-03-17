import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';

const sexOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const studentTypeOptions = ['regular', 'irregular', 'transferee', 'ladderized'];

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
    curriculumId: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    preferred_name: '',
    program: '',
    student_type: '',
    contact_number: '',
    alternate_email: '',
    sex: '',
    citizenship: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_number: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !sar) {
      return;
    }

    const profile = sar.Student || {};

    setForm({
      studentName: sar.studentName || '',
      studentNumber: sar.studentNumber || '',
      yearLevel: String(sar.yearLevel || '1'),
      curriculumId: sar.Curriculum?.id ? String(sar.Curriculum.id) : '',
      first_name: profile.first_name || '',
      middle_name: profile.middle_name || '',
      last_name: profile.last_name || '',
      suffix: profile.suffix || '',
      preferred_name: profile.preferred_name || '',
      program: profile.program || '',
      student_type: profile.student_type || '',
      contact_number: profile.contact_number || '',
      alternate_email: profile.alternate_email || '',
      sex: profile.sex || '',
      citizenship: profile.citizenship || '',
      address: profile.address || '',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_relationship: profile.emergency_contact_relationship || '',
      emergency_contact_number: profile.emergency_contact_number || ''
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
      const payload = {
        studentName,
        studentNumber,
        yearLevel: Number(form.yearLevel),
        curriculumId: Number(form.curriculumId)
      };

      if (sar?.isLinkedToAccount) {
        payload.studentProfile = {
          first_name: form.first_name,
          middle_name: form.middle_name,
          last_name: form.last_name,
          suffix: form.suffix,
          preferred_name: form.preferred_name,
          program: form.program,
          student_type: form.student_type,
          contact_number: form.contact_number,
          alternate_email: form.alternate_email,
          sex: form.sex,
          citizenship: form.citizenship,
          address: form.address,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_relationship: form.emergency_contact_relationship,
          emergency_contact_number: form.emergency_contact_number
        };
      }

      await onSubmit(payload);
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

          {sar?.isLinkedToAccount ? (
            <>
              <hr />
              <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Profile & Identity</h6>

              <Form.Group className="mb-3">
                <Form.Label>First Name</Form.Label>
                <Form.Control name="first_name" value={form.first_name} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Middle Name</Form.Label>
                <Form.Control name="middle_name" value={form.middle_name} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control name="last_name" value={form.last_name} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Suffix</Form.Label>
                <Form.Control name="suffix" value={form.suffix} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Preferred Name</Form.Label>
                <Form.Control name="preferred_name" value={form.preferred_name} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Program</Form.Label>
                <Form.Control name="program" value={form.program} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Student Type</Form.Label>
                <Form.Select name="student_type" value={form.student_type} onChange={handleChange}>
                  <option value="">Select Type</option>
                  {studentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Contact Number</Form.Label>
                <Form.Control name="contact_number" value={form.contact_number} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Alternate Email</Form.Label>
                <Form.Control type="email" name="alternate_email" value={form.alternate_email} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Sex</Form.Label>
                <Form.Select name="sex" value={form.sex} onChange={handleChange}>
                  <option value="">Select</option>
                  {sexOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Citizenship</Form.Label>
                <Form.Control name="citizenship" value={form.citizenship} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control as="textarea" rows={2} name="address" value={form.address} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Emergency Contact Name</Form.Label>
                <Form.Control name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Emergency Contact Relationship</Form.Label>
                <Form.Control name="emergency_contact_relationship" value={form.emergency_contact_relationship} onChange={handleChange} />
              </Form.Group>

              <Form.Group>
                <Form.Label>Emergency Contact Number</Form.Label>
                <Form.Control name="emergency_contact_number" value={form.emergency_contact_number} onChange={handleChange} />
              </Form.Group>
            </>
          ) : (
            <Alert variant="secondary" className="mt-3 mb-0">
              This SAR is not linked to a student account yet, so profile details cannot be edited.
            </Alert>
          )}

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
