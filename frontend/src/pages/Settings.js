import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { buildProfileImageUrl } from "../utils/profileImage";
import useNotifications from "../utils/useNotifications";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import AdminLayout from "../components/admin/AdminLayout";
import AdviserLayout from "../components/adviser/AdviserLayout";

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
import goldSettingsImg from "../assets/images/Gold Settings.png";
import goldHelpImg from "../assets/images/Gold Help & Support.png";
import goldLogoutImg from "../assets/images/Gold Logout.png";

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
    <span style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {icon}
    </span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge && (
      <span style={{ background: "#e53935", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: "0.62rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {badge}
      </span>
    )}
  </Link>
);

const SettingRow = ({ label, description, children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #f0f0f0", gap: 16, flexWrap: "wrap" }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: "#111", fontSize: "0.95rem" }}>{label}</div>
      {description && <div style={{ fontSize: "0.82rem", color: "#888", marginTop: 2 }}>{description}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      background: checked ? YELLOW : "#ddd",
      border: "none",
      cursor: "pointer",
      position: "relative",
      transition: "background 0.2s",
      outline: "none",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
        display: "block",
      }}
    />
  </button>
);

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notifRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 780 : false,
  );
  const { notifications, notifCount } = useNotifications();

  // Settings state
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [advisingReminders, setAdvisingReminders] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 780;
      setIsMobileView(isMobile);
      if (!isMobile) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentTermLabel, setCurrentTermLabel] = useState("—");

  useEffect(() => {
    api.get("/terms/current").then(({ data }) => {
      const sem = data?.semester ?? data?.term?.semester;
      const map = { 1: "1st Semester", 2: "2nd Semester", 3: "Summer" };
      if (sem && map[sem]) setCurrentTermLabel(map[sem]);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const firstName = user?.firstName || user?.first_name || "";
  const lastName = user?.lastName || user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Student";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "ST";
  const studentId = user?.studentId || user?.student_id || "";
  const yearLevel = user?.yearLevel || user?.year_level || "";
  const program = user?.program || "";
  const studentType = user?.student_type || user?.studentType || "";
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";
  const profilePicUrl = buildProfileImageUrl(user?.profile_picture || user?.profilePicture || "");

  const imgIcon = (src, size = 22) => (
    <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
  );

  // ── Admin / Adviser: render inside their own sidebar layout ──
  if (user?.role === 'admin' || user?.role === 'adviser') {
    const Layout = user.role === 'admin' ? AdminLayout : AdviserLayout;
    return (
      <Layout activePage="" pageTitle="Settings">
        <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111", marginBottom: 4 }}>Account</h2>
          <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Manage your login credentials and security.</p>
          <SettingRow label="Email Address" description={user?.email || "—"}>
            <Link to="/change-email" style={{ padding: "7px 18px", borderRadius: 8, background: YELLOW, color: "#000", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>Change</Link>
          </SettingRow>
          <SettingRow label="Password" description="Last changed: unknown">
            <Link to="/change-password" style={{ padding: "7px 18px", borderRadius: 8, background: YELLOW, color: "#000", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>Change</Link>
          </SettingRow>
          <SettingRow label="Profile Information" description="Update your name, photo, program, and contact details.">
            <Link to="/profile" style={{ padding: "7px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", color: "#333", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>Edit Profile</Link>
          </SettingRow>
        </section>
        <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111", marginBottom: 4 }}>Notifications</h2>
          <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Choose what updates you receive and how.</p>
          <SettingRow label="Email notifications" description="Receive updates about your advising sessions via email.">
            <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
          </SettingRow>
          <SettingRow label="In-app notifications" description="Show alerts inside the portal when something needs your attention.">
            <Toggle checked={inAppNotifs} onChange={setInAppNotifs} />
          </SettingRow>
          <SettingRow label="Advising reminders" description="Remind me of upcoming advising deadlines and term events.">
            <Toggle checked={advisingReminders} onChange={setAdvisingReminders} />
          </SettingRow>
        </section>
        <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111", marginBottom: 4 }}>Display</h2>
          <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Adjust how the portal looks for you.</p>
          <SettingRow label="Compact mode" description="Reduce spacing in tables and lists for a denser layout.">
            <Toggle checked={compactMode} onChange={setCompactMode} />
          </SettingRow>
        </section>
        <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1.5px solid #ffe0e0" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#c62828", marginBottom: 4 }}>Session</h2>
          <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Sign out of your current session.</p>
          <button onClick={() => setShowLogoutConfirm(true)} style={{ padding: "8px 22px", borderRadius: 8, background: "#fff", border: "1.5px solid #e53935", color: "#e53935", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>Sign Out</button>
        </section>
        <LogoutConfirmModal show={showLogoutConfirm} onCancel={() => setShowLogoutConfirm(false)} onConfirm={handleLogout} />
      </Layout>
    );
  }

  // ── Student: full inline sidebar ──

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', sans-serif", overflow: "hidden", background: "#f5f5f5" }}>
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
          transform: isMobileView && !mobileMenuOpen ? "translateX(-100%)" : "none",
          transition: isMobileView ? "transform 0.2s ease" : "none",
        }}
      >
        {/* Avatar + user info */}
        <div style={{ padding: "24px 20px 20px", textAlign: "center", borderBottom: "1px solid #f0f0f0", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 88, height: 88, borderRadius: "50%", background: YELLOW,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", fontWeight: 900, color: "#222", overflow: "hidden",
              flexShrink: 0, marginBottom: 12,
              boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${YELLOW}`,
            }}
          >
            {profilePicUrl ? (
              <img src={profilePicUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : initials}
          </div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#111", marginBottom: 4, lineHeight: 1.3 }}>{fullName}</div>
          <div style={{ fontSize: "0.82rem", color: "#888", fontWeight: 600, marginBottom: 14 }}>{studentId}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {[
              `${yearLevel ? formatYearLevel(yearLevel) : "—"} · ${currentTermLabel}`,
              [studentType || roleLabel || null, program || null].filter(Boolean).join(" · ") || null,
            ].filter(Boolean).map((tag, i) =>
              (
                <span key={i} style={{ background: "linear-gradient(135deg, #FFD54F 0%, #FFC107 100%)", color: "#4E342E", fontSize: "0.73rem", fontWeight: 700, padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap", textAlign: "center", boxShadow: "0 2px 6px rgba(255,193,7,0.30)", letterSpacing: "0.2px" }}>
                  {tag}
                </span>
              )
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8 }}>
          <div style={{ padding: "10px 16px 6px", fontSize: "0.68rem", fontWeight: 700, color: "#bbb", letterSpacing: 1.5 }}>MAIN</div>
          <SideNavItem icon={imgIcon(goldHomePageImg)} label="Dashboard" to="/dashboard" />
          <SideNavItem icon={imgIcon(goldBookImg)} label="Available Subjects" to="/subjects" />
          <SideNavItem icon={imgIcon(goldPlanImg)} label="Study Plan" to="/plan-of-study" />
          <SideNavItem icon={imgIcon(goldGradesImg)} label="View Grades" to="/grades" />
          <SideNavItem icon={imgIcon(goldChecklistImg)} label="Checklist" to="/checklist" />

          <div style={{ padding: "14px 16px 6px", fontSize: "0.68rem", fontWeight: 700, color: "#bbb", letterSpacing: 1.5 }}>ACCOUNT</div>
          <SideNavItem icon={imgIcon(goldUserImg)} label="Profile" to="/profile" />
          <SideNavItem active icon={imgIcon(goldSettingsImg)} label="Settings" to="/settings" />
          <SideNavItem icon={imgIcon(goldHelpImg)} label="Help & Support" to="/help" />

          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", color: "#444", fontSize: "0.9rem", fontWeight: 600, borderLeft: "4px solid transparent", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = YELLOW; e.currentTarget.style.boxShadow = "0 0 12px rgba(255,193,7,0.6)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.color = "#555"; }}
          >
            <span style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{imgIcon(goldLogoutImg)}</span>
            <span>Logout</span>
          </button>
        </nav>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
          <p style={{ fontSize: "0.63rem", color: "#ccc", lineHeight: 1.5, margin: 0 }}>
            TIP Student Advising System<br />v1.0.0 | © 2025
          </p>
        </div>
      </aside>

      {isMobileView && mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
          style={{ position: "fixed", inset: 0, border: 0, background: "rgba(0,0,0,0.35)", zIndex: 210, cursor: "pointer" }}
        />
      )}

      {/* ══════════ MAIN AREA ══════════ */}
      <div style={{ flex: 1, marginLeft: isMobileView ? 0 : SIDEBAR_W, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f5f5f5" }}>
        {/* Topbar */}
        <header style={{ background: YELLOW, height: 70, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobileView ? "0 14px" : "0 28px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? 10 : 24, minWidth: 0, flex: 1 }}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              style={{ display: isMobileView ? "inline-flex" : "none", border: 0, background: "rgba(255,255,255,0.28)", width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 7H20M4 12H20M4 17H20" stroke="#222" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <img src={logo} alt="Student Advising" style={{ height: isMobileView ? 34 : 46, width: "auto", objectFit: "contain" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: isMobileView ? "0.75rem" : "0.85rem", fontWeight: 600 }}>
              <Link to="/" style={{ textDecoration: "none", color: "rgba(0,0,0,0.55)", fontWeight: 600 }}>HOME</Link>
              <span style={{ color: "rgba(0,0,0,0.4)", margin: "0 2px" }}>›</span>
              <span style={{ color: "#111", fontWeight: 800 }}>Settings</span>
            </div>
          </div>

          {/* Notification bell */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <div
              style={{ position: "relative", padding: 10, cursor: "pointer", borderRadius: 10, transition: "background-color 0.15s" }}
              onClick={() => setNotifOpen((o) => !o)}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <img src={bellIconImg} alt="Notifications" style={{ width: 28, height: 28, objectFit: "contain" }} />
              {notifCount > 0 && (
                <span style={{ position: "absolute", top: 6, right: 6, background: "#e53935", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </div>
            {notifOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 300, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Notifications</span>
                  <button onClick={() => setAllRead(true)} style={{ background: "none", border: "none", color: YELLOW, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>Mark all read</button>
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "24px 16px", textAlign: "center", color: "#aaa", fontSize: "0.88rem" }}>No notifications</div>
                  ) : notifications.map((n, i) => (
                    <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #f7f7f7", display: "flex", gap: 10, alignItems: "flex-start", background: n.read || allRead ? "#fff" : "#fffbea" }}>
                      <img src={n.read || allRead ? boxCheckImg : boxUncheckImg} alt="" style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#111" }}>{n.title}</div>
                        <div style={{ fontSize: "0.78rem", color: "#888", marginTop: 2 }}>{n.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f5f5f5" }}>
          {/* Account settings */}
          <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111", marginBottom: 4 }}>Account</h2>
            <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Manage your login credentials and security.</p>

            <SettingRow label="Email Address" description={user?.email || "—"}>
              <Link to="/change-email" style={{ padding: "7px 18px", borderRadius: 8, background: YELLOW, color: "#000", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>Change</Link>
            </SettingRow>
            <SettingRow label="Password" description="Last changed: unknown">
              <Link to="/change-password" style={{ padding: "7px 18px", borderRadius: 8, background: YELLOW, color: "#000", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>Change</Link>
            </SettingRow>
            <SettingRow label="Profile Information" description="Update your name, photo, program, and contact details.">
              <Link to="/profile" style={{ padding: "7px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", color: "#333", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>Edit Profile</Link>
            </SettingRow>
          </section>

          {/* Notification settings */}
          <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111", marginBottom: 4 }}>Notifications</h2>
            <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Choose what updates you receive and how.</p>

            <SettingRow label="Email notifications" description="Receive updates about your advising sessions via email.">
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
            </SettingRow>
            <SettingRow label="In-app notifications" description="Show alerts inside the portal when something needs your attention.">
              <Toggle checked={inAppNotifs} onChange={setInAppNotifs} />
            </SettingRow>
            <SettingRow label="Advising reminders" description="Remind me of upcoming advising deadlines and term events.">
              <Toggle checked={advisingReminders} onChange={setAdvisingReminders} />
            </SettingRow>
          </section>

          {/* Display settings */}
          <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111", marginBottom: 4 }}>Display</h2>
            <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Adjust how the portal looks for you.</p>

            <SettingRow label="Compact mode" description="Reduce spacing in tables and lists for a denser layout.">
              <Toggle checked={compactMode} onChange={setCompactMode} />
            </SettingRow>
          </section>

          {/* Danger zone */}
          <section style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1.5px solid #ffe0e0" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#c62828", marginBottom: 4 }}>Session</h2>
            <p style={{ fontSize: "0.83rem", color: "#888", marginBottom: 16, marginTop: 0 }}>Sign out of your current session.</p>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{ padding: "8px 22px", borderRadius: 8, background: "#fff", border: "1.5px solid #e53935", color: "#e53935", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </section>
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

export default Settings;
