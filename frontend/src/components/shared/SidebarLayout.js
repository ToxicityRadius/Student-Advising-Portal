import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../LogoutConfirmModal";
import SideNavItem from "./SideNavItem";
import { buildProfileImageUrl } from "../../utils/profileImage";

import logo from "../../assets/images/STUDENT ADVISING LOGO 1.png";
import goldSettingsImg from "../../assets/images/Gold Settings.png";
import goldHelpImg from "../../assets/images/Gold Help & Support.png";
import goldLogoutImg from "../../assets/images/Gold Logout.png";

import "./SidebarLayout.css";

const YELLOW = "#FFC107";

const imgIcon = (src, size = 22) => (
  <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
);

/**
 * Shared sidebar layout for admin and adviser pages.
 *
 * Props:
 *  - activePage: key of the currently active nav item
 *  - pageTitle: shown in the topbar breadcrumb
 *  - navItems: array of { key, label, to, icon }
 *  - roleLabel: e.g. "Program Chair" or "Adviser" (shown under name)
 *  - children: page content
 */
const SidebarLayout = ({ activePage, pageTitle, navItems, roleLabel, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 780) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const firstName = user?.firstName || user?.first_name || "";
  const lastName = user?.lastName || user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "User";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  const avatarUrl = buildProfileImageUrl(user?.profile_picture || user?.profilePicture);

  return (
    <div className="sidebar-layout">
      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`sidebar-layout__sidebar ${mobileMenuOpen ? "open" : ""}`}>
        {/* User profile */}
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
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initials
            )}
          </div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#111", marginBottom: 4, lineHeight: 1.3 }}>
            {fullName}
          </div>
          <div style={{ fontSize: "0.82rem", color: "#888", fontWeight: 600, marginBottom: 14 }}>
            {roleLabel}
          </div>
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
          {navItems.map((item) => (
            <SideNavItem
              key={item.key}
              active={activePage === item.key}
              icon={item.icon}
              label={item.label}
              to={item.to}
            />
          ))}

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
          <SideNavItem icon={imgIcon(goldSettingsImg)} label="Settings" to="/settings" />
          <SideNavItem icon={imgIcon(goldHelpImg)} label="Help & Support" to="/help" />

          {/* Logout */}
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
            <span style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {imgIcon(goldLogoutImg)}
            </span>
            <span>Logout</span>
          </button>
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
          <p style={{ fontSize: "0.63rem", color: "#ccc", lineHeight: 1.5, margin: 0 }}>
            TIP Student Advising System
            <br />
            v1.0.0 | &copy; 2025
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-layout__mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      {/* ══════════ MAIN AREA ══════════ */}
      <div className="sidebar-layout__main">
        <header
          className="sidebar-layout__topbar"
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
              className="sidebar-layout__mobile-btn"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 7H20M4 12H20M4 17H20" stroke="#222" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <img src={logo} alt="Student Advising" style={{ height: 46, objectFit: "contain" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              <Link to="/" style={{ textDecoration: "none", color: "rgba(0,0,0,0.55)", fontWeight: 600 }}>
                HOME
              </Link>
              <span style={{ color: "rgba(0,0,0,0.4)", margin: "0 2px" }}>›</span>
              <span style={{ color: "#111", fontWeight: 800 }}>{pageTitle}</span>
            </div>
          </div>
        </header>

        <main className="sidebar-layout__content">
          <div style={{ padding: "28px 32px" }}>{children}</div>
        </main>
      </div>

      <LogoutConfirmModal
        show={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default SidebarLayout;
