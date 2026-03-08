import React, { useState, useRef, useEffect } from 'react';
import './AboutUs.css';

const developers = [
  { name: 'Developer 1', role: 'Full Stack Developer', photo: '' },
  { name: 'Developer 2', role: 'Frontend Developer', photo: '' },
  { name: 'Developer 3', role: 'Backend Developer', photo: '' },
  { name: 'Developer 4', role: 'UI/UX Designer', photo: '' },
  { name: 'Developer 5', role: 'Database Engineer', photo: '' },
  { name: 'Developer 6', role: 'Project Manager', photo: '' },
];

const AboutUs = () => {
  const [rawIndex, setRawIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const totalCards = developers.length;
  const copies = 7;
  const extendedDevs = Array.from({ length: copies }, () => developers).flat();
  const baseOffset = totalCards * Math.floor(copies / 2);
  const currentOffset = baseOffset + rawIndex;

  const handlePrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setRawIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setRawIndex((prev) => prev + 1);
  };

  const trackRef = useRef(null);
  const [noTransition, setNoTransition] = useState(false);

  // Unlock after each transition ends
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);

      // Silently reset if we've drifted too far
      if (Math.abs(rawIndex) >= totalCards) {
        setNoTransition(true);
        setRawIndex((prev) => ((prev % totalCards) + totalCards) % totalCards);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setNoTransition(false);
          });
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [rawIndex, totalCards]);

  // Drag handlers
  const handleMouseDown = (e) => {
    if (isAnimating) return;
    isDragging.current = true;
    startX.current = e.pageX;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || isAnimating) return;
    e.preventDefault();
    const diff = e.pageX - startX.current;
    if (Math.abs(diff) > 80) {
      diff > 0 ? handlePrev() : handleNext();
      isDragging.current = false;
    }
  };

  const handleMouseUp = () => { isDragging.current = false; };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (isAnimating) return;
    isDragging.current = true;
    startX.current = e.touches[0].pageX;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || isAnimating) return;
    const diff = e.touches[0].pageX - startX.current;
    if (Math.abs(diff) > 60) {
      diff > 0 ? handlePrev() : handleNext();
      isDragging.current = false;
    }
  };

  const handleTouchEnd = () => { isDragging.current = false; };

  // The middle visible card is at currentOffset + 1
  const centerIndex = currentOffset + 1;
  const cardWidthPercent = 100 / 3; // each card is 1/3 of viewport
  const translateX = -(currentOffset * cardWidthPercent) + '%';

  return (
    <div className="about-page">

      <h2 className="about-title">MEET THE DEVELOPERS</h2>

      <div className="carousel-container">
        <button className="carousel-arrow carousel-arrow-left" onClick={handlePrev}>
          <span>&#9664;</span>
        </button>

        <div className="carousel-viewport">
          <div
            className={`carousel-track ${noTransition ? 'no-transition' : ''}`}
            ref={trackRef}
            style={{ transform: `translateX(${translateX})` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {extendedDevs.map((dev, i) => (
              <div
                className={`dev-card ${i === centerIndex ? 'dev-card-center' : 'dev-card-side'}`}
                key={i}
              >
                <div className="dev-photo">
                  {dev.photo ? (
                    <img src={dev.photo} alt={dev.name} />
                  ) : (
                    <div className="dev-photo-placeholder" />
                  )}
                </div>
                <h3 className="dev-name">{dev.name}</h3>
                <p className="dev-role">{dev.role}</p>
              </div>
            ))}
          </div>
        </div>

        <button className="carousel-arrow carousel-arrow-right" onClick={handleNext}>
          <span>&#9654;</span>
        </button>
      </div>

      <div className="about-footer-logo">
        <img src="/logo_sa.png" alt="Student Advising Logo" className="footer-logo-img" />
      </div>
    </div>
  );
};

export default AboutUs;
