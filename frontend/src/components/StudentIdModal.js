import React, { useState } from 'react';

const StudentIdModal = ({ onSubmit, userEmail }) => {
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate Student ID (7 digits)
    if (!/^\d{7}$/.test(studentId)) {
      setError('Student Number must be exactly 7 digits');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(studentId);
    } catch (err) {
      setError(err.message || 'Failed to update Student Number');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: 'clamp(20px, 6vw, 40px)',
        borderRadius: '10px',
        border: '3px solid #FFC107',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        margin: '0 auto'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            fontSize: 'clamp(32px, 8vw, 48px)',
            marginBottom: '15px'
          }}>
            🎓
          </div>
          <h2 style={{
            color: '#000',
            marginBottom: '10px',
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: '700'
          }}>
            Student Number Required
          </h2>
          <p style={{
            color: '#666',
            fontSize: 'clamp(12px, 3vw, 14px)',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Please enter your 7-digit Student Number to continue
          </p>
        </div>

        <div style={{
          backgroundColor: '#FFF3CD',
          padding: 'clamp(10px, 3vw, 15px)',
          borderRadius: '8px',
          border: '2px solid #FFC107',
          marginBottom: '25px',
          textAlign: 'center',
          wordBreak: 'break-word'
        }}>
          <p style={{
            margin: '0 0 5px 0',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            color: '#856404',
            fontWeight: '600'
          }}>
            📧 Registered Email
          </p>
          <p style={{
            margin: 0,
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            color: '#000',
            fontWeight: '500',
            wordBreak: 'break-word'
          }}>
            {userEmail}
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: 'clamp(10px, 3vw, 15px)',
            borderRadius: '5px',
            marginBottom: '20px',
            border: '2px solid #f5c6cb',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            wordBreak: 'break-word'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#000',
              fontSize: 'clamp(12px, 3vw, 14px)'
            }}>
              Student Number *
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter 7 digits (e.g., 1234567)"
              pattern="\d{7}"
              maxLength="7"
              required
              autoFocus
              style={{
                width: '100%',
                padding: 'clamp(10px, 3vw, 15px)',
                border: '2px solid #000',
                borderRadius: '5px',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: '600',
                textAlign: 'center',
                letterSpacing: '1px',
                boxSizing: 'border-box'
              }}
            />
            <small style={{
              display: 'block',
              marginTop: '8px',
              color: '#666',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              textAlign: 'center'
            }}>
              Your Student Number must be exactly 7 digits
            </small>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: loading ? '#ccc' : '#FFC107',
              color: '#000',
              border: '2px solid #000',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              textTransform: 'uppercase'
            }}
          >
            {loading ? 'Updating...' : 'Continue to Dashboard'}
          </button>

          <p style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#999'
          }}>
            🔒 This is a one-time setup required for student accounts
          </p>
        </form>
      </div>
    </div>
  );
};

export default StudentIdModal;
