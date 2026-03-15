import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import useNotifications from "../utils/useNotifications";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { buildProfileImageUrl } from "../utils/profileImage";

import logo from "../assets/images/STUDENT ADVISING LOGO 1.png";
import bellIconImg from "../assets/images/Bell White Gradient.png";
import boxCheckImg from "../assets/images/Box Check.png";
import boxUncheckImg from "../assets/images/Box Uncheck.png";
import searchIconImg from "../assets/images/Search Bar Black.png";

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

import "./AvailableSubjects.css";

const YELLOW = "#FFC107";
const SIDEBAR_W = 240;

const formatYearLevel = (level) => {
  const map = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
  const n = parseInt(level, 10);
  return map[n] ? `${map[n]} Year` : `${level} Year`;
};

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
  if (raw === "pending") return "Available";
  if (raw === "incomplete") return "In Progress";
  if (raw === "dropped" || raw === "drop") return "Dropped";
  return "Available";
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

const AvailableSubjects = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
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

  const { notifications, notifCount } = useNotifications();

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
          setError("Unable to load available subjects right now.");
        }
      })
      .catch(() => {
        setError("Unable to load available subjects right now.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const subjects = useMemo(() => {
    const semesters = dashboardData?.semesterSummary || [];

    return semesters.flatMap((semester) =>
      (semester.courses || []).map((course, idx) => ({
        id: `${semester.yearLevel}-${semester.semester}-${course.code || idx}`,
        code: course.code || "COURSE",
        name: course.name || "Course title unavailable",
        units: Number(course.units || 0),
        year: semester.yearLevel,
        semester: semester.semester,
        term: semesterLabel(semester.yearLevel, semester.semester),
        status: normalizeStatus(course),
      })),
    );
  }, [dashboardData]);

  const availableSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          subject.status === "Available" || subject.status === "In Progress",
      ),
    [subjects],
  );

  const yearOptions = useMemo(() => {
    const years = [
      ...new Set(availableSubjects.map((subject) => String(subject.year))),
    ].sort();
    return ["All", ...years];
  }, [availableSubjects]);

  const semesterOptions = useMemo(() => {
    const pool = yearFilter === "All"
      ? availableSubjects
      : availableSubjects.filter((s) => String(s.year) === yearFilter);
    const sems = [...new Set(pool.map((s) => String(s.semester)))].sort();
    return ["All", ...sems];
  }, [availableSubjects, yearFilter]);

  const filteredSubjects = useMemo(() => {
    const term = query.trim().toLowerCase();

    return availableSubjects.filter((subject) => {
      const matchesQuery =
        !term ||
        subject.code.toLowerCase().includes(term) ||
        subject.name.toLowerCase().includes(term);
      const matchesYear =
        yearFilter === "All" || String(subject.year) === yearFilter;
      const matchesSemester =
        semesterFilter === "All" || String(subject.semester) === semesterFilter;
      return matchesQuery && matchesYear && matchesSemester;
    });
  }, [availableSubjects, query, yearFilter, semesterFilter]);

  const grouped = useMemo(() => {
    const map = {};
    for (const subject of filteredSubjects) {
      const key = `${subject.year}-${subject.semester}`;
      if (!map[key]) {
        map[key] = {
          title: subject.term,
          year: subject.year,
          semester: subject.semester,
          items: [],
        };
      }
      map[key].items.push(subject);
    }

    return Object.values(map).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.semester - b.semester,
    );
  }, [filteredSubjects]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
        className={`subjects-sidebar ${mobileMenuOpen ? "open" : ""}`}
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
            {buildProfileImageUrl(user?.profile_picture || user?.profilePicture) ? (
              <img
                src={buildProfileImageUrl(user?.profile_picture || user?.profilePicture)}
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
            active
            icon={imgIcon(goldBookImg)}
            label="Available Subjects"
            to="/subjects"
            badge={
              availableSubjects.length > 0
                ? availableSubjects.length
                : undefined
            }
          />
          <SideNavItem
            icon={imgIcon(goldPlanImg)}
            label="Plan of Study"
            to="/plan-of-study"
          />
          <SideNavItem
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
            onClick={() => setShowLogoutConfirm(true)}
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
          className="subjects-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <div
        className="subjects-main-shell"
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
          className="subjects-topbar"
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
              className="subjects-mobile-menu-btn"
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
                AVAILABLE SUBJECTS
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
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "18px 12px",
                        textAlign: "center",
                        color: "#888",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      No notifications yet.
                    </div>
                  ) : notifications.map((n) => {
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
          <div className="subjects-page">
            <section className="subjects-hero">
              <h1>Available Subjects</h1>
              <p>Browse courses open for your current academic plan</p>
            </section>

            {loading ? (
              <section className="subjects-panel subjects-loading">
                Loading subjects...
              </section>
            ) : error ? (
              <section className="subjects-panel subjects-error">
                {error}
              </section>
            ) : (
              <>
                <section className="subjects-stats-grid">
                  <article className="subjects-stat-card">
                    <span>Available Now</span>
                    <h2>
                      {
                        availableSubjects.filter(
                          (s) => s.status === "Available",
                        ).length
                      }
                    </h2>
                    <p>Ready to enroll this term</p>
                  </article>
                  <article className="subjects-stat-card">
                    <span>In Progress</span>
                    <h2>
                      {
                        availableSubjects.filter(
                          (s) => s.status === "In Progress",
                        ).length
                      }
                    </h2>
                    <p>Courses currently being taken</p>
                  </article>
                  <article className="subjects-stat-card">
                    <span>Total Units</span>
                    <h2>
                      {availableSubjects.reduce((sum, s) => sum + s.units, 0)}
                    </h2>
                    <p>Units across available subjects</p>
                  </article>
                </section>

                <section className="subjects-panel subjects-filters">
                  <div className="subjects-search-wrap">
                    <img src={searchIconImg} alt="" />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by course code or title..."
                    />
                  </div>
                  <div className="subjects-filter-row">
                    {yearOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => { setYearFilter(option); setSemesterFilter("All"); }}
                        className={yearFilter === option ? "is-active" : ""}
                      >
                        {option === "All"
                          ? "All Years"
                          : `${formatYearLevel(option)}`}
                      </button>
                    ))}
                  </div>
                  <div className="subjects-filter-row">
                    {semesterOptions.map((option) => (
                      <button
                        key={`sem-${option}`}
                        type="button"
                        onClick={() => setSemesterFilter(option)}
                        className={semesterFilter === option ? "is-active" : ""}
                      >
                        {option === "All"
                          ? "All Semesters"
                          : option === "3"
                            ? "Midyear"
                            : option === "1"
                              ? "1st Semester"
                              : "2nd Semester"}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="subjects-list-wrap">
                  {grouped.length === 0 && (
                    <section className="subjects-panel subjects-empty">
                      No subjects found for current filters.
                    </section>
                  )}

                  {grouped.map((group) => (
                    <article
                      key={`${group.year}-${group.semester}`}
                      className="subjects-panel subjects-group"
                    >
                      <div className="subjects-group-head">
                        <h3>{group.title}</h3>
                        <span>{group.items.length} subjects</span>
                      </div>

                      <div className="subjects-table-head">
                        <span>Course Code</span>
                        <span>Course Title</span>
                        <span>Units</span>
                        <span>Status</span>
                      </div>

                      <div className="subjects-rows">
                        {group.items.map((subject) => (
                          <div key={subject.id} className="subjects-row">
                            <strong>{subject.code}</strong>
                            <span>{subject.name}</span>
                            <span>{subject.units}</span>
                            <span
                              className={`subjects-pill subjects-pill--${subject.status.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              {subject.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </section>
              </>
            )}
          </div>
          <LogoutConfirmModal
            show={showLogoutConfirm}
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={handleLogout}
          />
        </main>
      </div>
    </div>
  );
};

export default AvailableSubjects;
