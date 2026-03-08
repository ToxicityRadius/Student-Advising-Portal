import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Alert, Image } from 'react-bootstrap';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const programOptions = [
  'BSCpE',
  'BSCS',
  'BSIT',
  'BSCE',
  'BSEE',
  'BSME'
];

const Profile = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    student_id: '',
    program: '',
    year_level: '',
    contact_number: '',
    profile_picture: null
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/${user.id}`);
        const profile = response.data.user || {};

        setFormData((prev) => ({
          ...prev,
          first_name: profile.first_name || '',
          middle_name: profile.middle_name || '',
          last_name: profile.last_name || '',
          student_id: profile.studentId || '',
          program: profile.program || '',
          year_level: profile.current_year_level || profile.year_level || '',
          contact_number: profile.contact_number || ''
        }));

        if (profile.profile_picture) {
          const apiRoot = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
          setPreview(`${apiRoot}${profile.profile_picture}`);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchProfile();
  }, [user?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, profile_picture: file }));
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      payload.append('first_name', formData.first_name);
      payload.append('middle_name', formData.middle_name);
      payload.append('last_name', formData.last_name);
      payload.append('program', formData.program);
      payload.append('year_level', formData.year_level);
      payload.append('contact_number', formData.contact_number);
      if (formData.profile_picture) {
        payload.append('profile_picture', formData.profile_picture);
      }

      const response = await api.put(`/users/${user.id}/profile`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const freshToken = response.data.token;
      if (freshToken) {
        localStorage.setItem('token', freshToken);
        await login(freshToken);
      }

      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Container className="py-4">Loading profile...</Container>;

  return (
    <Container className="py-4" style={{ maxWidth: '720px' }}>
      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-3">My Profile</h3>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control name="first_name" value={formData.first_name} onChange={handleChange} required />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Middle Name</Form.Label>
              <Form.Control name="middle_name" value={formData.middle_name} onChange={handleChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control name="last_name" value={formData.last_name} onChange={handleChange} required />
            </Form.Group>

            {user.role === 'student' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Student ID</Form.Label>
                  <Form.Control name="student_id" value={formData.student_id} readOnly disabled />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Program</Form.Label>
                  <Form.Select name="program" value={formData.program} onChange={handleChange} required>
                    <option value="">Select Program</option>
                    {programOptions.map((program) => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Year Level</Form.Label>
                  <Form.Select name="year_level" value={formData.year_level} onChange={handleChange} required>
                    <option value="">Select Year Level</option>
                    {[1, 2, 3, 4, 5].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control name="contact_number" value={formData.contact_number} onChange={handleChange} required />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Profile Picture</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={handleFileChange} />
            </Form.Group>

            {preview && (
              <div className="mb-3">
                <Image src={preview} rounded width={120} height={120} style={{ objectFit: 'cover' }} />
              </div>
            )}

            <Button type="submit" variant="warning" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Profile;
