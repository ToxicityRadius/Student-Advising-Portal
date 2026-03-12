import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

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
import studentYellowImg from "../assets/images/student yellow.png";
import graduationCapImg from "../assets/images/Graduation Cap Black.png";

const YELLOW = "#FFC107";
const SIDEBAR_W = 240;

const programOptions = ["BSCpE", "BSCS", "BSIT", "BSCE", "BSEE", "BSME"];

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

const InfoField = ({ label, value }) => (
  <div>
    <div
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "#bbb",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 5,
      }}
    >
      {label}
    </div>
    <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "#111" }}>
      {value || "—"}
    </div>
  </div>
);

const Profile = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const notifRef = useRef(null);
  const notifications = [];
  const notifCount = notifications.length;
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    program: "",
    year_level: "",
    contact_number: "",
    gender: "",
    profile_picture: null,
  });

  const imgIcon = (src, size = 22) => (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Derived display values
  const firstName =
    profile?.first_name || user?.first_name || user?.firstName || "";
  const lastName =
    profile?.last_name || user?.last_name || user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Student";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "ST";
  const studentId =
    profile?.studentId || user?.studentId || user?.student_id || "";
  const yearLevel =
    profile?.current_year_level ||
    profile?.year_level ||
    user?.year_level ||
    "";
  const program = profile?.program || user?.program || "";
  const studentType =
    profile?.student_type || user?.student_type || user?.studentType || "";
  const email = profile?.email || user?.email || "";
  const contactNumber = profile?.contact_number || user?.contact_number || "";
  const gender = profile?.gender || user?.gender || "";
  const curriculumYear =
    profile?.curriculum_year || user?.curriculum_year || "";

  // Build academic tags
  const academicTags = [
    yearLevel ? formatYearLevel(yearLevel) : null,
    "1st Semester",
    studentType || null,
    curriculumYear
      ? `${program || ""} ${curriculumYear}`.trim()
      : program || null,
  ].filter(Boolean);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/${user.id}`);
        const p = response.data.user || {};
        setProfile(p);
        setFormData({
          first_name: p.first_name || "",
          middle_name: p.middle_name || "",
          last_name: p.last_name || "",
          program: p.program || "",
          year_level: p.current_year_level || p.year_level || "",
          contact_number: p.contact_number || "",
          gender: p.gender || "",
          profile_picture: null,
        });
        if (p.profile_picture) {
          const apiRoot = (
            process.env.REACT_APP_API_URL || "http://localhost:5000/api"
          ).replace(/\/api\/?$/, "");
          setPreview(`${apiRoot}${p.profile_picture}`);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchProfile();
  }, [user?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [photoUploading, setPhotoUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, profile_picture: file }));
    if (file) setPreview(URL.createObjectURL(file));
  };

  // View-mode Upload Photo — saves immediately
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    setError("");
    setSuccess("");
    try {
      const payload = new FormData();
      payload.append("profile_picture", file);
      const response = await api.put(`/users/${user.id}/profile`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const freshToken = response.data.token;
      if (freshToken) {
        localStorage.setItem("token", freshToken);
        await login(freshToken);
      }
      const refreshed = await api.get(`/users/${user.id}`);
      const p = refreshed.data.user || {};
      setProfile(p);
      if (p.profile_picture) {
        const apiRoot = (
          process.env.REACT_APP_API_URL || "http://localhost:5000/api"
        ).replace(/\/api\/?$/, "");
        setPreview(`${apiRoot}${p.profile_picture}`);
      }
      setSuccess("Photo updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  // View-mode Remove Photo — clears immediately
  const handlePhotoRemove = async () => {
    setPhotoUploading(true);
    setError("");
    setSuccess("");
    try {
      const payload = new FormData();
      payload.append("remove_profile_picture", "true");
      const response = await api.put(`/users/${user.id}/profile`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const freshToken = response.data.token;
      if (freshToken) {
        localStorage.setItem("token", freshToken);
        await login(freshToken);
      }
      const refreshed = await api.get(`/users/${user.id}`);
      setProfile(refreshed.data.user || {});
      setPreview("");
      setSuccess("Photo removed successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = new FormData();
      payload.append("first_name", formData.first_name);
      payload.append("middle_name", formData.middle_name);
      payload.append("last_name", formData.last_name);
      payload.append("program", formData.program);
      payload.append("year_level", formData.year_level);
      payload.append("contact_number", formData.contact_number);
      payload.append("gender", formData.gender);
      if (formData.profile_picture)
        payload.append("profile_picture", formData.profile_picture);

      const response = await api.put(`/users/${user.id}/profile`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const freshToken = response.data.token;
      if (freshToken) {
        localStorage.setItem("token", freshToken);
        await login(freshToken);
      }

      const refreshed = await api.get(`/users/${user.id}`);
      const p = refreshed.data.user || {};
      setProfile(p);
      if (p.profile_picture) {
        const apiRoot = (
          process.env.REACT_APP_API_URL || "http://localhost:5000/api"
        ).replace(/\/api\/?$/, "");
        setPreview(`${apiRoot}${p.profile_picture}`);
      }
      setSuccess("Profile updated successfully");
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Sidebar year/program tags
  const sidebarYearLevel = yearLevel;
  const sidebarProgram = program;
  const sidebarStudentType = studentType;
  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";

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
        {/* Avatar + user info */}
        <div
          style={{
            padding: "24px 20px 20px",
            textAlign: "center",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
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
              boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${YELLOW}`,
            }}
          >
            {preview ? (
              <img
                src={preview}
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
            }}
          >
            {studentId}
          </div>
          {/* Tags grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              width: "100%",
            }}
          >
            {[
              sidebarYearLevel ? formatYearLevel(sidebarYearLevel) : "—",
              "1st Semester",
              sidebarStudentType || roleLabel || null,
              sidebarProgram || null,
            ].map((tag, i) =>
              tag ? (
                <span
                  key={i}
                  style={{
                    background: YELLOW,
                    color: "#333",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "5px 0",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {tag}
                </span>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        </div>

        {/* Nav */}
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
            active
            icon={imgIcon(goldUserImg)}
            label="Profile"
            to="/profile"
          />
          <SideNavItem
            icon={imgIcon(goldBellImg)}
            label="Notifications"
            to="/notifications"
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

      {/* ══════════ MAIN AREA ══════════ */}
      <div
        style={{
          flex: 1,
          marginLeft: SIDEBAR_W,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#f5f5f5",
        }}
      >
        {/* ── Topbar ── */}
        <header
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
              <span style={{ color: "#111", fontWeight: 800 }}>Profile</span>
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

        {/* ── Content area ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 36px",
            background: "#f5f5f5",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {/* Page title */}
            <h2
              style={{
                fontSize: "1.9rem",
                fontWeight: 900,
                color: "#111",
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              My Profile
            </h2>
            <p
              style={{
                color: "#555",
                fontSize: "1rem",
                marginBottom: 28,
                fontWeight: 700,
              }}
            >
              View and manage your personal information
            </p>

            {error && (
              <div
                style={{
                  background: "#fff3f3",
                  color: "#c62828",
                  border: "1px solid #e57373",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  background: "#f0fff4",
                  color: "#2e7d32",
                  border: "1px solid #81c784",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 16,
                }}
              >
                {success}
              </div>
            )}

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#888",
                }}
              >
                Loading profile...
              </div>
            ) : editMode ? (
              /* ── EDIT MODE ── */
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: "32px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 28,
                  }}
                >
                  <h3
                    style={{
                      fontWeight: 800,
                      fontSize: "1.2rem",
                      color: "#111",
                      margin: 0,
                    }}
                  >
                    Edit Profile
                  </h3>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setError("");
                      setSuccess("");
                    }}
                    style={{
                      background: "none",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: "8px 18px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      color: "#555",
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      {
                        name: "first_name",
                        label: "First Name",
                        required: true,
                      },
                      { name: "middle_name", label: "Middle Name" },
                      { name: "last_name", label: "Last Name", required: true },
                      {
                        name: "contact_number",
                        label: "Contact Number",
                        required: true,
                      },
                    ].map(({ name, label, required }) => (
                      <div key={name}>
                        <label
                          style={{
                            display: "block",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            color: "#888",
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {label}
                        </label>
                        <input
                          name={name}
                          value={formData[name]}
                          onChange={handleChange}
                          required={required}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: "1px solid #e0e0e0",
                            borderRadius: 8,
                            fontSize: "0.95rem",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    ))}

                    {user?.role === "student" && (
                      <>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              color: "#888",
                              marginBottom: 6,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Program
                          </label>
                          <select
                            name="program"
                            value={formData.program}
                            onChange={handleChange}
                            required
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              border: "1px solid #e0e0e0",
                              borderRadius: 8,
                              fontSize: "0.95rem",
                              outline: "none",
                              boxSizing: "border-box",
                              background: "#fff",
                            }}
                          >
                            <option value="">Select Program</option>
                            {programOptions.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              color: "#888",
                              marginBottom: 6,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Year Level
                          </label>
                          <select
                            name="year_level"
                            value={formData.year_level}
                            onChange={handleChange}
                            required
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              border: "1px solid #e0e0e0",
                              borderRadius: 8,
                              fontSize: "0.95rem",
                              outline: "none",
                              boxSizing: "border-box",
                              background: "#fff",
                            }}
                          >
                            <option value="">Select Year Level</option>
                            {[1, 2, 3, 4, 5].map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Gender */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: "#888",
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: "1px solid #e0e0e0",
                          borderRadius: 8,
                          fontSize: "0.95rem",
                          outline: "none",
                          boxSizing: "border-box",
                          background: "#fff",
                        }}
                      >
                        <option value="">Select Gender (Optional)</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Profile picture */}
                  <div style={{ marginBottom: 28 }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: "#888",
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Profile Picture
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ fontSize: "0.88rem" }}
                    />
                    {preview && (
                      <div style={{ marginTop: 14 }}>
                        <img
                          src={preview}
                          alt="Preview"
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: `3px solid ${YELLOW}`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: YELLOW,
                      color: "#222",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      padding: "12px 32px",
                      borderRadius: 8,
                      border: "none",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            ) : (
              /* ── VIEW MODE ── */
              <>
                {/* Personal Information Card */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "28px 32px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    marginBottom: 24,
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <img
                        src={studentYellowImg}
                        alt=""
                        style={{ width: 28, height: 28, objectFit: "contain" }}
                      />
                      <h3
                        style={{
                          fontWeight: 800,
                          fontSize: "1.2rem",
                          color: "#111",
                          margin: 0,
                        }}
                      >
                        Personal Information
                      </h3>
                    </div>
                    <button
                      onClick={() => setEditMode(true)}
                      style={{
                        background: YELLOW,
                        color: "#222",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        padding: "9px 20px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        letterSpacing: 0.5,
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e0a800")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = YELLOW)
                      }
                    >
                      EDIT PROFILE
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 40,
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Avatar + upload */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 110,
                          height: 110,
                          borderRadius: "50%",
                          background: YELLOW,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "2.2rem",
                          fontWeight: 900,
                          color: "#222",
                          overflow: "hidden",
                        }}
                      >
                        {preview ? (
                          <img
                            src={preview}
                            alt="Profile"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <label
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: 6,
                          padding: "6px 14px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#444",
                          background: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                      {preview && (
                        <button
                          onClick={handlePhotoRemove}
                          disabled={photoUploading}
                          style={{
                            border: "1px solid #e57373",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: photoUploading ? "not-allowed" : "pointer",
                            color: "#c62828",
                            background: "#fff",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Remove Photo
                        </button>
                      )}
                      {photoUploading && (
                        <span style={{ fontSize: "0.72rem", color: "#888" }}>
                          Saving...
                        </span>
                      )}
                    </div>

                    {/* Info grid */}
                    <div
                      style={{
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "22px 48px",
                      }}
                    >
                      <InfoField label="Full Name" value={fullName} />
                      <InfoField label="Student ID" value={studentId} />
                      <InfoField label="Email Address" value={email} />
                      <InfoField label="Phone Number" value={contactNumber} />
                      <InfoField
                        label="Gender"
                        value={gender ? gender.toUpperCase() : null}
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Information Card */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    overflow: "hidden",
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "22px 32px",
                    }}
                  >
                    <img
                      src={graduationCapImg}
                      alt=""
                      style={{ width: 28, height: 28, objectFit: "contain" }}
                    />
                    <h3
                      style={{
                        fontWeight: 800,
                        fontSize: "1.2rem",
                        color: "#111",
                        margin: 0,
                      }}
                    >
                      Academic Information
                    </h3>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: "1px solid #e8e8e8" }} />

                  {/* Tags — centered */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 12,
                      padding: "32px",
                      minHeight: 120,
                    }}
                  >
                    {academicTags.length > 0 ? (
                      academicTags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            background: YELLOW,
                            color: "#222",
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            padding: "10px 26px",
                            borderRadius: 8,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "#bbb", fontSize: "0.9rem" }}>
                        No academic information available.
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
