import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';

const emptyForm = {
  code: '',
  name: '',
  collegeName: '',
  emailSuffix: '',
  isActive: true,
};

const ProgramManagement = () => {
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const activeCount = useMemo(
    () => programs.filter((program) => program.isActive).length,
    [programs],
  );

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const response = await api.get('/programs');
      setPrograms(response.data?.data || []);
      setAlert(null);
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: error.response?.data?.message || 'Failed to load programs.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (program) => {
    setEditingId(program.id);
    setForm({
      code: program.code || '',
      name: program.name || '',
      collegeName: program.collegeName || '',
      emailSuffix: program.emailSuffix || '',
      isActive: Boolean(program.isActive),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setAlert(null);

    try {
      if (editingId) {
        await api.put(`/programs/${editingId}`, form);
      } else {
        await api.post('/programs', form);
      }
      await loadPrograms();
      resetForm();
      setAlert({ variant: 'success', message: 'Program saved.' });
    } catch (error) {
      setAlert({
        variant: 'danger',
        message: error.response?.data?.message || 'Failed to save program.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout activePage="programs" pageTitle="Programs">
      <div className="d-flex flex-column gap-3">
        {alert && <Alert variant={alert.variant}>{alert.message}</Alert>}

        <Row className="g-3">
          <Col lg={4}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h2 className="h5 mb-1">{editingId ? 'Edit Program' : 'New Program'}</h2>
                    <div className="text-muted small">{activeCount} active programs</div>
                  </div>
                  {editingId && (
                    <Button size="sm" variant="outline-secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="program-code">
                    <Form.Label>Code</Form.Label>
                    <Form.Control
                      value={form.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="BSCPE"
                      maxLength={20}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="program-name">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Bachelor of Science in Computer Engineering"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="college-name">
                    <Form.Label>College</Form.Label>
                    <Form.Control
                      value={form.collegeName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, collegeName: event.target.value }))
                      }
                      placeholder="College of Engineering and Architecture"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="email-suffix">
                    <Form.Label>Email Suffix</Form.Label>
                    <Form.Control
                      value={form.emailSuffix}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, emailSuffix: event.target.value }))
                      }
                      placeholder=".cpe@tip.edu.ph"
                    />
                  </Form.Group>

                  <Form.Check
                    className="mb-3"
                    type="switch"
                    id="program-active"
                    label="Active"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                  />

                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Program'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                {loading ? (
                  <div className="d-flex align-items-center gap-2 text-muted">
                    <Spinner animation="border" size="sm" />
                    Loading programs
                  </div>
                ) : (
                  <Table responsive hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Program</th>
                        <th>College</th>
                        <th>Status</th>
                        <th>Assigned Staff</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.map((program) => (
                        <tr key={program.id}>
                          <td className="fw-semibold">{program.code}</td>
                          <td>{program.name}</td>
                          <td>{program.collegeName || 'N/A'}</td>
                          <td>
                            <Badge bg={program.isActive ? 'success' : 'secondary'}>
                              {program.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>{program.AssignedUsers?.length || 0}</td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleEdit(program)}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
};

export default ProgramManagement;
