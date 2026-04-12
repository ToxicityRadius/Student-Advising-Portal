import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import StudentLayout from '../components/student/StudentLayout';
import GradesStatsGrid from '../components/student/GradesStatsGrid';
import SemesterCard from '../components/student/SemesterCard';
import { semesterLabel, normalizeStatus, semesterGwa, formatGwa } from '../utils/gradeHelpers';
import './ViewGrades.css';

const STATUS_FILTERS = ['All', 'Passed', 'Failed', 'INC', 'DRP', 'In Progress', 'Not Yet Taken'];

const ViewGrades = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const availableSubjectsCount = 0;

  const loadGrades = useCallback(() => {
    setLoading(true);
    setError('');

    api
      .get('/users/me/dashboard')
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
          setError('Unable to load grades right now.');
        }
      })
      .catch(() => {
        setError('Unable to load grades right now.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const enrichedSemesters = useMemo(() => {
    const semesters = dashboardData?.semesterSummary || [];

    return semesters.map((semester, index) => {
      const courses = (semester.courses || []).map((course) => ({
        ...course,
        normalizedStatus: normalizeStatus(course),
      }));

      const passedCount = courses.filter((course) => course.normalizedStatus === 'Passed').length;
      const failedCount = courses.filter((course) => course.normalizedStatus === 'Failed').length;

      return {
        key: `${semester.yearLevel}-${semester.semester}-${index}`,
        title: semesterLabel(semester.yearLevel, semester.semester),
        subtitle: semester.status || 'Academic Term',
        units: courses.reduce((sum, course) => sum + Number(course.units || 0), 0),
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
          const matchesStatus = statusFilter === 'All' || course.normalizedStatus === statusFilter;
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
      .filter((semester) => semester.filteredCourses.length > 0 || statusFilter === 'All');
  }, [enrichedSemesters, search, statusFilter]);

  const subjectsTaken = allCourses.length;
  const passedSubjects = allCourses.filter((course) => course.normalizedStatus === 'Passed').length;
  const failedSubjects = allCourses.filter((course) => course.normalizedStatus === 'Failed').length;
  const unitsEarned = Number(dashboardData?.unitsCredited || 0);
  const totalUnits = Number(dashboardData?.totalUnits || 0);
  const progressPercent =
    totalUnits > 0 ? Math.min(100, Math.round((unitsEarned / totalUnits) * 100)) : 0;
  const gwa = dashboardData?.gwa != null ? formatGwa(dashboardData.gwa) : '--';

  const completionStats = useMemo(() => {
    const completed = allCourses.filter((course) => course.normalizedStatus === 'Passed').length;
    const failed = allCourses.filter((course) => course.normalizedStatus === 'Failed').length;
    const inProgress = allCourses.filter(
      (course) => course.normalizedStatus === 'In Progress',
    ).length;
    const total = allCourses.length;
    const remaining = Math.max(0, total - completed - failed - inProgress);
    const completionPercent =
      totalUnits > 0 ? Math.min(100, Math.round((unitsEarned / totalUnits) * 100)) : 0;

    return { completed, failed, inProgress, remaining, completionPercent };
  }, [allCourses, unitsEarned, totalUnits]);

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <StudentLayout
      activePage="grades"
      pageTitle="View Grades"
      availableSubjectsCount={availableSubjectsCount}
    >
      <div className="grades-page">
        <div className="grades-content">
          <section className="grades-hero">
            <h1>Grades &amp; Checklist</h1>
            <p>Your complete academic history and curriculum progress</p>
          </section>

          {loading ? (
            <section className="grades-panel grades-loading">Loading grade records...</section>
          ) : error ? (
            <section className="grades-panel grades-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={loadGrades} className="btn btn-warning btn-sm mt-2">
                Retry
              </button>
            </section>
          ) : (
            <>
              <section className="grades-overall-card">
                <div className="grades-overall-head">
                  <h2>Overall Completion</h2>
                  <strong>{completionStats.completionPercent}%</strong>
                </div>
                <div className="grades-overall-progress">
                  <div style={{ width: `${completionStats.completionPercent}%` }} />
                </div>
                <div className="grades-overall-grid">
                  <article>
                    <span>Completed</span>
                    <h3>{completionStats.completed}</h3>
                    <p>subjects passed</p>
                  </article>
                  <article>
                    <span>In Progress</span>
                    <h3>{completionStats.inProgress}</h3>
                    <p>currently enrolled</p>
                  </article>
                  <article>
                    <span>Remaining</span>
                    <h3>{completionStats.remaining}</h3>
                    <p>subjects left</p>
                  </article>
                  <article>
                    <span>Failed</span>
                    <h3>{completionStats.failed}</h3>
                    <p>need retake</p>
                  </article>
                </div>
              </section>

              <GradesStatsGrid
                gwa={gwa}
                unitsEarned={unitsEarned}
                totalUnits={totalUnits}
                progressPercent={progressPercent}
                subjectsTaken={subjectsTaken}
                passedSubjects={passedSubjects}
                failedSubjects={failedSubjects}
              />

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
                      className={statusFilter === label ? 'is-active' : ''}
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

                {filteredSemesters.map((semester) => (
                  <SemesterCard
                    key={semester.key}
                    semester={semester}
                    isOpen={!!expanded[semester.key]}
                    onToggle={() => toggleExpanded(semester.key)}
                  />
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default ViewGrades;
