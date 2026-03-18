import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { buildProfileImageUrl, getInitials } from "../utils/profileImage";
import { fetchCurriculumsCached } from "../utils/curriculumsCache";
import useNotifications from "../utils/useNotifications";
import LogoutConfirmModal from "../components/LogoutConfirmModal";

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
const sexOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];
const studentTypeOptions = ["regular", "irregular", "transferee", "ladderized"];
const semesterLabels = { 1: "1st Semester", 2: "2nd Semester", 3: "Summer" };

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
  const { notifications, notifCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 780 : false,
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [completionScore, setCompletionScore] = useState(0);
  const [curricula, setCurricula] = useState([]);
  const [removeProfilePicture, setRemoveProfilePicture] = useState(false);
  const [isProfileLockedForCurrentTerm, setIsProfileLockedForCurrentTerm] = useState(false);
  const [currentProfileTermLabel, setCurrentProfileTermLabel] = useState("current term");
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    preferred_name: "",
    student_id: "",
    program: "",
    curriculum_id: "",
    student_type: "",
    year_level: "",
    contact_number: "",
    alternate_email: "",
    sex: "",
    citizenship: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_number: "",
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

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 780;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentTermLabel, setCurrentTermLabel] = useState("—");

  useEffect(() => {
    api.get("/terms/current").then(({ data }) => {
      const sem = data?.data?.semester ?? data?.semester ?? data?.term?.semester;
      const map = { 1: "1st Sem", 2: "2nd Sem", 3: "Summer" };
      if (sem && map[sem]) setCurrentTermLabel(map[sem]);
    }).catch(() => {});
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
    (profile?.student_type || user?.student_type || user?.studentType || "")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const email = profile?.email || user?.email || "";
  const contactNumber = profile?.contact_number || user?.contact_number || "";
  const sex = profile?.sex || profile?.gender || user?.gender || "";
  const citizenship = profile?.citizenship || "";
  const address = profile?.address || "";
  const alternateEmail = profile?.alternate_email || "";
  const emergencyContactName = profile?.emergency_contact_name || "";
  const emergencyContactRelationship = profile?.emergency_contact_relationship || "";
  const emergencyContactNumber = profile?.emergency_contact_number || "";
  const suffix = profile?.suffix || "";
  const preferredName = profile?.preferred_name || "";
  const curriculumYear =
    profile?.curriculum_year || user?.curriculum_year || "";

  // Build academic tags
  const yearSemTag = `${yearLevel ? formatYearLevel(yearLevel) : "—"} · ${currentTermLabel}`;
  const typeProgramTag = [
    studentType || null,
    curriculumYear ? `${program || ""} ${curriculumYear}`.trim() : program || null,
  ].filter(Boolean).join(" · ");
  const academicTags = [yearSemTag, typeProgramTag].filter(Boolean);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [profileRes, currentTermRes] = await Promise.all([
          api.get(`/users/${user.id}`),
          api.get("/terms/current").catch(() => ({ data: { data: null } })),
        ]);

        let curriculaList = [];
        try {
          if (user?.role === "student") {
            const optRes = await api.get("/users/curriculum-options");
            curriculaList = optRes?.data?.items || [];
          } else {
            const cached = await fetchCurriculumsCached({ page: 1, pageSize: 200, sortBy: "name", sortOrder: "asc" });
            curriculaList = cached?.items || cached?.data || cached?.curriculums || [];
          }
        } catch {
          curriculaList = [];
        }
        setCurricula(curriculaList);

        const p = profileRes.data.user || {};
        const currentTerm = currentTermRes?.data?.data || null;
        const currentTermKey = currentTerm ? `${currentTerm.schoolYear}-S${currentTerm.semester}` : "NO_ACTIVE_TERM";
        const lastSubmittedTermKey = p.lastSubmittedProfileTermKey || p.profile_last_submitted_term_key || null;
        const lockFromServer = Boolean(p.isProfileLockedForCurrentTerm);
        const lockFromFallback = Boolean(user?.role === "student" && lastSubmittedTermKey && lastSubmittedTermKey === currentTermKey);
        setIsProfileLockedForCurrentTerm(lockFromServer || lockFromFallback);
        if (currentTerm) {
          setCurrentProfileTermLabel(`${currentTerm.schoolYear} — ${semesterLabels[currentTerm.semester] || `Semester ${currentTerm.semester}`}`);
        }

        setProfile(p);
        setCompletionScore(p.profileCompletionScore ?? 0);
        setFormData({
          first_name: p.first_name || "",
          middle_name: p.middle_name || "",
          last_name: p.last_name || "",
          suffix: p.suffix || "",
          preferred_name: p.preferred_name || "",
          student_id: p.studentId || "",
          program: p.program || "",
          curriculum_id: p.curriculum_id != null ? String(p.curriculum_id) : "",
          student_type: p.student_type || "",
          year_level: p.current_year_level != null ? String(p.current_year_level) : (p.year_level || ""),
          contact_number: p.contact_number || "",
          alternate_email: p.alternate_email || "",
          sex: p.sex || p.gender || "",
          citizenship: p.citizenship || "",
          address: p.address || "",
          emergency_contact_name: p.emergency_contact_name || "",
          emergency_contact_relationship: p.emergency_contact_relationship || "",
          emergency_contact_number: p.emergency_contact_number || "",
          profile_picture: null,
        });
        setPreview(buildProfileImageUrl(p.profile_picture));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchProfile();
  }, [user?.id, user?.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => { const u = { ...prev }; delete u[name]; return u; });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, profile_picture: file }));
    if (file) {
      setPreview(URL.createObjectURL(file));
      setRemoveProfilePicture(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, profile_picture: null }));
    setPreview("");
    setRemoveProfilePicture(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasPictureChange = Boolean(formData.profile_picture) || removeProfilePicture;
    if (user?.role === "student" && isProfileLockedForCurrentTerm && !hasPictureChange) {
      setError(`Profile details are locked for ${currentProfileTermLabel}. You can still update your profile picture.`);
      return;
    }
    setSaving(true);
    setError("");
    setFieldErrors({});
    setSuccess("");
    try {
      const payload = new FormData();
      if (!(user?.role === "student" && isProfileLockedForCurrentTerm)) {
        payload.append("first_name", formData.first_name);
        payload.append("middle_name", formData.middle_name);
        payload.append("last_name", formData.last_name);
        payload.append("suffix", formData.suffix);
        payload.append("preferred_name", formData.preferred_name);
        payload.append("program", formData.program);
        payload.append("year_level", formData.year_level);
        payload.append("curriculum_id", formData.curriculum_id);
        payload.append("student_type", formData.student_type);
        payload.append("contact_number", formData.contact_number);
        payload.append("alternate_email", formData.alternate_email);
        payload.append("sex", formData.sex);
        payload.append("citizenship", formData.citizenship);
        payload.append("address", formData.address);
        payload.append("emergency_contact_name", formData.emergency_contact_name);
        payload.append("emergency_contact_relationship", formData.emergency_contact_relationship);
        payload.append("emergency_contact_number", formData.emergency_contact_number);
      }
      if (formData.profile_picture) payload.append("profile_picture", formData.profile_picture);
      payload.append("remove_profile_picture", removeProfilePicture ? "true" : "false");

      const response = await api.put(`/users/${user.id}/profile`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCompletionScore(response.data.user?.profileCompletionScore ?? completionScore);
      setPreview(buildProfileImageUrl(response.data.user?.profile_picture));
      setRemoveProfilePicture(false);

      const freshToken = response.data.token;
      if (freshToken) {
        localStorage.setItem("token", freshToken);
        await login(freshToken);
      }

      const refreshed = await api.get(`/users/${user.id}`);
      const p = refreshed.data.user || {};
      setProfile(p);
      setSuccess("Profile updated successfully");
      setEditMode(false);
      window.location.reload();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setFieldErrors(data.errors);
        setError(data.message || "Validation failed. Please correct the highlighted fields.");
      } else {
        setError(data?.message || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordFieldChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await api.put("/auth/change-password", {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
        await login(response.data.token);
      }
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess("Password changed successfully.");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
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
          zIndex: isMobileView ? 220 : 100,
          flexShrink: 0,
          transform:
            isMobileView && !mobileMenuOpen ? "translateX(-100%)" : "none",
          transition: isMobileView ? "transform 0.2s ease" : "none",
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
          {/* Tags */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              width: "100%",
            }}
          >
            {[
              `${sidebarYearLevel ? formatYearLevel(sidebarYearLevel) : "—"} · ${currentTermLabel}`,
              [sidebarStudentType || roleLabel || null, sidebarProgram || null].filter(Boolean).join(" · ") || null,
            ].filter(Boolean).map((tag, i) =>
              (
                <span
                  key={i}
                  style={{
                    background: "linear-gradient(135deg, #FFD54F 0%, #FFC107 100%)",
                    color: "#4E342E",
                    fontSize: "0.73rem",
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: 20,
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    boxShadow: "0 2px 6px rgba(255,193,7,0.30)",
                    letterSpacing: "0.2px",
                  }}
                >
                  {tag}
                </span>
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
            label="Study Plan"
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

      {isMobileView && mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
          style={{
            position: "fixed",
            inset: 0,
            border: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 210,
            cursor: "pointer",
          }}
        />
      )}

      {/* ══════════ MAIN AREA ══════════ */}
      <div
        style={{
          flex: 1,
          marginLeft: isMobileView ? 0 : SIDEBAR_W,
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
            padding: isMobileView ? "0 14px" : "0 28px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {/* Logo + breadcrumb */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobileView ? 10 : 24,
              minWidth: 0,
              flex: 1,
            }}
          >
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              style={{
                display: isMobileView ? "inline-flex" : "none",
                border: 0,
                background: "rgba(255,255,255,0.28)",
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
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
              style={{
                height: isMobileView ? 34 : 46,
                width: "auto",
                objectFit: "contain",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: isMobileView ? "0.75rem" : "0.85rem",
                fontWeight: 600,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
            {/* Profile Completion Score */}
            {!loading && completionScore > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, padding: "18px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>Profile Completion</span>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: completionScore >= 80 ? "#2e7d32" : completionScore >= 50 ? "#e65100" : "#c62828" }}>{completionScore}%</span>
                </div>
                <div style={{ width: "100%", height: 8, background: "#eee", borderRadius: 999 }}>
                  <div style={{ width: `${completionScore}%`, height: "100%", borderRadius: 999, background: completionScore >= 80 ? "#43a047" : completionScore >= 50 ? "#fb8c00" : "#e53935", transition: "width 0.3s ease" }} />
                </div>
                {completionScore < 100 && <p style={{ fontSize: "0.78rem", color: "#888", margin: "6px 0 0" }}>Complete all required fields (marked with *) to reach 100%.</p>}
              </div>
            )}
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

                {user?.role === "student" && isProfileLockedForCurrentTerm && (
                  <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#856404", fontSize: "0.9rem" }}>
                    Profile details are locked for {currentProfileTermLabel}. Only profile picture updates are available until the next term.
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* ── Identity ── */}
                  <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Identity</p>
                  <fieldset disabled={user?.role === "student" && isProfileLockedForCurrentTerm} style={{ border: 0, padding: 0, margin: 0 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {[{ name: "first_name", label: "First Name", required: true }, { name: "middle_name", label: "Middle Name" }, { name: "last_name", label: "Last Name", required: true }, { name: "suffix", label: "Suffix", placeholder: "e.g. Jr, III" }, { name: "preferred_name", label: "Preferred Name", placeholder: "What you prefer to be called" }, { name: "contact_number", label: "Mobile Number", required: true, placeholder: "+63 9XX XXX XXXX" }].map(({ name, label, required, placeholder }) => (
                      <div key={name}>
                        <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {label}{required && <span style={{ color: "#e53935" }}> *</span>}
                        </label>
                        <input
                          name={name}
                          value={formData[name]}
                          onChange={handleChange}
                          required={required}
                          placeholder={placeholder || ""}
                          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors[name] ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }}
                        />
                        {fieldErrors[name] && <p style={{ color: "#e53935", fontSize: "0.78rem", margin: "4px 0 0" }}>{fieldErrors[name]}</p>}
                      </div>
                    ))}
                  </div>

                  {/* ── Academic Identity (students only) ── */}
                  {user?.role === "student" && (
                    <>
                      <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Academic Identity</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                        <div>
                          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Student Number</label>
                          <input value={formData.student_id} readOnly disabled style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#f5f5f5" }} />
                          <p style={{ color: "#aaa", fontSize: "0.75rem", margin: "4px 0 0" }}>Managed via Student ID settings.</p>
                        </div>
                        <div>
                          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Program <span style={{ color: "#e53935" }}>*</span></label>
                          <select name="program" value={formData.program} onChange={handleChange} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.program ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                            <option value="">Select Program</option>
                            {programOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Year Level <span style={{ color: "#e53935" }}>*</span></label>
                          <select name="year_level" value={formData.year_level} onChange={handleChange} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.year_level ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                            <option value="">Select Year Level</option>
                            {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Curriculum <span style={{ color: "#e53935" }}>*</span></label>
                          <select name="curriculum_id" value={formData.curriculum_id} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.curriculum_id ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                            <option value="">Select Curriculum</option>
                            {curricula.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Student Type <span style={{ color: "#e53935" }}>*</span></label>
                          <select name="student_type" value={formData.student_type} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.student_type ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                            <option value="">Select Type</option>
                            {studentTypeOptions.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Contact ── */}
                  <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Contact</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Primary Email</label>
                      <input value={email} readOnly disabled style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#f5f5f5" }} />
                      <p style={{ color: "#aaa", fontSize: "0.75rem", margin: "4px 0 0" }}>Change via account settings.</p>
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Alternate Email</label>
                      <input type="email" name="alternate_email" value={formData.alternate_email} onChange={handleChange} placeholder="personal or backup email"
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.alternate_email ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>

                  {/* ── Demographics ── */}
                  <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Demographics</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Sex <span style={{ color: "#e53935" }}>*</span></label>
                      <select name="sex" value={formData.sex} onChange={handleChange} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.sex ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                        <option value="">Select</option>
                        {sexOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Citizenship <span style={{ color: "#e53935" }}>*</span></label>
                      <input name="citizenship" value={formData.citizenship} onChange={handleChange} required placeholder="e.g. Filipino"
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.citizenship ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>

                  {/* ── Location ── */}
                  <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Location</p>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Current Address <span style={{ color: "#e53935" }}>*</span></label>
                    <textarea name="address" value={formData.address} onChange={handleChange} required rows={2} placeholder="House/Unit No., Street, Barangay, City, Province"
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.address ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                  </div>

                  {/* ── Emergency Contact ── */}
                  <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Emergency Contact</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Name <span style={{ color: "#e53935" }}>*</span></label>
                      <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} required
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.emergency_contact_name ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Relationship</label>
                      <input name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange} placeholder="e.g. Parent, Sibling"
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Contact Number <span style={{ color: "#e53935" }}>*</span></label>
                      <input name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleChange} required
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.emergency_contact_number ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  </fieldset>

                  {/* ── Profile Picture ── */}
                  <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Profile Photo</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: YELLOW, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, fontSize: "1.4rem", fontWeight: 900, color: "#222" }}>
                      {preview ? <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(`${formData.first_name} ${formData.last_name}`)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: "0.88rem" }} />
                      <p style={{ color: "#aaa", fontSize: "0.75rem", margin: "4px 0 0" }}>JPEG, PNG, or WEBP. Max 5 MB.</p>
                    </div>
                    <button type="button" onClick={handleRemovePhoto} disabled={!preview && !formData.profile_picture}
                      style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", color: "#777" }}>
                      Remove
                    </button>
                  </div>

                  <button type="submit" disabled={saving}
                    style={{ background: YELLOW, color: "#222", fontWeight: 800, fontSize: "0.95rem", padding: "12px 32px", borderRadius: 8, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving..." : user?.role === "student" && isProfileLockedForCurrentTerm ? "Update Profile Picture" : "Save Changes"}
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
                    {/* Avatar */}
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
                      <InfoField label="Full Name" value={suffix ? `${fullName}, ${suffix}` : fullName} />
                      <InfoField label="Student ID" value={studentId} />
                      <InfoField label="Email Address" value={email} />
                      <InfoField label="Alternate Email" value={alternateEmail} />
                      <InfoField label="Phone Number" value={contactNumber} />
                      <InfoField label="Sex" value={sex ? sex : null} />
                      <InfoField label="Citizenship" value={citizenship} />
                      {preferredName && <InfoField label="Preferred Name" value={preferredName} />}
                    </div>
                  </div>
                  {(address || emergencyContactName) && (
                    <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 24, paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 48px" }}>
                      {address && <InfoField label="Address" value={address} />}
                      {emergencyContactName && <InfoField label="Emergency Contact" value={emergencyContactName + (emergencyContactRelationship ? ` (${emergencyContactRelationship})` : "")} />}
                      {emergencyContactNumber && <InfoField label="Emergency Number" value={emergencyContactNumber} />}
                    </div>
                  )}
                </div>

              </>
            )}

            {/* ── Change Password ── */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginTop: 24 }}>
              <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#111", marginBottom: 20, marginTop: 0 }}>Change Password</h3>
              {passwordError && (
                <div style={{ background: "#fff3f3", color: "#c62828", border: "1px solid #e57373", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: "0.88rem" }}>{passwordError}</div>
              )}
              {passwordSuccess && (
                <div style={{ background: "#f0fff4", color: "#2e7d32", border: "1px solid #81c784", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: "0.88rem" }}>{passwordSuccess}</div>
              )}
              <form onSubmit={handlePasswordSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                  {[{ name: "oldPassword", label: "Current Password" }, { name: "newPassword", label: "New Password" }, { name: "confirmPassword", label: "Confirm New Password" }].map(({ name, label }) => (
                    <div key={name}>
                      <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                      <input type="password" name={name} value={passwordData[name]} onChange={handlePasswordFieldChange} autoComplete={name === "oldPassword" ? "current-password" : "new-password"} required
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={passwordSaving}
                  style={{ background: "#1976d2", color: "#fff", fontWeight: 800, fontSize: "0.92rem", padding: "10px 28px", borderRadius: 8, border: "none", cursor: passwordSaving ? "not-allowed" : "pointer", opacity: passwordSaving ? 0.7 : 1 }}>
                  {passwordSaving ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
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

export default Profile;
