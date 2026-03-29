import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const features = [
  {
    icon: '\u{1F4CB}',
    title: 'Curriculum Checklist',
    desc: 'Track your academic progress against your curriculum requirements in real time.',
  },
  {
    icon: '\u{1F4CA}',
    title: 'Grade Tracking',
    desc: 'View and monitor your grades across all terms with detailed analytics.',
  },
  {
    icon: '\u{1F4C5}',
    title: 'Study Plan Builder',
    desc: 'Plan your future terms with an intelligent course scheduling assistant.',
  },
  {
    icon: '\u{1F91D}',
    title: 'Adviser Connection',
    desc: 'Connect directly with your academic adviser for guidance and approvals.',
  },
];

const Landing = () => {
  const sectionsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    const current = sectionsRef.current;
    current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const addRef = (el) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__content">
          <div className="landing-hero__logo-wrap">
            <img
              src="/logo_sa.png"
              alt="Student Advising Logo"
              className="landing-hero__logo"
            />
          </div>
          <div className="landing-hero__text">
            <span className="landing-hero__welcome">Welcome to</span>
            <h1 className="landing-hero__title">
              Student<br />Advising<br />System
            </h1>
            <p className="landing-hero__subtitle">
              Your academic journey, guided with purpose.
            </p>
          </div>
        </div>
        <div className="landing-hero__scroll-hint">
          <span>Scroll to explore</span>
          <div className="landing-hero__chevron" />
        </div>
      </section>

      {/* Features */}
      <section className="landing-features" ref={addRef}>
        <h2 className="landing-features__heading">What We Offer</h2>
        <div className="landing-features__grid">
          {features.map((f, i) => (
            <div
              className="landing-feature-card"
              key={i}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <span className="landing-feature-card__icon">{f.icon}</span>
              <h3 className="landing-feature-card__title">{f.title}</h3>
              <p className="landing-feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta" ref={addRef}>
        <h2 className="landing-cta__heading">Ready to get started?</h2>
        <p className="landing-cta__sub">
          Sign in to access your academic dashboard or create a new account.
        </p>
        <div className="landing-cta__actions">
          <Link to="/login" className="landing-cta__btn landing-cta__btn--primary">
            Sign In
          </Link>
          <Link to="/register" className="landing-cta__btn landing-cta__btn--secondary">
            Create Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
