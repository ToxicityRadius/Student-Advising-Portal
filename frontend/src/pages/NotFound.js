import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const homeHref = isAuthenticated ? '/dashboard' : '/';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        background: '#f5f5f5',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '6rem', fontWeight: 800, color: '#FFC107', margin: 0,lineHeight: 1 }}>404</h1>
      <h2 style={{ fontWeight: 700, color: '#222', marginTop: '1rem' }}>Page Not Found</h2>
      <p style={{ color: '#666', maxWidth: '420px', marginTop: '0.5rem' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '0.6rem 1.4rem',
            borderRadius: '8px',
            border: '2px solid #FFC107',
            background: 'transparent',
            color: '#333',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Go Back
        </button>
        <Link
          to={homeHref}
          style={{
            padding: '0.6rem 1.4rem',
            borderRadius: '8px',
            background: '#FFC107',
            color: '#000',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
