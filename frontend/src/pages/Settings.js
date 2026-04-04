import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import AdminLayout from '../components/admin/AdminLayout';
import AdviserLayout from '../components/adviser/AdviserLayout';
import StudentLayout from '../components/student/StudentLayout';

const YELLOW = '#FFC107';

const SavedIndicator = ({ visible }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 10,
      background: '#E8F5E9',
      color: '#2E7D32',
      fontSize: '0.72rem',
      fontWeight: 700,
      border: '1px solid #A5D6A7',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s',
      pointerEvents: 'none',
    }}
  >
    Saved
  </span>
);

const SettingRow = ({ label, description, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: '1px solid #f0f0f0',
      gap: 16,
      flexWrap: 'wrap',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>{label}</div>
      {description && (
        <div style={{ fontSize: '0.82rem', color: '#888', marginTop: 2 }}>{description}</div>
      )}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => {
      if (!disabled) onChange(!checked);
    }}
    disabled={disabled}
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      background: disabled ? '#eee' : checked ? YELLOW : '#ddd',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative',
      transition: 'background 0.2s',
      outline: 'none',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
        display: 'block',
      }}
    />
  </button>
);

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Preference state initialised from persisted user object
  const [notifEmail, setNotifEmail] = useState(() => user?.notifEmail ?? false);
  const [notifInapp, setNotifInapp] = useState(() => user?.notifInapp ?? true);
  const [notifReminders, setNotifReminders] = useState(() => user?.notifReminders ?? false);
  const [compactMode, setCompactMode] = useState(() => user?.compactMode ?? false);

  // Saved indicator
  const [savedVisible, setSavedVisible] = useState(false);
  const savedTimerRef = useRef(null);

  const showSaved = () => {
    setSavedVisible(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedVisible(false), 2000);
  };

  const updateSetting = useCallback(
    async (field, value) => {
      try {
        const res = await api.patch('/users/settings', { [field]: value });
        if (res.data?.success && res.data?.data) {
          setUser((prev) => ({ ...prev, ...res.data.data }));
          // Apply compact mode immediately
          document.body.classList.toggle(
            'compact-mode',
            Boolean(res.data.data.compactMode ?? compactMode),
          );
        }
        showSaved();
      } catch {
        // silently ignore — toggle revert is not needed since the API is best-effort
      }
    },
    [setUser, compactMode],
  );

  const handleToggle = (field, setter) => (value) => {
    setter(value);
    updateSetting(field, value);
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // ── Admin / Adviser: render inside their own sidebar layout ──
  if (user?.role === 'admin' || user?.role === 'adviser') {
    const Layout = user.role === 'admin' ? AdminLayout : AdviserLayout;
    return (
      <Layout activePage="" pageTitle="Settings">
        <section
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111', marginBottom: 4 }}>
            Account
          </h2>
          <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
            Manage your login credentials and security.
          </p>
          <SettingRow label="Email Address" description={user?.email || '—'}>
            <Link
              to="/change-email"
              style={{
                padding: '7px 18px',
                borderRadius: 8,
                background: YELLOW,
                color: '#000',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              Change
            </Link>
          </SettingRow>
          <SettingRow label="Password" description="Last changed: unknown">
            <Link
              to="/change-password"
              style={{
                padding: '7px 18px',
                borderRadius: 8,
                background: YELLOW,
                color: '#000',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              Change
            </Link>
          </SettingRow>
          <SettingRow
            label="Profile Information"
            description="Update your name, photo, program, and contact details."
          >
            <Link
              to="/profile"
              style={{
                padding: '7px 18px',
                borderRadius: 8,
                border: '1.5px solid #e0e0e0',
                color: '#333',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              Edit Profile
            </Link>
          </SettingRow>
        </section>
        <section
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111', margin: 0 }}>
              Notifications
            </h2>
            <SavedIndicator visible={savedVisible} />
          </div>
          <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
            Choose what updates you receive and how.
          </p>
          <SettingRow
            label="Email notifications"
            description="Receive updates about your advising sessions via email."
          >
            <Toggle checked={notifEmail} onChange={handleToggle('notifEmail', setNotifEmail)} />
          </SettingRow>
          <SettingRow
            label="In-app notifications"
            description="Show alerts inside the portal when something needs your attention."
          >
            <Toggle checked={notifInapp} onChange={handleToggle('notifInapp', setNotifInapp)} />
          </SettingRow>
          <SettingRow
            label="Advising reminders"
            description="Remind me of upcoming advising deadlines and term events."
          >
            <Toggle
              checked={notifReminders}
              onChange={handleToggle('notifReminders', setNotifReminders)}
            />
          </SettingRow>
        </section>
        <section
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111', margin: 0 }}>
              Display
            </h2>
          </div>
          <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
            Adjust how the portal looks for you.
          </p>
          <SettingRow
            label="Compact mode"
            description="Reduce spacing in tables and lists for a denser layout."
          >
            <Toggle checked={compactMode} onChange={handleToggle('compactMode', setCompactMode)} />
          </SettingRow>
        </section>
        <section
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            border: '1.5px solid #ffe0e0',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c62828', marginBottom: 4 }}>
            Session
          </h2>
          <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
            Sign out of your current session.
          </p>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              padding: '8px 22px',
              borderRadius: 8,
              background: '#fff',
              border: '1.5px solid #e53935',
              color: '#e53935',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </section>
        <LogoutConfirmModal
          show={showLogoutConfirm}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
      </Layout>
    );
  }

  // ── Student: render inside shared student layout ──
  return (
    <StudentLayout activePage="settings" pageTitle="Settings">
      {/* Account settings */}
      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111', marginBottom: 4 }}>
          Account
        </h2>
        <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
          Manage your login credentials and security.
        </p>

        <SettingRow label="Email Address" description={user?.email || '—'}>
          <Link
            to="/change-email"
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              background: YELLOW,
              color: '#000',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Change
          </Link>
        </SettingRow>
        <SettingRow label="Password" description="Last changed: unknown">
          <Link
            to="/change-password"
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              background: YELLOW,
              color: '#000',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Change
          </Link>
        </SettingRow>
        <SettingRow
          label="Profile Information"
          description="Update your name, photo, program, and contact details."
        >
          <Link
            to="/profile"
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              border: '1.5px solid #e0e0e0',
              color: '#333',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Edit Profile
          </Link>
        </SettingRow>
      </section>

      {/* Notification settings */}
      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111', margin: 0 }}>
            Notifications
          </h2>
          <SavedIndicator visible={savedVisible} />
        </div>
        <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
          Choose what updates you receive and how.
        </p>

        <SettingRow
          label="Email notifications"
          description="Receive updates about your advising sessions via email."
        >
          <Toggle checked={notifEmail} onChange={handleToggle('notifEmail', setNotifEmail)} />
        </SettingRow>
        <SettingRow
          label="In-app notifications"
          description="Show alerts inside the portal when something needs your attention."
        >
          <Toggle checked={notifInapp} onChange={handleToggle('notifInapp', setNotifInapp)} />
        </SettingRow>
        <SettingRow
          label="Advising reminders"
          description="Remind me of upcoming advising deadlines and term events."
        >
          <Toggle
            checked={notifReminders}
            onChange={handleToggle('notifReminders', setNotifReminders)}
          />
        </SettingRow>
      </section>

      {/* Display settings */}
      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111', margin: 0 }}>Display</h2>
        </div>
        <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
          Adjust how the portal looks for you.
        </p>

        <SettingRow
          label="Compact mode"
          description="Reduce spacing in tables and lists for a denser layout."
        >
          <Toggle checked={compactMode} onChange={handleToggle('compactMode', setCompactMode)} />
        </SettingRow>
      </section>

      {/* Danger zone */}
      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          border: '1.5px solid #ffe0e0',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c62828', marginBottom: 4 }}>
          Session
        </h2>
        <p style={{ fontSize: '0.83rem', color: '#888', marginBottom: 16, marginTop: 0 }}>
          Sign out of your current session.
        </p>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            padding: '8px 22px',
            borderRadius: 8,
            background: '#fff',
            border: '1.5px solid #e53935',
            color: '#e53935',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </section>
      <LogoutConfirmModal
        show={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </StudentLayout>
  );
};

export default Settings;
