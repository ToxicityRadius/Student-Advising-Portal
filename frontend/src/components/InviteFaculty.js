import React, { useState } from 'react';

const InviteFaculty = () => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'adviser'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/invite-faculty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setFormData({ email: '', role: 'adviser' });
      } else {
        setError(data.message || 'Failed to send invitation');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error sending invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '25px', 
      borderRadius: '8px',
      border: '3px solid #000',
      marginBottom: '30px'
    }}>
      <h3 style={{ 
        color: '#000', 
        marginBottom: '20px', 
        borderBottom: '3px solid #FFC107',
        paddingBottom: '10px'
      }}>
        📧 Invite Faculty Member
      </h3>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px 20px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '2px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px 20px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '2px solid #c3e6cb'
        }}>
          ✅ {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600',
            color: '#000'
          }}>
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="faculty@tip.edu.ph"
            style={{
              width: '100%',
              padding: '12px 15px',
              border: '2px solid #000',
              borderRadius: '5px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          <small style={{ color: '#666', fontSize: '13px' }}>
            Must be a valid @tip.edu.ph email address
          </small>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600',
            color: '#000'
          }}>
            Role *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px 15px',
              border: '2px solid #000',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#fff',
              boxSizing: 'border-box'
            }}
          >
            <option value="adviser">Adviser (Student Adviser)</option>
            <option value="admin">Admin (Program Chair)</option>
          </select>
          <small style={{ color: '#666', fontSize: '13px' }}>
            {formData.role === 'adviser' 
              ? 'Can access advisee records and validate study plans' 
              : 'Full system access including user management and analytics'}
          </small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#ccc' : '#FFC107',
            color: '#000',
            border: '2px solid #000',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s'
          }}
        >
          {loading ? 'Sending Invitation...' : '✉️ Send Invitation'}
        </button>

        <p style={{ 
          marginTop: '15px', 
          fontSize: '13px', 
          color: '#666',
          textAlign: 'center'
        }}>
          ⏰ Invitation links expire in 48 hours
        </p>
      </form>
    </div>
  );
};

export default InviteFaculty;
