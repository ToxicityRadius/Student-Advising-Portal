import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import StudentShell from "../components/student/StudentShell";

import searchIconImg from "../assets/images/Search Bar Black.png";

import "./AvailableSubjects.css";

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

const AvailableSubjects = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("All");

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

  const filteredSubjects = useMemo(() => {
    const term = query.trim().toLowerCase();

    return availableSubjects.filter((subject) => {
      const matchesQuery =
        !term ||
        subject.code.toLowerCase().includes(term) ||
        subject.name.toLowerCase().includes(term);
      const matchesYear =
        yearFilter === "All" || String(subject.year) === yearFilter;
      return matchesQuery && matchesYear;
    });
  }, [availableSubjects, query, yearFilter]);

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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <StudentShell
      user={user}
      onLogout={handleLogout}
      activeNav="subjects"
      pageLabel="AVAILABLE SUBJECTS"
      shellClassPrefix="subjects"
      subjectsBadgeCount={availableSubjects.length}
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
                        onClick={() => setYearFilter(option)}
                        className={yearFilter === option ? "is-active" : ""}
                      >
                        {option === "All"
                          ? "All Years"
                          : `${formatYearLevel(option)}`}
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
    </StudentShell>
  );
};

export default AvailableSubjects;
