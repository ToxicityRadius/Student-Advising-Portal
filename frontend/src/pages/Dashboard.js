import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

import logo from "../assets/images/STUDENT ADVISING LOGO 1.png";
import bellIconImg from "../assets/images/Bell White Gradient.png";
import bookWhiteImg from "../assets/images/Book mobile.png";
import gradesWhiteImg from "../assets/images/Grades White.png";
import planWhiteImg from "../assets/images/Plan of Study White.png";
import goldLogoutImg from "../assets/images/Gold Logout.png";
// Gold sidebar icons
import goldHomePageImg from "../assets/images/Gold HomePage.png";
import goldBookImg from "../assets/images/Gold book.png";
import goldPlanImg from "../assets/images/Gold Plan of Study.png";
import goldGradesImg from "../assets/images/Gold Grades.png";
import goldChecklistImg from "../assets/images/Gold Checklist.png";
import goldUserImg from "../assets/images/Gold User.png";
import goldBellImg from "../assets/images/Gold Bell Gradient.png";
import goldSettingsImg from "../assets/images/Gold Settings.png";
import goldHelpImg from "../assets/images/Gold Help & Support.png";
import boxCheckImg from "../assets/images/Box Check.png";
import boxUncheckImg from "../assets/images/Box Uncheck.png";

import "./Dashboard.css";

const YELLOW = "#FFC107";
const SIDEBAR_W = 240;

const ChecklistWhiteIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect
      x="3"
      y="3"
      width="34"
      height="34"
      rx="5"
      stroke="white"
      strokeWidth="2.5"
    />
    <path
      d="M11 20l6 6L29 13"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Helpers ── */
const formatYearLevel = (level) => {
  const map = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
  const n = parseInt(level, 10);
  return map[n] ? `${map[n]} Year` : `${level} Year`;
};

/* ── Sidebar nav item ── */
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
      e.currentTarget.style.boxShadow = `0 0 12px rgba(255,193,7,0.6)`;
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

/* ── Action course button ── */
const ActionButton = ({ to, icon, label }) => (
  <Link
    to={to}
    className="dashboard-action-btn"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "0 20px",
      minHeight: 80,
      background: YELLOW,
      color: "#fff",
      textDecoration: "none",
      borderRadius: 12,
      fontSize: "0.95rem",
      fontWeight: 700,
      transition: "background-color 0.15s, transform 0.1s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "#e0a800";
      e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = YELLOW;
      e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    <span
      className="dashboard-action-icon"
      style={{ flexShrink: 0, display: "flex", alignItems: "center" }}
    >
      {icon}
    </span>
    <span className="dashboard-action-label">{label}</span>
  </Link>
);

