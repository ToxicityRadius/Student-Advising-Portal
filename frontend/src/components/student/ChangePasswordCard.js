import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '../EyeIcons';

const ChangePasswordCard = ({
  passwordData,
  passwordError,
  passwordSuccess,
  passwordSaving,
  handlePasswordFieldChange,
  handlePasswordSubmit,
}) => {
  const [showFields, setShowFields] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const toggleShow = (name) => setShowFields((prev) => ({ ...prev, [name]: !prev[name] }));
  return (
    <div
      className="change-password-card"
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '28px 32px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        marginTop: 24,
      }}
    >
      <h3
        style={{
          fontWeight: 800,
          fontSize: '1.1rem',
          color: '#111',
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        Change Password
      </h3>
      {passwordError && (
        <div
          style={{
            background: '#fff3f3',
            color: '#c62828',
            border: '1px solid #e57373',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: '0.88rem',
          }}
        >
          {passwordError}
        </div>
      )}
      {passwordSuccess && (
        <div
          style={{
            background: '#f0fff4',
            color: '#2e7d32',
            border: '1px solid #81c784',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: '0.88rem',
          }}
        >
          {passwordSuccess}
        </div>
      )}
      <form onSubmit={handlePasswordSubmit}>
        <div
          className="change-password-card__fields"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}
        >
          {[
            { name: 'oldPassword', label: 'Current Password' },
            { name: 'newPassword', label: 'New Password' },
            { name: 'confirmPassword', label: 'Confirm New Password' },
          ].map(({ name, label }) => (
            <div key={name}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: '#888',
                  marginBottom: 5,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showFields[name] ? 'text' : 'password'}
                  name={name}
                  value={passwordData[name]}
                  onChange={handlePasswordFieldChange}
                  autoComplete={name === 'oldPassword' ? 'current-password' : 'new-password'}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleShow(name)}
                  aria-label={showFields[name] ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showFields[name] ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={passwordSaving}
          style={{
            background: '#1976d2',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.92rem',
            padding: '10px 28px',
            borderRadius: 8,
            border: 'none',
            cursor: passwordSaving ? 'not-allowed' : 'pointer',
            opacity: passwordSaving ? 0.7 : 1,
          }}
        >
          {passwordSaving ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordCard;
