import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Image, Modal, Row } from 'react-bootstrap';
import { buildProfileImageUrl, getInitials } from '../../utils/profileImage';

const sexOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const studentTypeOptions = ['regular', 'irregular', 'transferee', 'ladderized'];

const getProgramOptionValue = (program) => String(program?.code || program?.name || '').trim();

const getProgramOptionLabel = (program) => {
  const code = String(program?.code || '').trim();
  const name = String(program?.name || '').trim();

  if (code && name && code !== name) {
    return `${code} - ${name}`;
  }

  return code || name;
};

const inferNameParts = (studentName = '') => {
  const tokens = studentName.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { first_name: '', middle_name: '', last_name: '', suffix: '' };
  }

  if (tokens.length === 1) {
    return { first_name: tokens[0], middle_name: '', last_name: '', suffix: '' };
  }

  return {
    first_name: tokens[0],
    middle_name: tokens.slice(1, -1).join(' '),
    last_name: tokens[tokens.length - 1],
    suffix: '',
  };
};

const buildStudentNameFromParts = (form) =>
  [form.first_name, form.middle_name, form.last_name, form.suffix]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

const EditSARModal = ({
  show,
  onHide,
  onSubmit,
  sar,
  curriculums = [],
  programs = [],
  canChangeProgram = false,
  submitting = false,
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
    emergency_contact_number: '',
    profile_picture: null,
    remove_profile_picture: false,
  });
  const [picturePreview, setPicturePreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !sar) {
      return;
    }

    const profile = sar.Student || {};
    const inferredName = inferNameParts(sar.studentName);

    setForm({
      studentName: sar.studentName || '',
      studentNumber: sar.studentNumber || '',
      yearLevel: String(sar.yearLevel || '1'),
      curriculumId: sar.Curriculum?.id ? String(sar.Curriculum.id) : '',
      first_name: profile.first_name || inferredName.first_name,
      middle_name: profile.middle_name || inferredName.middle_name,
      last_name: profile.last_name || inferredName.last_name,
      suffix: profile.suffix || inferredName.suffix,
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
      emergency_contact_number: profile.emergency_contact_number || '',
      profile_picture: null,
      remove_profile_picture: false,
    });
    setPicturePreview(buildProfileImageUrl(profile.profile_picture));
    setError('');
  }, [show, sar]);

  useEffect(() => {
    return () => {
      if (picturePreview && picturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(picturePreview);
      }
    };
  }, [picturePreview]);

  const handleClose = () => {
    setError('');
    onHide();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((previous) => ({
      ...previous,
      profile_picture: file,
      remove_profile_picture: false,
    }));

    if (picturePreview && picturePreview.startsWith('blob:')) {
      URL.revokeObjectURL(picturePreview);
    }

    setPicturePreview(
      file ? URL.createObjectURL(file) : buildProfileImageUrl(sar?.Student?.profile_picture),
    );
  };

  const handleRemoveProfilePicture = () => {
    if (picturePreview && picturePreview.startsWith('blob:')) {
      URL.revokeObjectURL(picturePreview);
    }

    setForm((previous) => ({
      ...previous,
      profile_picture: null,
      remove_profile_picture: true,
    }));
    setPicturePreview('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const studentName = sar?.isLinkedToAccount
      ? buildStudentNameFromParts(form)
      : form.studentName.trim();
    const studentNumber = form.studentNumber.trim();

    if (!studentName) {
      setError(
        sar?.isLinkedToAccount
          ? 'First name or last name is required.'
          : 'Student name is required.',
      );
      return;
    }

    if (!studentNumber) {
      setError('Student number is required.');
      return;
    }

    if (!/^\d{7}$/.test(studentNumber)) {
      setError('Student number must be exactly 7 digits (e.g. 1234567).');
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
        curriculumId: Number(form.curriculumId),
      };

      if (sar?.isLinkedToAccount) {
        payload.studentProfile = {
          first_name: form.first_name,
          middle_name: form.middle_name,
          last_name: form.last_name,
          suffix: form.suffix,
          preferred_name: form.preferred_name,
          student_type: form.student_type,
          contact_number: form.contact_number,
          alternate_email: form.alternate_email,
          sex: form.sex,
          citizenship: form.citizenship,
          address: form.address,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_relationship: form.emergency_contact_relationship,
          emergency_contact_number: form.emergency_contact_number,
        };

        if (canChangeProgram) {
          payload.studentProfile.program = form.program;
        }

        payload.profilePicture = form.profile_picture || null;
        payload.removeProfilePicture = form.remove_profile_picture;
      }

      await onSubmit(payload);
      handleClose();
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message || 'Failed to update the student academic record.',
      );
    }
  };

  const displayStudentName = sar?.isLinkedToAccount
    ? buildStudentNameFromParts(form) || form.studentName
    : form.studentName;
  const programOptions = programs
    .map((program) => ({
      value: getProgramOptionValue(program),
      label: getProgramOptionLabel(program),
    }))
    .filter((program) => program.value && program.label);
  const currentProgramIsListed = programOptions.some((program) => program.value === form.program);

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      scrollable
      size="xl"
      dialogClassName="edit-sar-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>Edit Student Academic Record</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="edit-sar-modal-body">
          {error && <Alert variant="danger">{error}</Alert>}

          <section className="edit-sar-section">
            <div className="edit-sar-section-header">
              <h6>Record Details</h6>
            </div>

            <Row className="g-3">
              {sar?.isLinkedToAccount ? (
                <>
                  <Col lg={6}>
                    <Form.Group>
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        name="first_name"
                        value={form.first_name}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col lg={6}>
                    <Form.Group>
                      <Form.Label>Middle Name</Form.Label>
                      <Form.Control
                        name="middle_name"
                        value={form.middle_name}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col lg={6}>
                    <Form.Group>
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        name="last_name"
                        value={form.last_name}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col lg={6}>
                    <Form.Group>
                      <Form.Label>Suffix</Form.Label>
                      <Form.Control name="suffix" value={form.suffix} onChange={handleChange} />
                    </Form.Group>
                  </Col>
                </>
              ) : (
                <Col lg={6}>
                  <Form.Group>
                    <Form.Label>Student Name</Form.Label>
                    <Form.Control
                      name="studentName"
                      value={form.studentName}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      required
                    />
                  </Form.Group>
                </Col>
              )}

              <Col lg={6}>
                <Form.Group>
                  <Form.Label>Student Number</Form.Label>
                  <Form.Control
                    name="studentNumber"
                    value={form.studentNumber}
                    onChange={handleChange}
                    placeholder="e.g. 1234567"
                    maxLength={7}
                    pattern="\d{7}"
                    title="Exactly 7 digits, no dashes or spaces"
                    required
                  />
                  <Form.Text muted>7 digits only - no dashes or spaces.</Form.Text>
                </Form.Group>
              </Col>

              <Col lg={6}>
                <Form.Group>
                  <Form.Label>Year Level</Form.Label>
                  <Form.Select
                    name="yearLevel"
                    value={form.yearLevel}
                    onChange={handleChange}
                    required
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col lg={6}>
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
                        {curriculum.name}
                        {curriculum.isActive ? ' (Active)' : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {sar?.isLinkedToAccount && (
                <>
                  <Col lg={6}>
                    <Form.Group controlId="edit-sar-program">
                      <Form.Label>Program</Form.Label>
                      <Form.Select
                        name="program"
                        value={form.program}
                        onChange={handleChange}
                        disabled={!canChangeProgram || programOptions.length === 0}
                      >
                        <option value="">Select program</option>
                        {form.program && !currentProgramIsListed && (
                          <option value={form.program}>{form.program}</option>
                        )}
                        {programOptions.map((program) => (
                          <option key={program.value} value={program.value}>
                            {program.label}
                          </option>
                        ))}
                      </Form.Select>
                      {canChangeProgram && programOptions.length === 0 && (
                        <Form.Text muted>No programs are available.</Form.Text>
                      )}
                    </Form.Group>
                  </Col>

                  <Col lg={6}>
                    <Form.Group>
                      <Form.Label>Student Type</Form.Label>
                      <Form.Select
                        name="student_type"
                        value={form.student_type}
                        onChange={handleChange}
                      >
                        <option value="">Select Type</option>
                        {studentTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </>
              )}
            </Row>
          </section>

          {sar?.isLinkedToAccount ? (
            <>
              <div className="edit-sar-section-divider" />
              <h6 className="edit-sar-section-title">Profile & Contact</h6>

              <div className="edit-sar-profile-grid">
                <Form.Group className="mb-0 edit-sar-photo-field">
                  <Form.Label>Profile Picture</Form.Label>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    {picturePreview ? (
                      <Image
                        src={picturePreview}
                        roundedCircle
                        width={56}
                        height={56}
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                        style={{
                          width: 56,
                          height: 56,
                          minWidth: 56,
                          minHeight: 56,
                          flexShrink: 0,
                          fontWeight: 700,
                        }}
                      >
                        {getInitials(displayStudentName)}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="sm"
                      onClick={handleRemoveProfilePicture}
                      disabled={!picturePreview && !sar?.Student?.profile_picture}
                    >
                      Remove Picture
                    </Button>
                  </div>
                  <Form.Control
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleProfilePictureChange}
                  />
                  <Form.Text className="text-muted">
                    JPEG, PNG, or WEBP. Max 2 MB. Recommended up to 2000x2000.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Preferred Name</Form.Label>
                  <Form.Control
                    name="preferred_name"
                    value={form.preferred_name}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Contact Number</Form.Label>
                  <Form.Control
                    name="contact_number"
                    value={form.contact_number}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Alternate Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="alternate_email"
                    value={form.alternate_email}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Sex</Form.Label>
                  <Form.Select name="sex" value={form.sex} onChange={handleChange}>
                    <option value="">Select</option>
                    {sexOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Citizenship</Form.Label>
                  <Form.Control
                    name="citizenship"
                    value={form.citizenship}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Emergency Contact Name</Form.Label>
                  <Form.Control
                    name="emergency_contact_name"
                    value={form.emergency_contact_name}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Emergency Contact Relationship</Form.Label>
                  <Form.Control
                    name="emergency_contact_relationship"
                    value={form.emergency_contact_relationship}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Emergency Contact Number</Form.Label>
                  <Form.Control
                    name="emergency_contact_number"
                    value={form.emergency_contact_number}
                    onChange={handleChange}
                  />
                </Form.Group>
              </div>
            </>
          ) : (
            <Alert variant="secondary" className="mt-3 mb-0">
              This SAR is not linked to a student account yet, so profile details cannot be edited.
            </Alert>
          )}

          {sar?.isLinkedToAccount && (
            <p className="edit-sar-note">
              <strong>Note:</strong> Changing the name details or student number will automatically
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
