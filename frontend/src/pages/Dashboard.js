import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { getHomePathForRole } from "../utils/roleRedirect";
import StudentLayout, { formatYearLevel } from "../components/student/StudentLayout";

import "./Dashboard.css";

const YELLOW = "#FFC107";

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

/* ══════════════════════════════════════
   Main Dashboard component
══════════════════════════════════════ */
const Dashboard = () => {
  const { user } = useAuth();
  const yearLevel = user?.year_level || user?.yearLevel || "";

  /* Progress data — from API */
  const [dashData, setDashData] = useState(null);
  const [dashError, setDashError] = useState('');
  const [semPage, setSemPage] = useState(0);
  const unitsCredited = dashData ? dashData.unitsCredited : 0;
  const totalUnits = dashData ? dashData.totalUnits || 195 : 195;
  const progressPercent =
    totalUnits > 0 ? Math.round((unitsCredited / totalUnits) * 100) : 0;

  // Fetch dashboard data from backend
  useEffect(() => {
    if (user?.role && user.role !== 'student') return;
    api
      .get("/dashboard/summary")
      .then((r) => {
        if (!r.data.success || !r.data.data) {
          return;
        }

        const payload = r.data.data;
        const kpis = payload?.sar?.kpis || {};

        setDashData({
          unitsCredited: Number(kpis.completionPercentage || 0),
          totalUnits: 100,
          gwa: kpis.gwa,
          subjectsCompleted: 0,
          subjectsPending: Number(kpis.remainingUnits || 0)
        });
      })
      .catch((err) => {
        setDashError(
          err?.response?.data?.message || 'Failed to load dashboard data. Please refresh to try again.'
        );
      });
  }, []);

  const semesterLabel = yearLevel
    ? `${formatYearLevel(yearLevel)}, 1st Semester`
    : "1st Semester";

  // Redirect non-student roles to their own home page
  if (user?.role && user.role !== 'student') {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  return (
    <StudentLayout activePage="dashboard" pageTitle="Dashboard">
      <div style={{ padding: "28px 32px" }}>
          {dashError && (
            <div
              role="alert"
              style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                color: '#664d03',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span>{dashError}</span>
              <button
                onClick={() => setDashError('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#664d03', fontSize: '1rem' }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
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
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
