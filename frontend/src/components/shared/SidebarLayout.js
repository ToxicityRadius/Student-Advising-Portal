import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import LogoutConfirmModal from '../LogoutConfirmModal';
import SideNavItem from './SideNavItem';
import { buildProfileImageUrl } from '../../utils/profileImage';
import { getNotificationTargetPath } from '../../utils/notificationTargets';

import logo from '../../assets/images/STUDENT ADVISING LOGO 1.png';
import bellIconImg from '../../assets/images/Bell White Gradient.png';
import goldBellImg from '../../assets/images/Gold Bell Gradient.png';
import boxCheckImg from '../../assets/images/Box Check.png';
import boxUncheckImg from '../../assets/images/Box Uncheck.png';
import goldSettingsImg from '../../assets/images/Gold Settings.png';
import goldUserImg from '../../assets/images/Gold User.png';
import goldHelpImg from '../../assets/images/Gold Help & Support.png';
import goldLogoutImg from '../../assets/images/Gold Logout.png';

import './SidebarLayout.css';

const YELLOW = '#FFC107';

const imgIcon = (src, size = 22) => (
  <img src={src} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
);

const DEFAULT_ACCOUNT_ITEMS = [
  { key: 'profile', label: 'Profile', to: '/profile', icon: imgIcon(goldUserImg) },
  { key: 'settings', label: 'Settings', to: '/settings', icon: imgIcon(goldSettingsImg) },
  { key: 'help', label: 'Help & Support', to: '/help', icon: imgIcon(goldHelpImg) },
];

const DEFAULT_CLASS_NAMES = {
  root: 'sidebar-layout',
  sidebar: 'sidebar-layout__sidebar',
  mobileButton: 'sidebar-layout__mobile-btn',
  mobileOverlay: 'sidebar-layout__mobile-overlay',
  main: 'sidebar-layout__main',
  topbar: 'sidebar-layout__topbar',
  content: 'sidebar-layout__content',
  inner: 'sidebar-layout__inner',
};

/**
 * Shared sidebar layout for admin and adviser pages.
 *
 * Props:
 *  - activePage: key of the currently active nav item
 *  - pageTitle: shown in the topbar breadcrumb
 *  - navItems: array of { key, label, to, icon }
 *  - roleLabel: e.g. "Program Chair" or "Adviser" (shown under name)
 *  - children: page content
 */
