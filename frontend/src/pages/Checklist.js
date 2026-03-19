import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import StudentLayout from "../components/student/StudentLayout";

import boxCheckImg from "../assets/images/Box Check.png";
import failedImg from "../assets/images/Failed.png";
import pendingImg from "../assets/images/Hourglass Pending.png";
import creditedImg from "../assets/images/Credited.png";

import "./Checklist.css";

const semesterLabel = (yearLevel, semester) => {
  const ordinals = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
  const semesterNames = {
    1: "1st Semester",
    2: "2nd Semester",
    3: "Summer",
  };

  const yearText = ordinals[yearLevel]
    ? `${ordinals[yearLevel]} Year`
    : `Year ${yearLevel}`;
  const semText = semesterNames[semester] || `Semester ${semester}`;
  return `${yearText}, ${semText}`;
};

const normalizeStatus = (course) => {
  const raw = String(course.status || "").toLowerCase();

  if (raw === "completed" || raw === "passed") return "Completed";
  if (raw === "credited") return "Completed";
  if (raw === "failed") return "Failed";
  if (raw === "ongoing") return "In Progress";
  if (raw === "incomplete") return "Incomplete";
  if (raw === "dropped" || raw === "drop") return "Failed";
  if (raw === "not yet taken") return "Not Yet Taken";

  const gradeNumber = Number.parseFloat(course.grade);
  if (Number.isFinite(gradeNumber)) {
    return gradeNumber <= 3 ? "Completed" : "Failed";
  }

  return "Pending";
};

const programMajorTitle = (program) => {
  const map = {
    BSCpE: "Computer Engineering",
    BSCS: "Computer Science",
    BSIT: "Information Technology",
    BSCE: "Civil Engineering",
    BSEE: "Electrical Engineering",
    BSME: "Mechanical Engineering",
  };

  const label = map[program] || "Program";
  return `${label} Major Subjects`;
};

