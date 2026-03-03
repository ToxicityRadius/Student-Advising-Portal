import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Table, Button, Alert, Spinner, Badge, Modal, Image
} from 'react-bootstrap';
import api from '../utils/api';

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const AdviserDashboard = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [acting, setActing] = useState(null); // gradeId being approved/rejected

  // Proof modal
  const [showProof, setShowProof] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofIsPdf, setProofIsPdf] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/grades/pending');
      setGrades(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending grades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleVerify = async (id, status) => {
    setError('');
    setSuccess('');
    setActing(id);
    try {
      await api.patch(`/grades/${id}/verify`, { status });
      setSuccess(`Grade ${status} successfully`);
      // Remove from list
      setGrades(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const openProof = (filePath) => {
    const url = `${API_BASE}/${filePath}`;
    setProofUrl(url);
    setProofIsPdf(filePath.toLowerCase().endsWith('.pdf'));
    setShowProof(true);
  };

  if (loading) {
    return <Container className="text-center mt-5"><Spinner animation="border" variant="warning" /></Container>;
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Adviser Dashboard — Pending Verifications</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {grades.length === 0 ? (
        <Alert variant="info">No pending grades to review.</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Course</th>
              <th>Title</th>
              <th>Grade</th>
              <th>Term</th>
              <th>Proof</th>
              <th style={{ width: '200px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {grades.map(g => (
              <tr key={g.id}>
                <td>{g.User?.studentId || '—'}</td>
                <td>{g.User ? `${g.User.firstName} ${g.User.lastName}` : '—'}</td>
                <td>{g.Subject?.course_code}</td>
                <td>{g.Subject?.title}</td>
                <td><Badge bg="secondary">{g.grade_value}</Badge></td>
                <td>{g.term_taken}</td>
                <td>
                  {g.ProofDocument ? (
                    <Button
                      size="sm"
                      variant="outline-info"
                      onClick={() => openProof(g.ProofDocument.file_path)}
                    >
                      View Proof
                    </Button>
                  ) : (
                    <span className="text-muted">None</span>
                  )}
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="success"
                    className="me-2"
                    disabled={acting === g.id}
                    onClick={() => handleVerify(g.id, 'verified')}
                  >
                    {acting === g.id ? <Spinner size="sm" animation="border" /> : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={acting === g.id}
                    onClick={() => handleVerify(g.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* ── Proof Modal ── */}
      <Modal show={showProof} onHide={() => setShowProof(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Proof Document</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {proofIsPdf ? (
            <iframe
              src={proofUrl}
              title="Proof PDF"
              style={{ width: '100%', height: '500px', border: 'none' }}
            />
          ) : (
            <Image src={proofUrl} alt="Proof" fluid />
          )}
        </Modal.Body>
        <Modal.Footer>
          <a href={proofUrl} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
            Open in New Tab
          </a>
          <Button variant="secondary" onClick={() => setShowProof(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdviserDashboard;
