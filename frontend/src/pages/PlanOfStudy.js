import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import StudentShell from "../components/student/StudentShell";

import capImg from "../assets/images/Graduation Cap Black.png";

import "./PlanOfStudy.css";

const semesterLabel = (yearLevel, semester) => {
  const ordinals = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
  const semesterNames = {
    1: "1st Semester",
    2: "2nd Semester",
    3: "Midyear",
  };

  const yearText = ordinals[yearLevel]
    ? `${ordinals[yearLevel]} Year`
    : `Year ${yearLevel}`;
  const semText = semesterNames[semester] || `Semester ${semester}`;
  return `${yearText}, ${semText}`;
};

const normalizeStatus = (course) => {
  const raw = String(course.status || "").toLowerCase();

  if (raw === "passed") return "Completed";
  if (raw === "failed") return "Failed";
  if (raw === "pending") return "In Progress";
  if (raw === "incomplete") return "In Progress";
  if (raw === "dropped" || raw === "drop") return "Dropped";
  return "In Progress";
};

const PlanOfStudy = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const availableSubjectsCount = 0;

  useEffect(() => {
    api
      .get("/users/me/dashboard")
      .then((response) => {
        if (response.data?.success) {
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
          setError("Unable to load plan of study right now.");
        }
      })
      .catch(() => {
        setError("Unable to load plan of study right now.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const semesterCards = useMemo(() => {
    const semesters = dashboardData?.semesterSummary || [];

    return semesters.map((semester, index) => {
      const courses = (semester.courses || []).map((course) => ({
        ...course,
        normalizedStatus: normalizeStatus(course),
      }));

      const units = courses.reduce(
        (sum, course) => sum + Number(course.units || 0),
        0,
      );
      const completedUnits = courses
        .filter((course) => course.normalizedStatus === "Completed")
        .reduce((sum, course) => sum + Number(course.units || 0), 0);
      const completionPercent =
        units > 0 ? Math.round((completedUnits / units) * 100) : 0;

      return {
        key: `${semester.yearLevel}-${semester.semester}-${index}`,
        title: semesterLabel(semester.yearLevel, semester.semester),
        subtitle: "August 2025 - December 2025",
        units,
        completionPercent,
        courses,
      };
    });
  }, [dashboardData]);

  const unitsCompleted = Number(dashboardData?.unitsCredited || 0);
  const totalUnits = Number(dashboardData?.totalUnits || 0);
  const unitsRemaining = Math.max(0, totalUnits - unitsCompleted);

  const estimatedGrad = useMemo(() => {
    const now = new Date();
    return `May ${now.getFullYear() + 1}`;
  }, []);

  const semestersRemaining = useMemo(() => {
    const ratio = totalUnits > 0 ? unitsRemaining / totalUnits : 0;
    return Math.max(1, Math.ceil(ratio * 8));
  }, [totalUnits, unitsRemaining]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <StudentShell
      user={user}
      onLogout={handleLogout}
      activeNav="plan"
      pageLabel="PLAN OF STUDY"
      shellClassPrefix="plan"
      subjectsBadgeCount={availableSubjectsCount}
    >
      <div className="pos-page">
            <section className="pos-hero">
              <h1>Plan of Study</h1>
              <p>Your personalized roadmap to graduation</p>
            </section>

            {loading ? (
              <section className="pos-panel pos-loading">
                Loading plan of study...
              </section>
            ) : error ? (
              <section className="pos-panel pos-error">{error}</section>
            ) : (
              <>
                <section className="pos-summary-card">
                  <img src={capImg} alt="" className="pos-summary-cap" />
                  <div className="pos-summary-review">
                    Pending Adviser Review
                  </div>
                  <span>Estimated Graduation</span>
                  <h2>{estimatedGrad}</h2>
                  <p>{semestersRemaining} semester remaining</p>

                  <div className="pos-summary-grid">
                    <article>
                      <small>Complete Units</small>
                      <strong>{unitsCompleted} units</strong>
                    </article>
                    <article>
                      <small>Remaining Units</small>
                      <strong>{unitsRemaining} units</strong>
                    </article>
                    <article>
                      <small>Total Required</small>
                      <strong>{totalUnits} units</strong>
                    </article>
                  </div>
                </section>

                <section className="pos-timeline">
                  {(semesterCards || []).map((semester, idx) => {
                    const isOpen = !!expanded[semester.key];
                    return (
                      <article key={semester.key} className="pos-semester-card">
                        <div
                          className="pos-dot"
                          style={{ top: idx === 0 ? 14 : 26 }}
                        />
                        <button
                          type="button"
                          className="pos-semester-head"
                          onClick={() => toggleExpanded(semester.key)}
                        >
                          <div>
                            <h3>{semester.title}</h3>
                            <p>{semester.subtitle}</p>
                          </div>
                          <div className="pos-semester-kpi">
                            <span>Total Units</span>
                            <strong>{semester.units}</strong>
                          </div>
                        </button>

                        <div className="pos-current-strip">
                          <div>
                            <strong>Current Semester</strong>
                            <p>
                              Input your Prelim and Midterm grades to get
                              predictions and adjust your future plan
                            </p>
                          </div>
                          <button type="button">Input Grades</button>
                        </div>

                        {isOpen && (
                          <div className="pos-courses">
                            {(semester.courses || []).map((course, i) => (
                              <div
                                key={`${semester.key}-${course.code}-${i}`}
                                className="pos-course-row"
                              >
                                <span className="pos-course-code">
                                  {course.code || "CPE 000"}
                                </span>
                                <span className="pos-course-name">
                                  {course.name || "Course title unavailable"}
                                </span>
                                <span className="pos-course-units">
                                  {course.units || 0} units
                                </span>
                                <span
                                  className={`pos-course-badge pos-course-badge--${course.normalizedStatus.toLowerCase().replace(/\s+/g, "-")}`}
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
                </section>
              </>
            )}
      </div>
    </StudentShell>
  );
};

export default PlanOfStudy;