const Checklist = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [program, setProgram] = useState("");
  const availableSubjectsCount = 0;

  const loadChecklist = useCallback(() => {
    setLoading(true);
    setError("");

    api
      .get("/users/me/dashboard")
      .then((response) => {
        if (response.data?.success) {
          setProgram(response.data.data?.program || "");
          setDashboardData(
            response.data.data || {
              gwa: null,
              unitsCredited: 0,
              totalUnits: 0,
              subjectsCompleted: 0,
              subjectsPending: 0,
              semesterSummary: [],
            },
          );
        } else {
          setError("Unable to load checklist right now.");
        }
      })
      .catch(() => {
        setError("Unable to load checklist right now.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const semesterCards = useMemo(() => {
    const semesters = dashboardData?.semesterSummary || [];

    return semesters.map((semester, index) => {
      const courses = (semester.courses || []).map((course) => ({
        ...course,
        normalizedStatus: normalizeStatus(course),
      }));

      const completed = courses.filter(
        (course) => course.normalizedStatus === "Completed",
      ).length;
      const failed = courses.filter(
        (course) => course.normalizedStatus === "Failed",
      ).length;
      const inProgress = courses.filter(
        (course) => course.normalizedStatus === "In Progress",
      ).length;
      const credited = courses.filter(
        (course) => !!course.grade && course.normalizedStatus === "Completed",
      ).length;

      const completionPercent = courses.length
        ? Math.round((completed / courses.length) * 100)
        : 0;

      return {
        key: `${semester.yearLevel}-${semester.semester}-${index}`,
        title: `${program ? `${program} ` : ""}${semesterLabel(semester.yearLevel, semester.semester)}`,
        subtitle: "Core courses and specializations",
        completed,
        failed,
        inProgress,
        credited,
        total: courses.length,
        completionPercent,
        unitsTaken: courses.reduce(
          (sum, course) => sum + Number(course.units || 0),
          0,
        ),
        courses,
      };
    });
  }, [dashboardData, program]);

  const stats = useMemo(() => {
    const courses = semesterCards.flatMap((card) => card.courses);
    const completed = courses.filter(
      (course) => course.normalizedStatus === "Completed",
    ).length;
    const failed = courses.filter(
      (course) => course.normalizedStatus === "Failed",
    ).length;
    const inProgress = courses.filter(
      (course) => course.normalizedStatus === "In Progress",
    ).length;

    const total = courses.length;
    const remaining = Math.max(0, total - completed - failed - inProgress);

    const completedUnits = courses
      .filter((course) => course.normalizedStatus === "Completed")
      .reduce((sum, course) => sum + Number(course.units || 0), 0);
    const totalUnits = courses.reduce(
      (sum, course) => sum + Number(course.units || 0), 0);
    const completionPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

    return {
      completed,
      failed,
      inProgress,
      remaining,
      completionPercent,
      total,
    };
  }, [semesterCards]);

  const allChecklistCourses = useMemo(
    () => semesterCards.flatMap((card) => card.courses || []),
    [semesterCards],
  );

  const majorCard = useMemo(() => {
    const completedUnits = allChecklistCourses
      .filter((course) => course.normalizedStatus === "Completed")
      .reduce((sum, course) => sum + Number(course.units || 0), 0);

    const totalUnits = allChecklistCourses.reduce(
      (sum, course) => sum + Number(course.units || 0),
      0,
    );

    const completionPercent =
      totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

    const majorCode = (program || "").replace(/^BS/i, "");

    return {
      key: "major-subjects",
      title: programMajorTitle(program),
      subtitle: majorCode
        ? `Core ${majorCode} courses and specializations`
        : "Core courses and specializations",
      completedUnits,
      totalUnits,
      completionPercent,
      courses: allChecklistCourses,
    };
  }, [allChecklistCourses, program]);

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <StudentLayout
      activePage="checklist"
      pageTitle="Checklist"
      availableSubjectsCount={availableSubjectsCount}
    >
          <div className="checklist-page">
            <section className="checklist-hero">
              <h1>Curriculum Checklist</h1>
              <p>Track your progress toward degree completion</p>
            </section>

            {loading ? (
              <section className="checklist-panel checklist-loading">
                Loading checklist...
              </section>
            ) : error ? (
              <section className="checklist-panel checklist-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={loadChecklist} className="btn btn-warning btn-sm mt-2">
                  Retry
                </button>
              </section>
            ) : (
              <>
                <section className="checklist-overall-card">
                  <div className="checklist-overall-head">
                    <h2>Overall Completion</h2>
                    <strong>{stats.completionPercent}%</strong>
                  </div>
                  <div className="checklist-overall-progress">
                    <div style={{ width: `${stats.completionPercent}%` }} />
                  </div>
                  <div className="checklist-overall-grid">
                    <article>
                      <span>Completed</span>
                      <h3>{stats.completed}</h3>
                      <p>subjects passed</p>
                    </article>
                    <article>
                      <span>In Progress</span>
                      <h3>{stats.inProgress}</h3>
                      <p>currently enrolled</p>
                    </article>
                    <article>
                      <span>Remaining</span>
                      <h3>{stats.remaining}</h3>
                      <p>subjects left</p>
                    </article>
                    <article>
                      <span>Failed</span>
                      <h3>{stats.failed}</h3>
                      <p>need retake</p>
                    </article>
                  </div>
                </section>

                <section className="checklist-panel checklist-legend">
                  <h3>Status Legend</h3>
                  <div className="checklist-legend-items">
                    <span>
                      <img src={boxCheckImg} alt="" /> Completed
                    </span>
                    <span>
                      <img src={failedImg} alt="" /> Failed
                    </span>
                    <span>
                      <img src={pendingImg} alt="" /> In Progress
                    </span>
                    <span>
                      <span className="legend-dot" /> Not Yet Taken
                    </span>
                    <span>
                      <img src={creditedImg} alt="" /> Credited
                    </span>
                  </div>
                </section>

                <section className="checklist-groups">
                  {semesterCards.length === 0 && majorCard.courses.length === 0 && (
                    <section className="checklist-panel checklist-empty">
                      No checklist records found yet.
                    </section>
                  )}

                  {semesterCards.map((semester) => {
                    const isOpen = !!expanded[semester.key];

                    return (
                      <article
                        key={semester.key}
                        className="checklist-panel checklist-group"
                      >
                        <button
                          type="button"
                          className="checklist-group-head"
                          onClick={() => toggleExpanded(semester.key)}
                        >
                          <div className="checklist-group-meta">
                            <h4>{semester.title}</h4>
                            <p>{semester.subtitle}</p>
                          </div>
                          <div className="checklist-group-kpis">
                            <div>
                              <strong>
                                {semester.unitsTaken}/{semester.unitsTaken}
                              </strong>
                              <span>Units</span>
                            </div>
                            <div>
                              <strong>{semester.completionPercent}%</strong>
                              <span>Complete</span>
                              <div className="checklist-mini-bar">
                                <div
                                  style={{
                                    width: `${semester.completionPercent}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div
                              className={`checklist-arrow ${isOpen ? "is-open" : ""}`}
                            />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="checklist-courses">
                            {(semester.courses || []).map((course, idx) => (
                              <div
                                key={`${semester.key}-${course.code}-${idx}`}
                                className={`checklist-course-row${course.normalizedStatus === "Not Yet Taken" || course.normalizedStatus === "Pending" ? " checklist-course-row--greyed" : ""}`}
                              >
                                <div>
                                  <strong>{course.code || "COURSE"}</strong>
                                  <span>
                                    {course.name || "Course title unavailable"}
                                  </span>
                                </div>
                                <span>{course.units || 0} Units</span>
                                <span
                                  className={`status-pill status-pill--${course.normalizedStatus.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {course.normalizedStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}

                  <article className="checklist-panel checklist-group">
                    <button
                      type="button"
                      className="checklist-group-head"
                      onClick={() => toggleExpanded(majorCard.key)}
                    >
                      <div className="checklist-group-meta">
                        <h4>{majorCard.title}</h4>
                        <p>{majorCard.subtitle}</p>
                      </div>
                      <div className="checklist-group-kpis">
                        <div>
                          <strong>
                            {majorCard.completedUnits}/{majorCard.totalUnits}
                          </strong>
                          <span>Units</span>
                        </div>
                        <div>
                          <strong>{majorCard.completionPercent}%</strong>
                          <span>Complete</span>
                          <div className="checklist-mini-bar">
                            <div
                              style={{
                                width: `${majorCard.completionPercent}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className={`checklist-arrow ${expanded[majorCard.key] ? "is-open" : ""}`}
                        />
                      </div>
                    </button>

                    {expanded[majorCard.key] && (
                      <div className="checklist-courses">
                        {majorCard.courses.length === 0 && (
                          <div className="checklist-course-row checklist-course-row--greyed">
                            <div>
                              <strong>No major subjects yet</strong>
                              <span>
                                Once courses are available, they will appear
                                here.
                              </span>
                            </div>
                            <span>0 Units</span>
                            <span className="status-pill status-pill--not-yet-taken">
                              Not Yet Taken
                            </span>
                          </div>
                        )}

                        {majorCard.courses.map((course, idx) => (
                          <div
                            key={`${majorCard.key}-${course.code}-${idx}`}
                            className={`checklist-course-row${course.normalizedStatus === "Not Yet Taken" || course.normalizedStatus === "Pending" ? " checklist-course-row--greyed" : ""}`}
                          >
                            <div>
                              <strong>{course.code || "COURSE"}</strong>
                              <span>
                                {course.name || "Course title unavailable"}
                              </span>
                            </div>
                            <span>{course.units || 0} Units</span>
                            <span
                              className={`status-pill status-pill--${course.normalizedStatus.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              {course.normalizedStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </section>
              </>
            )}
          </div>
    </StudentLayout>
  );
};

export default Checklist;
