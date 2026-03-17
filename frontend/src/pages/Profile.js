import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Alert, Image, ProgressBar, Row, Col } from 'react-bootstrap';
import api from '../utils/api';
import { fetchCurriculumsCached } from '../utils/curriculumsCache';
import { useAuth } from '../context/AuthContext';
import { buildProfileImageUrl, getInitials } from '../utils/profileImage';

const programOptions = ['BSCpE', 'BSCS', 'BSIT', 'BSCE', 'BSEE', 'BSME'];
const sexOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const studentTypeOptions = ['regular', 'irregular', 'transferee', 'ladderized'];
const semesterLabels = { 1: '1st Semester', 2: '2nd Semester', 3: 'Summer' };

const EMPTY_FORM = {
  // Identity
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  preferred_name: '',
  // Academic (student)
  student_id: '',
  program: '',
  curriculum_id: '',
  student_type: '',
  year_level: '',
  // Contact
  contact_number: '',
  alternate_email: '',
  // Demographics
  sex: '',
  citizenship: '',
  // Location
  address: '',
  // Emergency contact
  emergency_contact_name: '',
  emergency_contact_relationship: '',
  emergency_contact_number: '',
  // Photo
  profile_picture: null
};

const Profile = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState('');
  const [completionScore, setCompletionScore] = useState(0);
  const [curricula, setCurricula] = useState([]);
  const [removeProfilePicture, setRemoveProfilePicture] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isProfileLockedForCurrentTerm, setIsProfileLockedForCurrentTerm] = useState(false);
  const [currentProfileTermLabel, setCurrentProfileTermLabel] = useState('current term');
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, currentTermRes] = await Promise.all([
          api.get(`/users/${user.id}`),
          api.get('/terms/current').catch(() => ({ data: { data: null } }))
        ]);

        let curriculaData = { curriculums: [] };
        try {
          if (user?.role === 'student') {
            const optionsResponse = await api.get('/users/curriculum-options');
            curriculaData = { items: optionsResponse?.data?.items || [] };
          } else {
            curriculaData = await fetchCurriculumsCached({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' });
          }
        } catch {
          curriculaData = { curriculums: [] };
        }

        const profile = profileRes.data.user || {};
        const currentTerm = currentTermRes?.data?.data || null;
        const currentTermKey = currentTerm ? `${currentTerm.schoolYear}-S${currentTerm.semester}` : 'NO_ACTIVE_TERM';
        const lastSubmittedTermKey = profile.lastSubmittedProfileTermKey || profile.profile_last_submitted_term_key || null;
        const lockFromServer = Boolean(profile.isProfileLockedForCurrentTerm);
        const lockFromFallback = Boolean(user?.role === 'student' && lastSubmittedTermKey && lastSubmittedTermKey === currentTermKey);

        if (currentTerm) {
          setCurrentProfileTermLabel(`${currentTerm.schoolYear} — ${semesterLabels[currentTerm.semester] || `Semester ${currentTerm.semester}`}`);
        } else {
          setCurrentProfileTermLabel('current term');
        }

        setIsProfileLockedForCurrentTerm(lockFromServer || lockFromFallback);
        setCurricula(curriculaData?.items || curriculaData?.data || curriculaData?.curriculums || []);

        setFormData((prev) => ({
          ...prev,
          first_name: profile.first_name || '',
          middle_name: profile.middle_name || '',
          last_name: profile.last_name || '',
          suffix: profile.suffix || '',
          preferred_name: profile.preferred_name || '',
          student_id: profile.studentId || '',
          program: profile.program || '',
          curriculum_id: profile.curriculum_id != null ? String(profile.curriculum_id) : '',
          student_type: profile.student_type || '',
          year_level: profile.current_year_level != null ? String(profile.current_year_level) : '',
          contact_number: profile.contact_number || '',
          alternate_email: profile.alternate_email || '',
          sex: profile.sex || '',
          citizenship: profile.citizenship || '',
          address: profile.address || '',
          emergency_contact_name: profile.emergency_contact_name || '',
          emergency_contact_relationship: profile.emergency_contact_relationship || '',
          emergency_contact_number: profile.emergency_contact_number || ''
        }));

        setCompletionScore(profile.profileCompletionScore ?? 0);

        setPreview(buildProfileImageUrl(profile.profile_picture));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchData();
  }, [user?.id, user?.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const updated = { ...prev }; delete updated[name]; return updated; });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, profile_picture: file }));
    if (file) {
      setPreview(URL.createObjectURL(file));
      setRemoveProfilePicture(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, profile_picture: null }));
    setPreview('');
    setRemoveProfilePicture(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasPictureChange = Boolean(formData.profile_picture) || removeProfilePicture;

    if (user?.role === 'student' && isProfileLockedForCurrentTerm && !hasPictureChange) {
      setError(`Profile details are locked for ${currentProfileTermLabel}. You can still update your profile picture.`);
      return;
    }

    setSaving(true);
    setError('');
    setFieldErrors({});
    setSuccess('');

    try {
      const payload = new FormData();

      if (!(user?.role === 'student' && isProfileLockedForCurrentTerm)) {
        payload.append('first_name', formData.first_name);
        payload.append('middle_name', formData.middle_name);
        payload.append('last_name', formData.last_name);
        payload.append('suffix', formData.suffix);
        payload.append('preferred_name', formData.preferred_name);
        payload.append('program', formData.program);
        payload.append('year_level', formData.year_level);
        payload.append('curriculum_id', formData.curriculum_id);
        payload.append('student_type', formData.student_type);
        payload.append('contact_number', formData.contact_number);
        payload.append('alternate_email', formData.alternate_email);
        payload.append('sex', formData.sex);
        payload.append('citizenship', formData.citizenship);
        payload.append('address', formData.address);
        payload.append('emergency_contact_name', formData.emergency_contact_name);
        payload.append('emergency_contact_relationship', formData.emergency_contact_relationship);
        payload.append('emergency_contact_number', formData.emergency_contact_number);
      }

      if (formData.profile_picture) {
        payload.append('profile_picture', formData.profile_picture);
      }
      payload.append('remove_profile_picture', removeProfilePicture ? 'true' : 'false');

      const response = await api.put(`/users/${user.id}/profile`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setCompletionScore(response.data.user?.profileCompletionScore ?? completionScore);
      setPreview(buildProfileImageUrl(response.data.user?.profile_picture));
      setRemoveProfilePicture(false);

      const freshToken = response.data.token;
      if (freshToken) {
        localStorage.setItem('token', freshToken);
        await login(freshToken);
      }

      setSuccess('Profile updated successfully');
      window.location.reload();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setFieldErrors(data.errors);
        setError(data.message || 'Validation failed. Please correct the highlighted fields.');
      } else {
        setError(data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await api.put('/auth/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        await login(response.data.token);
      }

      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password changed successfully.');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const scoreVariant = completionScore >= 80 ? 'success' : completionScore >= 50 ? 'warning' : 'danger';

  if (loading) return <Container className="py-4">Loading profile...</Container>;

  return (
    <Container className="py-4" style={{ maxWidth: '800px' }}>
      {/* Profile Completion Score */}
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="fw-semibold">Profile Completion</span>
            <span className="fw-semibold">{completionScore}%</span>
          </div>
          <ProgressBar variant={scoreVariant} now={completionScore} style={{ height: '10px' }} />
          {completionScore < 100 && (
            <small className="text-muted mt-1 d-block">Complete all required fields (marked with *) to reach 100%.</small>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-4">My Profile</h3>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <p className="text-muted small mb-3">Fields marked with <span className="text-danger">*</span> are required for profile completion.</p>
          {user?.role === 'student' && isProfileLockedForCurrentTerm && (
            <Alert variant="warning" className="mb-3">
              Profile details are locked for {currentProfileTermLabel}. Only profile picture updates are available until the next term.
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <fieldset disabled={saving || (user?.role === 'student' && isProfileLockedForCurrentTerm)}>

            {/* ── Identity ── */}
            <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Identity</h6>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.first_name}
                    required
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.first_name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Middle Name</Form.Label>
                  <Form.Control name="middle_name" value={formData.middle_name} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.last_name}
                    required
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.last_name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Suffix</Form.Label>
                  <Form.Control
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleChange}
                    placeholder="e.g. Jr, III"
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Preferred Name</Form.Label>
                  <Form.Control
                    name="preferred_name"
                    value={formData.preferred_name}
                    onChange={handleChange}
                    placeholder="What you prefer to be called"
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />

            {/* ── Academic Identity (Students only) ── */}
            {user.role === 'student' && (
              <>
                <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Academic Identity</h6>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Student Number</Form.Label>
                      <Form.Control name="student_id" value={formData.student_id} readOnly disabled />
                      <Form.Text className="text-muted">Managed via Student ID settings.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Program <span className="text-danger">*</span></Form.Label>
                      <Form.Select name="program" value={formData.program} onChange={handleChange} required>
                        <option value="">Select Program</option>
                        {programOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Year Level <span className="text-danger">*</span></Form.Label>
                      <Form.Select name="year_level" value={formData.year_level} onChange={handleChange} isInvalid={!!fieldErrors.year_level} required>
                        <option value="">Select Year Level</option>
                        {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{fieldErrors.year_level}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Curriculum <span className="text-danger">*</span></Form.Label>
                      <Form.Select name="curriculum_id" value={formData.curriculum_id} onChange={handleChange} isInvalid={!!fieldErrors.curriculum_id} required>
                        <option value="">Select Curriculum</option>
                        {curricula.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{fieldErrors.curriculum_id}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Student Type <span className="text-danger">*</span></Form.Label>
                      <Form.Select name="student_type" value={formData.student_type} onChange={handleChange} isInvalid={!!fieldErrors.student_type} required>
                        <option value="">Select Type</option>
                        {studentTypeOptions.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{fieldErrors.student_type}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <hr />
              </>
            )}

            {/* ── Contact ── */}
            <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Contact</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Primary Email</Form.Label>
                  <Form.Control value={user.email || ''} readOnly disabled />
                  <Form.Text className="text-muted">Change via account settings.</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Alternate Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="alternate_email"
                    value={formData.alternate_email}
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.alternate_email}
                    placeholder="personal or backup email"
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.alternate_email}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mobile Number <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.contact_number}
                    placeholder="+63 9XX XXX XXXX"
                    required
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.contact_number}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <hr />

            {/* ── Demographics ── */}
            <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Demographics</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sex <span className="text-danger">*</span></Form.Label>
                  <Form.Select name="sex" value={formData.sex} onChange={handleChange} isInvalid={!!fieldErrors.sex} required>
                    <option value="">Select</option>
                    {sexOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{fieldErrors.sex}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Citizenship <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    name="citizenship"
                    value={formData.citizenship}
                    onChange={handleChange}
                    placeholder="e.g. Filipino"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />

            {/* ── Location ── */}
            <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Location</h6>
            <Form.Group className="mb-3">
              <Form.Label>Current Address <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="House/Unit No., Street, Barangay, City, Province"
                required
              />
            </Form.Group>

            <hr />

            {/* ── Emergency Contact ── */}
            <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Emergency Contact</h6>
            <Row>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Relationship</Form.Label>
                  <Form.Control name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange} placeholder="e.g. Parent, Sibling" />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Number <span className="text-danger">*</span></Form.Label>
                  <Form.Control name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>

            </fieldset>

            <hr />

            {/* ── Profile Picture ── */}
            <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em' }}>Profile Photo <span className="text-danger">*</span></h6>
            <div className="d-flex align-items-center gap-3 mb-4">
              {preview ? (
                <Image src={preview} roundedCircle width={80} height={80} style={{ objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                  style={{ width: 80, height: 80, flexShrink: 0, fontWeight: 700 }}
                >
                  {getInitials(`${formData.first_name} ${formData.last_name}`)}
                </div>
              )}
              <Form.Group className="flex-grow-1">
                <Form.Control type="file" accept="image/*" onChange={handleFileChange} />
                <Form.Text className="text-muted">JPEG, PNG, or WEBP. Max 5 MB. Recommended square image up to 2000x2000.</Form.Text>
              </Form.Group>
              <Button type="button" variant="outline-secondary" onClick={handleRemovePhoto} disabled={!preview && !formData.profile_picture}>
                Remove
              </Button>
            </div>

            <Button type="submit" variant="warning" disabled={saving}>
              {saving
                ? 'Saving...'
                : user?.role === 'student' && isProfileLockedForCurrentTerm
                ? 'Update Profile Picture'
                : 'Save Changes'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mt-3">
        <Card.Body>
          <h5 className="mb-3">Change Password</h5>
          {passwordError && <Alert variant="danger">{passwordError}</Alert>}
          {passwordSuccess && <Alert variant="success">{passwordSuccess}</Alert>}

          <Form onSubmit={handlePasswordSubmit}>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordFieldChange}
                    autoComplete="current-password"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordFieldChange}
                    autoComplete="new-password"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordFieldChange}
                    autoComplete="new-password"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Button type="submit" variant="primary" disabled={passwordSaving}>
              {passwordSaving ? 'Changing...' : 'Change Password'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Profile;