/* ══════════════════════════════════════
   Main Dashboard component
══════════════════════════════════════ */
const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const firstName = user?.firstName || user?.first_name || "";
  const lastName = user?.lastName || user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Student";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "ST";
  const studentId = user?.student_id || user?.studentId || user?.id || "";
  const yearLevel = user?.year_level || user?.yearLevel || "";
  const program = user?.program || "";
  const studentType = user?.student_type || user?.studentType || "";

  /* Progress data — from API */
  const [dashData, setDashData] = useState(null);
  const [semPage, setSemPage] = useState(0);
  const unitsCredited = dashData ? dashData.unitsCredited : 0;
  const totalUnits = dashData ? dashData.totalUnits || 195 : 195;
  const progressPercent =
    totalUnits > 0 ? Math.round((unitsCredited / totalUnits) * 100) : 0;
  const [notifOpen, setNotifOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const notifRef = useRef(null);

  // Close dropdown when clicking outside
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

  // Fetch dashboard data from backend
  useEffect(() => {
    api
      .get("/users/me/dashboard")
      .then((r) => {
        if (r.data.success && r.data.data) setDashData(r.data.data);
      })
      .catch(() => {});
  }, []);

  // Wire to API — notifications shape: { id, type: 'error'|'info'|'success', title, body }
  const notifications = []; // replace with real API data
  const notifCount = notifications.length;
  const availableSubjectsCount = 0; // replace with real API data

  const semesterLabel = yearLevel
    ? `${formatYearLevel(yearLevel)}, 1st Semester`
    : "1st Semester";

  const imgIcon = (src, size = 22) => (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );

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
      {/* ══════════ SIDEBAR ══════════ */}
      <aside
        className={`dashboard-sidebar ${mobileMenuOpen ? "open" : ""}`}
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
        {/* User profile */}
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
          {/* Avatar */}
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

          {/* Full name */}
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

          {/* Student ID */}
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

          {/* Tags */}
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
                {/* Row 1 */}
                {yearLevel ? (
                  <Tag label={formatYearLevel(yearLevel)} />
                ) : (
                  <Tag label="—" />
                )}
                <Tag label="1st Semester" />

                {/* Row 2 */}
                {row2Left ? <Tag label={row2Left} /> : <span />}
                {row2Right ? <Tag label={row2Right} /> : <span />}
              </div>
            );
          })()}
        </div>

        {/* Navigation */}
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
            active
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

          {/* Logout */}
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

        {/* Footer */}
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

      {/* ══════════ MAIN AREA ══════════ */}
      {mobileMenuOpen && (
        <button
          type="button"
          className="dashboard-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <div
        className="dashboard-main-shell"
        style={{
          flex: 1,
          marginLeft: SIDEBAR_W,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* ── Topbar ── */}
        <header
          className="dashboard-topbar"
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
          {/* Logo + breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <button
              type="button"
              className="dashboard-mobile-menu-btn"
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
              <span style={{ color: "#111", fontWeight: 800 }}>Dashboard</span>
            </div>
          </div>

          {/* Bell button */}
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

            {/* Notification dropdown */}
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
                {/* Header */}
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
                  {/* Mark all read checkbox */}
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

                {/* Notification items */}
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
                        {/* Colored left bar */}
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

                {/* Footer */}
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

        {/* ── Content area ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 32px",
            background: "#f5f5f5",
          }}
        >
          {/* Academic Progress Overview */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 32px",
              marginBottom: 24,
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#111",
                marginBottom: 22,
              }}
            >
              Academic Progress Overview
            </h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 22,
              }}
            >
              <span
                style={{ fontWeight: 700, fontSize: "1rem", color: "#222" }}
              >
                {semesterLabel}
              </span>
              <span
                style={{
                  background: YELLOW,
                  color: "#111",
                  padding: "5px 18px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                }}
              >
                Current
              </span>
            </div>

            {/* Units credited row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: YELLOW,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.86rem",
                    color: "#555",
                    letterSpacing: 0.5,
                  }}
                >
                  UNITS CREDITED
                </span>
              </div>
              <span
                style={{ fontWeight: 800, fontSize: "0.92rem", color: "#222" }}
              >
                {unitsCredited} UNITS
              </span>
            </div>

            {/* Total units row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#aaa",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.86rem",
                    color: "#555",
                    letterSpacing: 0.5,
                  }}
                >
                  TOTAL UNITS
                </span>
              </div>
              <span
                style={{ fontWeight: 800, fontSize: "0.92rem", color: "#222" }}
              >
                {totalUnits} UNITS
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                background: "#ddd",
                borderRadius: 999,
                height: 18,
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: YELLOW,
                  borderRadius: 999,
                  transition: "width 0.6s ease",
                  minWidth: progressPercent > 0 ? 8 : 0,
                }}
              />
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: "0.85rem",
                color: "#666",
                fontWeight: 600,
              }}
            >
              {progressPercent}% Complete
            </div>
          </div>

          {/* Actions Course */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 32px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              marginBottom: 24,
            }}
          >
            <h2 className="dashboard-actions-h2">
              Actions Course
            </h2>
            <div className="dashboard-actions-grid">
              <ActionButton
                to="/subjects"
                icon={
                  <img
                    src={bookWhiteImg}
                    alt=""
                    style={{ width: 40, height: 40, objectFit: "contain" }}
                  />
                }
                label="Available Subjects"
              />
              <ActionButton
                to="/plan-of-study"
                icon={
                  <img
                    src={planWhiteImg}
                    alt=""
                    style={{ width: 40, height: 40, objectFit: "contain" }}
                  />
                }
                label="Plan of Study"
              />
              <ActionButton
                to="/grades"
                icon={
                  <img
                    src={gradesWhiteImg}
                    alt=""
                    style={{ width: 40, height: 40, objectFit: "contain" }}
                  />
                }
                label="View Grades"
              />
              <ActionButton
                to="/checklist"
                icon={<ChecklistWhiteIcon size={40} />}
                label="Checklist"
              />
            </div>
          </div>

          {/* ── Status Cards ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 32px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#111",
                marginBottom: 20,
              }}
            >
              Status Cards
            </h2>

            {/* GWA — full-width bright green row */}
            <div
              style={{
                background: "#2ecc71",
                borderRadius: 14,
                padding: "18px 24px",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <ChecklistWhiteIcon size={28} />
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      opacity: 0.9,
                      marginBottom: 2,
                    }}
                  >
                    Overall GWA
                  </div>
                  <div
                    style={{
                      fontSize: "1.9rem",
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {dashData && dashData.gwa ? dashData.gwa : "\u2014"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChecklistWhiteIcon size={24} />
              </div>
            </div>

            {/* Bottom row: Completed + Pending */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* Subjects Completed */}
              <div
                style={{
                  background: "#fffbe6",
                  border: "1.5px solid #ffe58f",
                  borderRadius: 14,
                  padding: "28px 20px 22px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#FFC107",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    color: "#fff",
                    boxShadow: "0 3px 10px rgba(255,193,7,0.4)",
                  }}
                >
                  {dashData ? dashData.subjectsCompleted : 0}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#555",
                  }}
                >
                  Subjects Completed
                </div>
              </div>

              {/* Subjects Pending */}
              <div
                style={{
                  background: "#e8f0fe",
                  border: "1.5px solid #bad3f8",
                  borderRadius: 14,
                  padding: "28px 20px 22px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#4a90d9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    color: "#fff",
                    boxShadow: "0 3px 10px rgba(74,144,217,0.4)",
                  }}
                >
                  {dashData ? dashData.subjectsPending : 0}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#555",
                  }}
                >
                  Subjects Pending
                </div>
              </div>
            </div>
          </div>

          {/* ── Semester Summary ── */}
          {(() => {
            const sems = dashData?.semesterSummary ?? [];
            const hasSems = sems.length > 0;
            const current = hasSems ? sems[semPage] : null;
            const semOrdinal = { 1: "1st", 2: "2nd", 3: "3rd" };
            const semLabel = current
              ? `${{ 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" }[current.yearLevel] || current.yearLevel + "th"} Year, ${semOrdinal[current.semester] || current.semester + "th"} Semester`
              : "\u2014";
            return (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "28px 32px 20px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  marginBottom: 20,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#111",
                      margin: 0,
                    }}
                  >
                    Semester Summary
                  </h2>
                  {hasSems && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <button
                        onClick={() => setSemPage((p) => Math.max(0, p - 1))}
                        disabled={semPage === 0}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: semPage === 0 ? "not-allowed" : "pointer",
                          fontSize: "1.1rem",
                          color: semPage === 0 ? "#ccc" : "#333",
                          fontWeight: 700,
                          padding: "2px 6px",
                          lineHeight: 1,
                        }}
                      >
                        &#8249;
                      </button>
                      <span
                        style={{
                          fontSize: "0.92rem",
                          fontWeight: 600,
                          color: "#333",
                        }}
                      >
                        {semPage + 1}/{sems.length}
                      </span>
                      <button
                        onClick={() =>
                          setSemPage((p) => Math.min(sems.length - 1, p + 1))
                        }
                        disabled={semPage === sems.length - 1}
                        style={{
                          background: "none",
                          border: "none",
                          cursor:
                            semPage === sems.length - 1
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "1.1rem",
                          color: semPage === sems.length - 1 ? "#ccc" : "#333",
                          fontWeight: 700,
                          padding: "2px 6px",
                          lineHeight: 1,
                        }}
                      >
                        &#8250;
                      </button>
                    </div>
                  )}
                </div>

                {/* Yellow inner card */}
                <div
                  style={{
                    background: "#fffbe6",
                    border: "1.5px solid #FFC107",
                    borderRadius: 12,
                    padding: "18px 24px 24px",
                    marginBottom: 16,
                    minHeight: 160,
                  }}
                >
                  {/* Semester header row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="1"
                          y="3"
                          width="20"
                          height="17"
                          rx="3"
                          stroke="#b8860b"
                          strokeWidth="1.8"
                        />
                        <path d="M1 8h20" stroke="#b8860b" strokeWidth="1.8" />
                        <path
                          d="M7 1v4M15 1v4"
                          stroke="#b8860b"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: "#111",
                        }}
                      >
                        {semLabel}
                      </span>
                    </div>
                    {current && (
                      <span
                        style={{
                          background:
                            current.status === "In Progress"
                              ? "#FFC107"
                              : "#2ecc71",
                          color: "#fff",
                          borderRadius: 999,
                          padding: "5px 18px",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {current.status}
                      </span>
                    )}
                  </div>

                  {hasSems && current ? (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.875rem",
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0 12px 12px 0",
                              fontWeight: 700,
                              color: "#111",
                              fontSize: "0.875rem",
                            }}
                          >
                            Course Code
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0 12px 12px",
                              fontWeight: 700,
                              color: "#111",
                              fontSize: "0.875rem",
                            }}
                          >
                            Course Descriptive Title
                          </th>
                          <th
                            style={{
                              textAlign: "center",
                              padding: "0 12px 12px",
                              fontWeight: 700,
                              color: "#111",
                              fontSize: "0.875rem",
                            }}
                          >
                            Units
                          </th>
                          <th
                            style={{
                              textAlign: "center",
                              padding: "0 0 12px 12px",
                              fontWeight: 700,
                              color: "#111",
                              fontSize: "0.875rem",
                            }}
                          >
                            Grade
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.courses.map((c, i) => (
                          <tr key={i}>
                            <td
                              style={{
                                padding: "10px 12px 10px 0",
                                fontWeight: 500,
                                color: "#222",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.code || "\u2014"}
                            </td>
                            <td style={{ padding: "10px 12px", color: "#222" }}>
                              {c.name || "\u2014"}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                padding: "10px 12px",
                                color: "#222",
                                fontWeight: 500,
                              }}
                            >
                              {c.units ?? "\u2014"}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                padding: "10px 0 10px 12px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 34,
                                  height: 30,
                                  border: "1.5px solid #FFC107",
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  color:
                                    c.status === "passed"
                                      ? "#333"
                                      : c.status === "failed"
                                        ? "#c0392b"
                                        : "#888",
                                  background: "transparent",
                                }}
                              >
                                {c.grade ||
                                  (c.status === "pending"
                                    ? "\u2014"
                                    : c.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "28px 0 12px",
                        color: "#bfa040",
                        fontSize: "0.88rem",
                      }}
                    >
                      No study plan data available yet.
                    </div>
                  )}
                </div>

                {/* Footer hint */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "0.78rem",
                    color: "#999",
                  }}
                >
                  &#8592; Use arrows to navigate between semesters &#8594;
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
