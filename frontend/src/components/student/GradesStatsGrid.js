import React from "react";

const GradesStatsGrid = ({
  gwa,
  unitsEarned,
  totalUnits,
  progressPercent,
  subjectsTaken,
  passedSubjects,
  failedSubjects,
}) => (
  <section className="grades-stats-grid">
    <article className="grades-stat-card grades-stat-card--gpa">
      <span>Current GWA</span>
      <h2>{gwa}</h2>
      <p>General Weighted Average</p>
    </article>

    <article className="grades-stat-card grades-stat-card--units">
      <span>Units Earned</span>
      <h2>{unitsEarned}</h2>
      <p>Out of {totalUnits || 0} total units</p>
      <div className="grades-progress-row">
        <small>Progress to Graduation</small>
        <strong>{progressPercent}%</strong>
      </div>
      <div className="grades-progress-track">
        <div style={{ width: `${progressPercent}%` }} />
      </div>
    </article>

    <article className="grades-stat-card grades-stat-card--subjects">
      <span>Subjects Taken</span>
      <h2>{subjectsTaken}</h2>
      <p>Total subjects enrolled</p>
      <div className="grades-subject-bars">
        <div>
          <label>Passed</label>
          <div className="grades-progress-track grades-progress-track--pass">
            <div
              style={{
                width: `${subjectsTaken ? Math.round((passedSubjects / subjectsTaken) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
        <div>
          <label>Failed</label>
          <div className="grades-progress-track grades-progress-track--fail">
            <div
              style={{
                width: `${subjectsTaken ? Math.round((failedSubjects / subjectsTaken) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="grades-legend">
        <span>{passedSubjects} Passed</span>
        <span>{failedSubjects} Failed</span>
      </div>
    </article>
  </section>
);

export default GradesStatsGrid;
