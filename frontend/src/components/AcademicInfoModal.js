import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/api';

const PROGRAM_OPTIONS = ['BSCpE', 'BSCS', 'BSIT', 'BSCE', 'BSEE', 'BSME'];
const STUDENT_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'transferee', label: 'Transferee' },
  { value: 'ladderized', label: 'Ladderized' },
];
const YEAR_LEVEL_OPTIONS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];

const AcademicInfoModal = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    year_level: '',
    program: '',
    curriculum_id: '',
    student_type: '',
  });
  const [curricula, setCurricula] = useState([]);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/users/curriculum-options')
      .then((response) => {
        const items = response.data?.items || response.data?.data?.items || [];
        setCurricula(items);
      })
      .catch(() => {
        setCurricula([]);
      })
      .finally(() => {
        setLoadingCurricula(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.year_level) {
      setError('Please select your Year Level.');
      return;
    }
    if (!formData.program) {
      setError('Please select your Program.');
      return;
    }
    if (!formData.curriculum_id) {
      setError('Please select your Curriculum.');
      return;
    }
    if (!formData.student_type) {
      setError('Please select your Student Type.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/onboard', {
        current_year_level: Number(formData.year_level),
        program: formData.program,
        curriculum_id: Number(formData.curriculum_id),
        student_type: formData.student_type,
      });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save academic info. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCurricula = formData.program
    ? curricula.filter((c) =>
        c.name?.toLowerCase().includes(formData.program.toLowerCase().replace('bs', '').trim()),
      )
    : curricula;

  return (
    <Modal show backdrop="static" keyboard={false} centered>
      <Modal.Header>
        <Modal.Title>Complete Your Academic Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          Please provide your academic information to finish setting up your account.
        </p>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} role="alert">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Year Level</Form.Label>
            <Form.Select
              name="year_level"
              value={formData.year_level}
              onChange={handleChange}
              required
            >
              <option value="">Select year level...</option>
              {YEAR_LEVEL_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Program</Form.Label>
            <Form.Select
              name="program"
              value={formData.program}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, program: e.target.value, curriculum_id: '' }));
              }}
              required
            >
              <option value="">Select program...</option>
              {PROGRAM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Curriculum</Form.Label>
            {loadingCurricula ? (
              <div className="text-muted small">Loading curricula...</div>
            ) : (
              <Form.Select
                name="curriculum_id"
                value={formData.curriculum_id}
                onChange={handleChange}
                required
                disabled={!formData.program}
              >
                <option value="">
                  {formData.program ? 'Select curriculum...' : 'Select a program first'}
                </option>
                {filteredCurricula.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Student Type</Form.Label>
            <Form.Select
              name="student_type"
              value={formData.student_type}
              onChange={handleChange}
              required
            >
              <option value="">Select student type...</option>
              {STUDENT_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Button type="submit" variant="warning" className="w-100 fw-bold" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : 'Save & Continue'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AcademicInfoModal;
