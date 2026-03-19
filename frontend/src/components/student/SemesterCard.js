import React from "react";
import { getSemesterTone } from "../../utils/gradeHelpers";

const SemesterCard = ({ semester, isOpen, onToggle }) => {
  const tone = getSemesterTone(semester.gpa);

  return (
    <article
      key={semester.key}
      className={`grades-panel grades-semester-card grades-semester-card--${tone}`}
    >
      <button
        type="button"
        className={`grades-semester-summary ${isOpen ? "is-open" : ""}`}
        onClick={onToggle}
      >
        <div className="grades-semester-meta">
          <h3>{semester.title}</h3>
          <p>{semester.subtitle}</p>
        </div>

        <div className="grades-semester-kpis">
          <div>
            <strong>{semester.units}</strong>
            <span>Units</span>
          </div>
          <div>
            <strong>{semester.subjects}</strong>
            <span>Subjects</span>
          </div>
          <div>
            <strong>{semester.gpa}</strong>
            <span>GPA</span>
          </div>
          <div className={`grades-chevron ${isOpen ? "is-open" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="grades-courses-list">
          <div className="grades-courses-head">
            <span>Course Code</span>
            <span>Course Title</span>
            <span>Units</span>
            <span>Grade</span>
            <span>Status</span>
          </div>

          {semester.filteredCourses.map((course, index) => (
            <div
              key={`${course.code}-${index}`}
              className={`grades-course-row grades-course-row--${tone}`}
            >
              <div className="grades-course-code">
                <strong>{course.code || "COURSE"}</strong>
              </div>
              <div className="grades-course-title">
                {course.name || "Course title unavailable"}
              </div>
              <div className="grades-course-units">
                {course.units || 0}
              </div>
              <div className="grades-course-grade">
                <span className={`grades-pill grades-pill--${tone}`}>
                  {course.grade || "-"}
                </span>
              </div>
              <div className="grades-course-status">
                <span className={`grades-pill grades-pill--${tone}`}>
                  {course.normalizedStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

export default SemesterCard;
