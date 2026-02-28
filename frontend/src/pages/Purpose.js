import React from 'react';
import { Link } from 'react-router-dom';
import './Purpose.css';

const Purpose = () => {
  return (
    <div className="purpose-page">
      <nav className="top-nav">
        <div className="nav-links">
          <Link to="/" className="nav-link-btn">HOME</Link>
          <Link to="/login" className="nav-link-btn">SIGN IN</Link>
          <Link to="/purpose" className="nav-link-btn nav-link-active">PURPOSE</Link>
          <Link to="/about" className="nav-link-btn">ABOUT US</Link>
        </div>
      </nav>

      <div className="purpose-content">
        <h2 className="purpose-title">OUR PURPOSE</h2>
        <div className="purpose-card">
          <p>
            The <strong>Student Advising System</strong> is designed to streamline and enhance
            the academic advising process between students and faculty. Our platform provides
            a centralized hub where students can easily connect with their advisors, schedule
            consultations, and receive guidance on their academic journey.
          </p>
          <p>
            We aim to bridge the communication gap between students and faculty advisors,
            ensuring that every student has access to the support they need to succeed
            in their academic pursuits.
          </p>
        </div>
      </div>

      <div className="purpose-footer-logo">
        <img src="/logo_sa.png" alt="Student Advising Logo" className="footer-logo-img" />
      </div>
    </div>
  );
};

export default Purpose;
