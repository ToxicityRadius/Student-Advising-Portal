import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Navbar positioned in the top center area */}
      <nav className="top-nav">
        <div className="nav-links">
          <Link to="/login" className="nav-link-btn">SIGN IN</Link>
          <Link to="/#purpose" className="nav-link-btn">PURPOSE</Link>
          <Link to="/#about" className="nav-link-btn">ABOUT US</Link>
        </div>
      </nav>

      <main className="hero-section">
        <div className="logo-box">
          {/* logo_sa.png must be inside the public folder */}
          <img src="/logo_sa.png" alt="Student Advising Logo" className="landing-logo" />
        </div>

        <div className="text-box">
          <span className="welcome-italic">WELCOME</span>
          <h1 className="main-title">
            TO<br />
            STUDENT<br />
            ADVISING<br />
            SYSTEM
          </h1>
        </div>
      </main>
    </div>
  );
};

export default Landing;