const SidebarLayout = ({
  activePage,
  pageTitle,
  navItems = [],
  roleLabel,
  children,
  avatarOverride,
  profileIdentifier,
  profileBadges,
  renderProfileDetails,
  accountItems,
  classNames,
  disableInnerWrapper = false,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationContext();

  const classes = {
    ...DEFAULT_CLASS_NAMES,
    ...(classNames || {}),
  };

  const resolvedAccountItems =
    Array.isArray(accountItems) && accountItems.length > 0 ? accountItems : DEFAULT_ACCOUNT_ITEMS;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 780) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationActivate = async (notification, isRead) => {
    if (!isRead && typeof notification?.id === 'number') {
      await markAsRead(notification.id);
    }
    setNotifOpen(false);
    navigate(getNotificationTargetPath(notification));
  };

  const firstName = user?.firstName || user?.first_name || '';
  const lastName = user?.lastName || user?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'User';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  const avatarUrl =
    avatarOverride || buildProfileImageUrl(user?.profile_picture || user?.profilePicture);

  return (
    <div className={classes.root}>
      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`${classes.sidebar} ${mobileMenuOpen ? 'open' : ''}`}>
        {/* User profile */}
        <div
          style={{
            padding: '24px 20px 20px',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: YELLOW,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 900,
              color: '#222',
              overflow: 'hidden',
              flexShrink: 0,
              marginBottom: 12,
              boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${YELLOW}`,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: '#111',
              marginBottom: 4,
              lineHeight: 1.3,
            }}
          >
            {fullName}
          </div>
          {typeof renderProfileDetails === 'function' ? (
            renderProfileDetails({
              user,
              roleLabel,
              profileIdentifier,
              profileBadges: Array.isArray(profileBadges) ? profileBadges : [],
            })
          ) : (
            <>
              {(profileIdentifier || roleLabel) && (
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: '#888',
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  {profileIdentifier || roleLabel}
                </div>
              )}
              {Array.isArray(profileBadges) && profileBadges.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    width: '100%',
                    marginBottom: 8,
                  }}
                >
                  {profileBadges.filter(Boolean).map((badge) => (
                    <span
                      key={badge}
                      style={{
                        background: 'linear-gradient(135deg, #FFD54F 0%, #FFC107 100%)',
                        color: '#4E342E',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        padding: '6px 14px',
                        borderRadius: 20,
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        flex: '1 1 0',
                        boxShadow: '0 2px 6px rgba(255,193,7,0.30)',
                        letterSpacing: '0.2px',
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, paddingTop: 8 }}>
          <div
            style={{
              padding: '10px 16px 6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: 1.5,
            }}
          >
            MAIN
          </div>
          {navItems.map((item) => (
            <SideNavItem
              key={item.key}
              active={activePage === item.key}
              icon={item.icon}
              label={item.label}
              to={item.to}
              badge={item.badge}
            />
          ))}

          <div
            style={{
              padding: '14px 16px 6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#bbb',
              letterSpacing: 1.5,
            }}
          >
            ACCOUNT
          </div>
          {resolvedAccountItems.map((item) => (
            <SideNavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              to={item.to}
              active={activePage === item.key}
            />
          ))}

          {/* Logout */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#444',
              fontSize: '0.9rem',
              fontWeight: 600,
              borderLeft: '4px solid transparent',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = YELLOW;
              e.currentTarget.style.boxShadow = '0 0 12px rgba(255,193,7,0.6)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.color = '#555';
            }}
          >
            <span
              style={{
                width: 20,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {imgIcon(goldLogoutImg)}
            </span>
            <span>Logout</span>
          </button>
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          <p style={{ fontSize: '0.63rem', color: '#ccc', lineHeight: 1.5, margin: 0 }}>
            TIP Student Advising System
            <br />
            v1.0.0 | &copy; 2025
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          className={classes.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      {/* ══════════ MAIN AREA ══════════ */}
      <div className={classes.main}>
        <header
          className={classes.topbar}
          style={{
            background: YELLOW,
            height: 70,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <button
              type="button"
              className={classes.mobileButton}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7H20M4 12H20M4 17H20"
                  stroke="#222"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <img src={logo} alt="Student Advising" style={{ height: 46, objectFit: 'contain' }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Link
                to="/"
                style={{ textDecoration: 'none', color: 'rgba(0,0,0,0.55)', fontWeight: 600 }}
              >
                HOME
              </Link>
              <span style={{ color: 'rgba(0,0,0,0.4)', margin: '0 2px' }}>›</span>
              <span style={{ color: '#111', fontWeight: 800 }}>{pageTitle}</span>
            </div>
          </div>

          {/* Bell / notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              aria-expanded={notifOpen}
              style={{
                position: 'relative',
                padding: 10,
                cursor: 'pointer',
                borderRadius: 10,
                transition: 'background-color 0.15s, opacity 0.15s',
                background: 'none',
                border: 'none',
              }}
              onClick={() => setNotifOpen((o) => !o)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.18)';
                e.currentTarget.style.opacity = '0.82';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '1';
              }}
            >
              <img
                src={bellIconImg}
                alt="Notifications"
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: '#e53935',
                    color: '#fff',
                    borderRadius: '50%',
                    minWidth: 20,
                    height: 20,
                    padding: '0 4px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 380,
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  zIndex: 9999,
                  overflow: 'hidden',
                  border: '1px solid #f0f0f0',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 20px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={goldBellImg}
                      alt=""
                      style={{ width: 28, height: 28, objectFit: 'contain' }}
                    />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111' }}>
                      Notifications
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAllRead(true);
                      markAllAsRead();
                    }}
                    aria-label={
                      unreadCount === 0
                        ? 'All notifications marked as read'
                        : 'Mark all notifications as read'
                    }
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <img
                      src={unreadCount === 0 || allRead ? boxCheckImg : boxUncheckImg}
                      alt=""
                      style={{ width: 26, height: 26, objectFit: 'contain' }}
                    />
                  </button>
                </div>

                {/* Items */}
                <div
                  style={{
                    padding: '0 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    maxHeight: 320,
                    overflowY: 'auto',
                    paddingBottom: 16,
                  }}
                >
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: '18px 12px',
                        textAlign: 'center',
                        color: '#888',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const colors = {
                        error: {
                          bg: '#fff0f0',
                          border: '#e53935',
                          text: '#c62828',
                          sub: '#e57373',
                        },
                        info: { bg: '#f0f4ff', border: '#1e88e5', text: '#1565c0', sub: '#64b5f6' },
                        success: {
                          bg: '#f0fff4',
                          border: '#43a047',
                          text: '#2e7d32',
                          sub: '#81c784',
                        },
                        warning: {
                          bg: '#fffbf0',
                          border: '#f9a825',
                          text: '#e65100',
                          sub: '#ffb74d',
                        },
                      };
                      const c = colors[n.type] || colors.info;
                      const isRead = n.isRead || allRead;
                      return (
                        <div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationActivate(n, isRead)}
                          onKeyDown={(event) => {
                            if (
                              event.key === 'Enter' ||
                              event.key === ' ' ||
                              event.key === 'Space'
                            ) {
                              event.preventDefault();
                              handleNotificationActivate(n, isRead);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: c.bg,
                            opacity: isRead ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ width: 5, background: c.border, flexShrink: 0 }} />
                          <div style={{ padding: '12px 14px', flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: c.text,
                                marginBottom: 3,
                              }}
                            >
                              {n.title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: c.sub }}>{n.body}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* View all link */}
                <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #f0f0f0' }}>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#B8860B',
                      textDecoration: 'none',
                    }}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className={classes.content}>
          {disableInnerWrapper ? children : <div className={classes.inner}>{children}</div>}
        </main>
      </div>

      <LogoutConfirmModal
        show={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default SidebarLayout;
