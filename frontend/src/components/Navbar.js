import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path) => location.pathname === path;

  // Determine if we're on a public page (home, about, purpose) or authenticated page
  const isPublicPage = ['/', '/about', '/purpose'].includes(location.pathname);

  return (

    <nav style={{
      position: 'fixed',
      top: isPublicPage ? '8px' : 0,
      left: isPublicPage ? '50%' : 0,
      right: isPublicPage ? 'auto' : 0,
      transform: isPublicPage ? 'translateX(-50%)' : 'none',
      width: isPublicPage ? '100%' : '100%',
      maxWidth: '1200px',
      zIndex: 1000,
      background: isPublicPage ? 'rgba(255, 255, 255, 0.6)' : '#111',
      backdropFilter: isPublicPage ? 'saturate(180%) blur(20px)' : 'none',
      WebkitBackdropFilter: isPublicPage ? 'saturate(180%) blur(20px)' : 'none',
      borderBottom: isPublicPage ? 'none' : '3px solid #FFC107',
      borderRadius: isPublicPage ? '12px' : 0,
      boxShadow: isPublicPage ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 12px rgba(0,0,0,0.3)',
      padding: isPublicPage ? '0.5rem 1rem' : 0,
      margin: isPublicPage ? '0 10px' : 0,
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isPublicPage ? '0 20px' : '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isPublicPage ? 'center' : 'space-between',
        height: isPublicPage ? 'auto' : '64px'
      }}>

        {/* Brand - only shown on authenticated pages */}
        {!isPublicPage && (
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '10px' }}>
            <span style={{
              color: '#FFC107',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '0.5px'
            }}>
              Student Advising
            </span>
          </Link>
        )}

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#FFC107',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '4px',
            position: isPublicPage ? 'absolute' : 'static',
            right: '20px',
            top: '20px'
          }}
          className="navbar-mobile-toggle"
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Nav links */}
        <div
          className={`navbar-links-container ${menuOpen ? 'open' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isPublicPage ? '50px' : '8px'
          }}
        >
          {isPublicPage ? (
            <>
              <PublicNavLink to="/" active={isActive('/')}>HOME</PublicNavLink>
              <PublicNavLink to="/login" active={false}>SIGN IN</PublicNavLink>
              <PublicNavLink to="/purpose" active={isActive('/purpose')}>PURPOSE</PublicNavLink>
              <PublicNavLink to="/about" active={isActive('/about')}>ABOUT US</PublicNavLink>
            </>
          ) : user ? (
            <>
              <span style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.85rem',
                marginRight: '8px'
              }}>
                Welcome, <strong style={{ color: '#FFC107' }}>{user.firstName || user.first_name}</strong>
              </span>

              <AppNavLink to="/dashboard" active={isActive('/dashboard')}>
                Dashboard
              </AppNavLink>

              {isAdmin && (
                <>
                  <AppNavLink to="/admin/users" active={isActive('/admin/users')}>
                    Manage Users
                  </AppNavLink>
                  <AppNavLink to="/admin/curriculums" active={isActive('/admin/curriculums')}>
                    Curriculums
                  </AppNavLink>
                  <AppNavLink to="/admin/calendar" active={isActive('/admin/calendar')}>
                    Calendar
                  </AppNavLink>
                  <AppNavLink to="/admin/course-offerings" active={isActive('/admin/course-offerings')}>
                    Offerings
                  </AppNavLink>
                  <AppNavLink to="/adviser/dashboard" active={isActive('/adviser/dashboard')}>
                    Adviser
                  </AppNavLink>
                </>
              )}

              {user.role === 'student' && (
                <>
                  <AppNavLink to="/grades/entry" active={isActive('/grades/entry')}>
                    Grades
                  </AppNavLink>
                  <AppNavLink to="/study-plan" active={isActive('/study-plan')}>
                    Study Plan
                  </AppNavLink>
                </>
              )}

              {user.role === 'adviser' && !isAdmin && (
                <AppNavLink to="/adviser/dashboard" active={isActive('/adviser/dashboard')}>
                  Adviser
                </AppNavLink>
              )}

              <AppNavLink to="/profile" active={isActive('/profile')}>
                Profile
              </AppNavLink>

              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: 'transparent',
                  border: '2px solid #FFC107',
                  color: '#FFC107',
                  padding: '6px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginLeft: '4px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#FFC107';
                  e.currentTarget.style.color = '#111';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#FFC107';
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <AppNavLink to="/login" active={isActive('/login')}>Login</AppNavLink>
              <Link
                to="/register"
                style={{
                  backgroundColor: '#FFC107',
                  color: '#111',
                  padding: '6px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  border: '2px solid #FFC107'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#e0a800';
                  e.currentTarget.style.borderColor = '#e0a800';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#FFC107';
                  e.currentTarget.style.borderColor = '#FFC107';
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .navbar-mobile-toggle {
            display: block !important;
          }
          .navbar-links-container {
            display: ${menuOpen ? 'flex' : 'none'} !important;
            flex-direction: column;
            position: absolute;
            top: 64px;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: saturate(180%) blur(20px);
            -webkit-backdrop-filter: saturate(180%) blur(20px);
            padding: 16px 24px;
            border-bottom: 3px solid #FFC107;
            border-radius: 0 0 12px 12px;
            gap: 12px !important;
          }
          .navbar-links-container.open {
            display: flex !important;
          }
        }
      `}</style>
    </nav>

  );
};

/* Nav link for public pages (white, bold, uppercase — matches existing Landing/AboutUs/Purpose style) */
const PublicNavLink = ({ to, active, children }) => (
  <Link
    to={to}
    style={{
      color: '#222',
      textDecoration: 'none',
      fontWeight: 700,
      fontSize: '16px',
      letterSpacing: '1.5px',
      opacity: active ? 1 : 0.75,
      transition: 'opacity 0.3s',
      borderBottom: active ? '2px solid #222' : '2px solid transparent',
      paddingBottom: '4px'
    }}
    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.opacity = '0.75'; }}
  >
    {children}
  </Link>
);

/* Nav link for authenticated/app pages (dark bg style) */
const AppNavLink = ({ to, active, children }) => (
  <Link
    to={to}
    style={{
      color: active ? '#FFC107' : 'rgba(255,255,255,0.8)',
      textDecoration: 'none',
      fontSize: '0.85rem',
      fontWeight: active ? 700 : 500,
      padding: '6px 14px',
      borderRadius: '8px',
      backgroundColor: active ? 'rgba(255,193,7,0.12)' : 'transparent',
      transition: 'all 0.2s'
    }}
    onMouseEnter={e => {
      if (!active) {
        e.currentTarget.style.color = '#FFC107';
        e.currentTarget.style.backgroundColor = 'rgba(255,193,7,0.08)';
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
        e.currentTarget.style.backgroundColor = 'transparent';
      }
    }}
  >
    {children}
  </Link>
);

export default Navbar;
