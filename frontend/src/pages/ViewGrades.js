import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import logo from "../assets/images/STUDENT ADVISING LOGO 1.png";
import bellIconImg from "../assets/images/Bell White Gradient.png";
import boxCheckImg from "../assets/images/Box Check.png";
import boxUncheckImg from "../assets/images/Box Uncheck.png";
import goldHomePageImg from "../assets/images/Gold HomePage.png";
import goldBookImg from "../assets/images/Gold book.png";
import goldPlanImg from "../assets/images/Gold Plan of Study.png";
import goldGradesImg from "../assets/images/Gold Grades.png";
import goldChecklistImg from "../assets/images/Gold Checklist.png";
import goldUserImg from "../assets/images/Gold User.png";
import goldBellImg from "../assets/images/Gold Bell Gradient.png";
import goldSettingsImg from "../assets/images/Gold Settings.png";
import goldHelpImg from "../assets/images/Gold Help & Support.png";
import goldLogoutImg from "../assets/images/Gold Logout.png";
import "./ViewGrades.css";

const STATUS_FILTERS = ["All", "Passed", "Failed", "INC", "DRP", "In Progress"];
const YELLOW = "#FFC107";
const SIDEBAR_W = 240;

const formatYearLevel = (level) => {
  const map = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
  const n = parseInt(level, 10);
  return map[n] ? `${map[n]} Year` : `${level} Year`;
};

