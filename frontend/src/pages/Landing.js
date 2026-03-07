import React from 'react';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">

      <main className="hero-section">
        <div className="logo-box">
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
