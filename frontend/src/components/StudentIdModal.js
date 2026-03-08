import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';

const StudentIdModal = ({ onSubmit, userEmail }) => {
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{7}$/.test(studentId)) {
      setError('Student Number must be exactly 7 digits.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(studentId);
    } catch (err) {
      setError(err.message || 'Failed to update Student Number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show backdrop="static" keyboard={false} centered>
      <Modal.Header>
        <Modal.Title>Enter Your Student Number</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          Welcome, <strong>{userEmail}</strong>! Please enter your 7-digit Student Number to continue.
        </p>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Student Number</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. 2100123"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, '').slice(0, 7))}
              maxLength={7}
              required
            />
            <Form.Text className="text-muted">Must be exactly 7 digits.</Form.Text>
          </Form.Group>
          <Button
            type="submit"
            variant="warning"
            className="w-100 fw-bold"
            disabled={loading || studentId.length !== 7}
          >
            {loading ? <Spinner size="sm" animation="border" /> : 'Submit'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default StudentIdModal;