const SideNavItem = ({ icon, label, to, active, badge }) => (
  <Link
    to={to}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 16px",
      textDecoration: "none",
      backgroundColor: "transparent",
      color: "#444",
      fontSize: "0.9rem",
      fontWeight: active ? 700 : 600,
      borderLeft: active ? `4px solid ${YELLOW}` : "4px solid transparent",
      transition: "background-color 0.15s, box-shadow 0.15s, color 0.15s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = YELLOW;
      e.currentTarget.style.boxShadow = "0 0 12px rgba(255,193,7,0.6)";
      e.currentTarget.style.color = "#fff";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.color = "#555";
    }}
  >
    <span
      style={{
        width: 20,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge && (
      <span
        style={{
          background: "#e53935",
          color: "#fff",
          borderRadius: "50%",
          width: 18,
          height: 18,
          fontSize: "0.62rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {badge}
      </span>
    )}
  </Link>
);

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

  if (raw === "passed") return "Passed";
  if (raw === "failed") return "Failed";
  if (raw === "pending") return "In Progress";
  if (raw === "incomplete") return "INC";
  if (raw === "dropped" || raw === "drop") return "DRP";

  const gradeNumber = Number.parseFloat(course.grade);
  if (Number.isFinite(gradeNumber)) {
    return gradeNumber <= 3 ? "Passed" : "Failed";
  }

  return "In Progress";
};

const semesterGwa = (courses) => {
  const numericGrades = courses
    .map((course) => Number.parseFloat(course.grade))
    .filter((grade) => Number.isFinite(grade));

  if (!numericGrades.length) return "-";
  const total = numericGrades.reduce((sum, grade) => sum + grade, 0);
  return (total / numericGrades.length).toFixed(2);
};

const getSemesterTone = (gpaValue) => {
  if (gpaValue === "-") return "pending";

  const parsed = Number.parseFloat(gpaValue);
  if (!Number.isFinite(parsed)) return "pending";

  return parsed > 3 ? "failed" : "passed";
};

const ViewGrades = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const notifRef = useRef(null);

  const firstName = user?.firstName || user?.first_name || "";
  const lastName = user?.lastName || user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Student";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "ST";
  const studentId = user?.student_id || user?.studentId || "No ID";
  const yearLevel = user?.year_level || user?.yearLevel || "";
  const program = user?.program || "";
  const studentType = user?.student_type || user?.studentType || "";

  const notifications = [];
  const notifCount = notifications.length;
  const availableSubjectsCount = 0;

  const imgIcon = (src, size = 22) => (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 780) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
          setError("Unable to load grades right now.");
        }
      })
      .catch(() => {
        setError("Unable to load grades right now.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const enrichedSemesters = useMemo(() => {
    const semesters = dashboardData?.semesterSummary || [];

    return semesters.map((semester, index) => {
      const courses = (semester.courses || []).map((course) => ({
        ...course,
        normalizedStatus: normalizeStatus(course),
      }));

      const passedCount = courses.filter(
        (course) => course.normalizedStatus === "Passed",
      ).length;
      const failedCount = courses.filter(
        (course) => course.normalizedStatus === "Failed",
      ).length;

      return {
        key: `${semester.yearLevel}-${semester.semester}-${index}`,
        title: semesterLabel(semester.yearLevel, semester.semester),
        subtitle: semester.status || "Academic Term",
        units: courses.reduce(
          (sum, course) => sum + Number(course.units || 0),
          0,
        ),
        subjects: courses.length,
        gpa: semesterGwa(courses),
        passedCount,
        failedCount,
        courses,
      };
    });
  }, [dashboardData]);

  const allCourses = useMemo(
    () => enrichedSemesters.flatMap((semester) => semester.courses),
    [enrichedSemesters],
  );

  const filteredSemesters = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enrichedSemesters
      .map((semester) => {
        const courses = semester.courses.filter((course) => {
          const matchesStatus =
            statusFilter === "All" || course.normalizedStatus === statusFilter;
          const matchesQuery =
            !query ||
            course.code?.toLowerCase().includes(query) ||
            course.name?.toLowerCase().includes(query);
          return matchesStatus && matchesQuery;
        });

        return {
          ...semester,
          filteredCourses: courses,
        };
      })
      .filter(
        (semester) =>
          semester.filteredCourses.length > 0 || statusFilter === "All",
      );
  }, [enrichedSemesters, search, statusFilter]);

  const subjectsTaken = allCourses.length;
  const passedSubjects = allCourses.filter(
    (course) => course.normalizedStatus === "Passed",
  ).length;
  const failedSubjects = allCourses.filter(
    (course) => course.normalizedStatus === "Failed",
  ).length;
  const unitsEarned = Number(dashboardData?.unitsCredited || 0);
  const totalUnits = Number(dashboardData?.totalUnits || 0);
  const progressPercent =
    totalUnits > 0
      ? Math.min(100, Math.round((unitsEarned / totalUnits) * 100))
      : 0;
  const gwa = dashboardData?.gwa || "--";

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
        background: "#f5f5f5",
      }}
    >
      <aside
        className={`grades-sidebar ${mobileMenuOpen ? "open" : ""}`}
        style={{
          width: SIDEBAR_W,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #ebebeb",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          overflowY: "auto",
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "24px 20px 20px",
            textAlign: "center",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: YELLOW,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: 900,
              color: "#222",
              overflow: "hidden",
              flexShrink: 0,
              marginBottom: 12,
              boxShadow: "0 0 0 3px #fff, 0 0 0 5px " + YELLOW,
            }}
          >
            {user?.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              color: "#111",
              marginBottom: 4,
              lineHeight: 1.3,
              textAlign: "center",
            }}
          >
            {fullName}
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              color: "#888",
              fontWeight: 600,
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            {studentId}
          </div>

          {(() => {
            const Tag = ({ label }) => (
              <span
                style={{
                  background: YELLOW,
                  color: "#333",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "5px 0",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  flex: "1 1 0",
                }}
              >
                {label}
              </span>
            );

            const roleLabel = user?.role
              ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
              : null;
            const row2Left = studentType || roleLabel || "";
            const row2Right = program || "";

            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                  width: "100%",
                }}
              >
                {yearLevel ? (
                  <Tag label={formatYearLevel(yearLevel)} />
                ) : (
                  <Tag label="—" />
                )}
                <Tag label="1st Semester" />
                {row2Left ? <Tag label={row2Left} /> : <span />}
                {row2Right ? <Tag label={row2Right} /> : <span />}
              </div>
            );
          })()}
        </div>

        <nav style={{ flex: 1, paddingTop: 8 }}>
          <div
            style={{
              padding: "10px 16px 6px",
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#bbb",
              letterSpacing: 1.5,
            }}
          >
            MAIN
          </div>
          <SideNavItem
            icon={imgIcon(goldHomePageImg)}
            label="Dashboard"
            to="/dashboard"
          />
          <SideNavItem
            icon={imgIcon(goldBookImg)}
            label="Available Subjects"
            to="/subjects"
            badge={
              availableSubjectsCount > 0 ? availableSubjectsCount : undefined
            }
          />
          <SideNavItem
            icon={imgIcon(goldPlanImg)}
            label="Plan of Study"
            to="/plan-of-study"
          />
          <SideNavItem
            active
            icon={imgIcon(goldGradesImg)}
            label="View Grades"
            to="/grades"
          />
          <SideNavItem
            icon={imgIcon(goldChecklistImg)}
            label="Checklist"
            to="/checklist"
          />

          <div
            style={{
              padding: "14px 16px 6px",
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#bbb",
              letterSpacing: 1.5,
            }}
          >
            ACCOUNT
          </div>
          <SideNavItem
            icon={imgIcon(goldUserImg)}
            label="Profile"
            to="/profile"
          />
          <SideNavItem
            icon={imgIcon(goldBellImg)}
            label="Notifications"
            to="/notifications"
            badge={notifCount > 0 ? notifCount : undefined}
          />
          <SideNavItem
            icon={imgIcon(goldSettingsImg)}
            label="Settings"
            to="/settings"
          />
          <SideNavItem
            icon={imgIcon(goldHelpImg)}
            label="Help & Support"
            to="/help"
          />

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#444",
              fontSize: "0.9rem",
              fontWeight: 600,
              borderLeft: "4px solid transparent",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = YELLOW;
              e.currentTarget.style.boxShadow = "0 0 12px rgba(255,193,7,0.6)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.color = "#555";
            }}
          >
            <span
              style={{
                width: 20,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {imgIcon(goldLogoutImg)}
            </span>
            <span>Logout</span>
          </button>
        </nav>

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #f0f0f0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.63rem",
              color: "#ccc",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            TIP Student Advising System
            <br />
            v1.0.0 | © 2025
          </p>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          className="grades-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <div
        className="grades-main-shell"
        style={{
          flex: 1,
          marginLeft: SIDEBAR_W,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <header
          className="grades-topbar"
          style={{
            background: YELLOW,
            height: 70,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <button
              type="button"
              className="grades-mobile-menu-btn"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 7H20M4 12H20M4 17H20"
                  stroke="#222"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <img
              src={logo}
              alt="Student Advising"
              style={{ height: 46, objectFit: "contain" }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <Link
                to="/"
                style={{
                  textDecoration: "none",
                  color: "rgba(0,0,0,0.55)",
                  fontWeight: 600,
                }}
              >
                HOME
              </Link>
              <span style={{ color: "rgba(0,0,0,0.4)", margin: "0 2px" }}>
                ›
              </span>
              <span style={{ color: "#111", fontWeight: 800 }}>
                View Grades
              </span>
            </div>
          </div>

          <div ref={notifRef} style={{ position: "relative" }}>
            <div
              style={{
                position: "relative",
                padding: 10,
                cursor: "pointer",
                borderRadius: 10,
                transition: "background-color 0.15s, opacity 0.15s",
              }}
              onClick={() => setNotifOpen((o) => !o)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.18)";
                e.currentTarget.style.opacity = "0.82";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.opacity = "1";
              }}
            >
              <img
                src={bellIconImg}
                alt="Notifications"
                style={{
                  width: 32,
                  height: 32,
                  objectFit: "contain",
                  display: "block",
                }}
              />
              {notifCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "#e53935",
                    color: "#fff",
                    borderRadius: "50%",
                    minWidth: 20,
                    height: 20,
                    padding: "0 4px",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                    lineHeight: 1,
                  }}
                >
                  {notifCount}
                </span>
              )}
            </div>

            {notifOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  width: 380,
                  background: "#fff",
                  borderRadius: 16,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  zIndex: 9999,
                  overflow: "hidden",
                  border: "1px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px 20px 14px",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <img
                      src={goldBellImg}
                      alt=""
                      style={{ width: 28, height: 28, objectFit: "contain" }}
                    />
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        color: "#111",
                      }}
                    >
                      Notifications
                    </span>
                  </div>
                  <img
                    src={allRead ? boxCheckImg : boxUncheckImg}
                    alt={allRead ? "Marked all read" : "Mark all read"}
                    title="Mark all as read"
                    onClick={() => setAllRead((v) => !v)}
                    style={{
                      width: 26,
                      height: 26,
                      objectFit: "contain",
                      cursor: "pointer",
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: "0 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    maxHeight: 320,
                    overflowY: "auto",
                  }}
                >
                  {notifications.map((n) => {
                    const colors = {
                      error: {
                        bg: "#fff0f0",
                        border: "#e53935",
                        text: "#c62828",
                        sub: "#e57373",
                      },
                      info: {
                        bg: "#f0f4ff",
                        border: "#1e88e5",
                        text: "#1565c0",
                        sub: "#64b5f6",
                      },
                      success: {
                        bg: "#f0fff4",
                        border: "#43a047",
                        text: "#2e7d32",
                        sub: "#81c784",
                      },
                    };
                    const c = colors[n.type];

                    return (
                      <div
                        key={n.id}
                        style={{
                          display: "flex",
                          alignItems: "stretch",
                          borderRadius: 8,
                          overflow: "hidden",
                          background: c.bg,
                          opacity: allRead ? 0.5 : 1,
                          transition: "opacity 0.2s",
                        }}
                      >
                        <div
                          style={{
                            width: 5,
                            background: c.border,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ padding: "12px 14px", flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              color: c.text,
                              marginBottom: 3,
                            }}
                          >
                            {n.title}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: c.sub }}>
                            {n.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    padding: "14px 20px 16px",
                  }}
                >
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    style={{
                      background: YELLOW,
                      color: "#111",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      padding: "9px 24px",
                      borderRadius: 8,
                      textDecoration: "none",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#e0a800")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = YELLOW)
                    }
                  >
                    View All
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 32px",
            background: "#f5f5f5",
          }}
        >
          <div className="grades-page">
            <div className="grades-content">
              <section className="grades-hero">
                <h1>View Grades</h1>
                <p>Your complete academic history and performance record</p>
              </section>

              {loading ? (
                <section className="grades-panel grades-loading">
                  Loading grade records...
                </section>
              ) : error ? (
                <section className="grades-panel grades-error">{error}</section>
              ) : (
                <>
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

                  <section className="grades-panel grades-filter-panel">
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by course code or title..."
                    />
                    <div className="grades-filter-buttons">
                      {STATUS_FILTERS.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setStatusFilter(label)}
                          className={statusFilter === label ? "is-active" : ""}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="grades-semesters">
                    {filteredSemesters.length === 0 && (
                      <div className="grades-panel grades-empty">
                        No courses match the selected filters.
                      </div>
                    )}

                    {filteredSemesters.map((semester) => {
                      const isOpen = !!expanded[semester.key];

                      const tone = getSemesterTone(semester.gpa);

                      return (
                        <article
                          key={semester.key}
                          className={`grades-panel grades-semester-card grades-semester-card--${tone}`}
                        >
                          <button
                            type="button"
                            className={`grades-semester-summary ${isOpen ? "is-open" : ""}`}
                            onClick={() => toggleExpanded(semester.key)}
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
                              <div
                                className={`grades-chevron ${isOpen ? "is-open" : ""}`}
                              />
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
                                    <span
                                      className={`grades-pill grades-pill--${tone}`}
                                    >
                                      {course.grade || "-"}
                                    </span>
                                  </div>
                                  <div className="grades-course-status">
                                    <span
                                      className={`grades-pill grades-pill--${tone}`}
                                    >
                                      {course.normalizedStatus}
                                    </span>
                                  </div>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewGrades;
