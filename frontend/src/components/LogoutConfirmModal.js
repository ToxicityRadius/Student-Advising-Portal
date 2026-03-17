import React from 'react';
import { Button, Modal } from 'react-bootstrap';

const LogoutConfirmModal = ({ show, onCancel, onConfirm }) => (
  <Modal show={show} onHide={onCancel} centered size="sm">
    <Modal.Header closeButton style={{ borderBottom: '3px solid #FFC107', background: '#fff', color: '#111' }}>
      <Modal.Title style={{ fontSize: '1rem', fontWeight: 700 }}>Confirm Logout</Modal.Title>
    </Modal.Header>
    <Modal.Body style={{ background: '#fff', color: '#333', textAlign: 'center', padding: '24px 20px' }}>
      <p style={{ margin: 0, fontSize: '0.95rem' }}>Are you sure you want to log out?</p>
    </Modal.Body>
    <Modal.Footer style={{ background: '#fff', borderTop: '1px solid #eee', justifyContent: 'center', gap: 12, padding: '16px 20px' }}>
      <Button
        onClick={onCancel}
        style={{
          width: 'auto',
          minWidth: 100,
          padding: '8px 20px',
          background: '#fff',
          border: '1.5px solid #ccc',
          borderRadius: 6,
          color: '#333',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        style={{
          width: 'auto',
          minWidth: 100,
          padding: '8px 20px',
          background: '#FFC107',
          border: '1.5px solid #FFC107',
          borderRadius: 6,
          color: '#111',
          fontWeight: 700,
          fontSize: '0.9rem',
        }}
      >
        Log Out
      </Button>
    </Modal.Footer>
  </Modal>
);

export default LogoutConfirmModal;
