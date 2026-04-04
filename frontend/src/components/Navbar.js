import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoutConfirmModal from './LogoutConfirmModal';
import './Navbar.css';

const roleQuickLinks = {
  student: [],
  adviser: [{ to: '/adviser/students', label: 'Student Records' }],
  admin: [
    { to: '/adviser/students', label: 'Student Records' },
    { to: '/admin/curriculum', label: 'Curriculum' },
    { to: '/admin/forecast', label: 'Forecasting' },
    { to: '/admin/terms', label: 'Terms' },
  ],
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path) => location.pathname === path;
  const quickLinks = user?.role ? roleQuickLinks[user.role] || [] : [];

  // Determine if we're on a public page (home, about, purpose) or authenticated page
  const isPublicPage = ['/', '/about', '/purpose', '/login', '/register'].includes(
    location.pathname,
  );

  return (
    <nav
      className={`navbar ${isPublicPage ? 'navbar--public' : 'navbar--app'}`}
      aria-label="Main navigation"
    >
      <div
        className={`navbar__inner ${isPublicPage ? 'navbar__inner--public' : 'navbar__inner--app'}`}
      >
        {/* Brand - only shown on authenticated pages */}
        {!isPublicPage && (
          <Link to="/" className="navbar__brand">
            <span className="navbar__brand-text">Student Advising</span>
          </Link>
        )}

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`navbar-mobile-toggle ${isPublicPage ? 'navbar-mobile-toggle--public' : ''}`}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Nav links */}
        <div
          className={`navbar-links-container ${isPublicPage ? 'navbar-links-container--public' : 'navbar-links-container--app'} ${menuOpen ? 'open' : ''}`}
        >
          {isPublicPage ? (
            <>
              <PublicNavLink to="/" active={isActive('/')}>
                HOME
              </PublicNavLink>
              <PublicNavLink to="/login" active={isActive('/login') || isActive('/register')}>
                SIGN IN
              </PublicNavLink>
              <PublicNavLink to="/purpose" active={isActive('/purpose')}>
                PURPOSE
              </PublicNavLink>
              <PublicNavLink to="/about" active={isActive('/about')}>
                ABOUT US
              </PublicNavLink>
            </>
          ) : user ? (
            <>
              <span className="navbar__welcome">
                Welcome,{' '}
                <strong className="navbar__welcome-name">
                  {user.firstName || user.first_name}
                </strong>
              </span>

              <AppNavLink to="/dashboard" active={isActive('/dashboard')}>
                Dashboard
              </AppNavLink>

              <AppNavLink to="/profile" active={isActive('/profile')}>
                Profile
              </AppNavLink>

              {quickLinks.length > 0 && (
                <div className="navbar__quicklinks">
                  <span className="navbar__quicklinks-label">Quicklinks:</span>
                  {quickLinks.map((item) => (
                    <AppNavLink key={item.to} to={item.to} active={isActive(item.to)}>
                      {item.label}
                    </AppNavLink>
                  ))}
                </div>
              )}

              <button onClick={() => setShowLogoutConfirm(true)} className="navbar__logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <AppNavLink to="/login" active={isActive('/login')}>
                Login
              </AppNavLink>
              <Link to="/register" className="navbar__register-btn">
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      <LogoutConfirmModal
        show={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </nav>
  );
};

/* Nav link for public pages (white, bold, uppercase — matches existing Landing/AboutUs/Purpose style) */
const PublicNavLink = ({ to, active, children }) => (
  <Link to={to} className={`public-nav-link ${active ? 'public-nav-link--active' : ''}`}>
    {children}
  </Link>
);

/* Nav link for authenticated/app pages (dark bg style) */
const AppNavLink = ({ to, active, children }) => (
  <Link to={to} className={`app-nav-link ${active ? 'app-nav-link--active' : ''}`}>
    {children}
  </Link>
);

export default Navbar;
