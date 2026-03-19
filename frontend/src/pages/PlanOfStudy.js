import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import capImg from "../assets/images/Graduation Cap Black.png";
import StudentLayout from "../components/student/StudentLayout";
import "./PlanOfStudy.css";

const semesterLabel = (yearLevel, semester) => {
  const ordinals = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
  const semesterNames = {
    1: "1st Semester",
    2: "2nd Semester",
    3: "Summer",
  };

  const yearText = ordinals[yearLevel]
    ? `${ordinals[yearLevel]} Year`
    : `Year ${yearLevel}`;
  const semText = semesterNames[semester] || `Semester ${semester}`;
  return `${yearText}, ${semText}`;
};

const normalizeStatus = (course) => {
  const raw = String(course.status || "").toLowerCase();

  if (raw === "completed" || raw === "passed") return "Completed";
  if (raw === "credited") return "Completed";
  if (raw === "failed") return "Failed";
  if (raw === "ongoing") return "In Progress";
  if (raw === "incomplete") return "Incomplete";
  if (raw === "dropped" || raw === "drop") return "Dropped";
  if (raw === "not yet taken") return "Not Yet Taken";
  return "Pending";
};

const getReviewStatusPresentation = (workflow) => {
  if (!workflow?.hasStudyPlan) {
    return {
      label: "Study Plan Not Started",
      variant: "not-started"
    };
  }

  if (workflow.needsRevalidation) {
    return {
      label: "Needs Adviser Revalidation",
      variant: "revalidation"
    };
  }

  if (workflow.reviewStatus === "approved") {
    return {
      label: "Validated by Adviser",
      variant: "approved"
    };
  }

  if (workflow.reviewStatus === "reviewed") {
    return {
      label: "Adviser Review Complete",
      variant: "reviewed"
    };
  }

  if (workflow.reviewStatus === "draft") {
    return {
      label: "Pending Adviser Review",
      variant: "pending"
    };
  }

  return {
    label: "Study Plan Not Started",
    variant: "not-started"
  };
};

const PlanOfStudy = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");

  const loadStudyPlan = useCallback(() => {
    setLoading(true);
    setError("");

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
          setError("Unable to load study plan right now.");
        }
      })
      .catch(() => {
        setError("Unable to load study plan right now.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadStudyPlan();
  }, [loadStudyPlan]);

  const semesterCards = useMemo(() => {
    const semesters = dashboardData?.semesterSummary || [];

    return semesters.map((semester, index) => {
      const courses = (semester.courses || []).map((course) => ({
        ...course,
        normalizedStatus: normalizeStatus(course),
      }));

      const units = courses.reduce(
        (sum, course) => sum + Number(course.units || 0),
        0,
      );
      const completedUnits = courses
        .filter((course) => course.normalizedStatus === "Completed")
        .reduce((sum, course) => sum + Number(course.units || 0), 0);
      const completionPercent =
        units > 0 ? Math.round((completedUnits / units) * 100) : 0;

      return {
        key: `${semester.yearLevel}-${semester.semester}-${index}`,
        title: semesterLabel(semester.yearLevel, semester.semester),
        subtitle: "August 2025 - December 2025",
        units,
        completionPercent,
        courses,
      };
    });
  }, [dashboardData]);

  const unitsCompleted = Number(dashboardData?.unitsCredited || 0);
  const totalUnits = Number(dashboardData?.totalUnits || 0);
  const unitsRemaining = Math.max(0, totalUnits - unitsCompleted);

  const estimatedGrad = useMemo(() => {
    const now = new Date();
    return `May ${now.getFullYear() + 1}`;
  }, []);

  const semestersRemaining = useMemo(() => {
    const ratio = totalUnits > 0 ? unitsRemaining / totalUnits : 0;
    return Math.max(1, Math.ceil(ratio * 8));
  }, [totalUnits, unitsRemaining]);

  const reviewPresentation = useMemo(
    () => getReviewStatusPresentation(dashboardData?.adviserReviewWorkflow),
    [dashboardData?.adviserReviewWorkflow],
  );
  const canExportValidatedPlan = reviewPresentation.variant === "approved" && Boolean(dashboardData?.sarId);

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExportValidatedPlan = async () => {
    if (!canExportValidatedPlan || exportingPdf) {
      return;
    }

    setExportingPdf(true);
    setExportError("");
    try {
      const response = await api.get(`/sars/${dashboardData.sarId}/export/pdf`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Study-Plan-${dashboardData.sarId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error?.response?.data?.message || "Unable to export Study Plan PDF right now.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <StudentLayout activePage="plan-of-study" pageTitle="Study Plan">
      <div className="pos-page">
            <section className="pos-hero">
              <h1>Study Plan</h1>
              <p>Your personalized roadmap to graduation</p>
            </section>

            {loading ? (
              <section className="pos-panel pos-loading">
                Loading study plan...
              </section>
            ) : error ? (
              <section className="pos-panel pos-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={loadStudyPlan} className="btn btn-warning btn-sm mt-2">
                  Retry
                </button>
              </section>
            ) : (
              <>
                <section className="pos-summary-card">
                  <img src={capImg} alt="" className="pos-summary-cap" />
                  <div className={`pos-summary-review pos-summary-review--${reviewPresentation.variant}`}>
                    {reviewPresentation.label}
                  </div>
                  {canExportValidatedPlan && (
                    <button
                      type="button"
                      className="pos-summary-export-btn"
                      onClick={handleExportValidatedPlan}
                      disabled={exportingPdf}
                    >
                      {exportingPdf ? "Exporting..." : "Export PDF"}
                    </button>
                  )}
                  {exportError && (
                    <div className="pos-summary-export-error">{exportError}</div>
                  )}
                  <span>Estimated Graduation</span>
                  <h2>{estimatedGrad}</h2>
                  <p>{semestersRemaining} semester remaining</p>

                  <div className="pos-summary-grid">
                    <article>
                      <small>Complete Units</small>
                      <strong>{unitsCompleted} units</strong>
                    </article>
                    <article>
                      <small>Remaining Units</small>
                      <strong>{unitsRemaining} units</strong>
                    </article>
                    <article>
                      <small>Total Required</small>
                      <strong>{totalUnits} units</strong>
                    </article>
                  </div>
                </section>

                <section className="pos-timeline">
                  {(semesterCards || []).map((semester, idx) => {
                    const isOpen = !!expanded[semester.key];
                    return (
                      <article key={semester.key} className="pos-semester-card">
                        <div
                          className="pos-dot"
                          style={{ top: idx === 0 ? 14 : 26 }}
                        />
                        <button
                          type="button"
                          className="pos-semester-head"
                          onClick={() => toggleExpanded(semester.key)}
                        >
                          <div>
                            <h3>{semester.title}</h3>
                          </div>
                          <div className="pos-semester-kpi">
                            <span>Total Units</span>
                            <strong>{semester.units}</strong>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="pos-courses">
                            {(semester.courses || []).map((course, i) => (
                              <div
                                key={`${semester.key}-${course.code}-${i}`}
                                className={`pos-course-row${course.normalizedStatus === "Not Yet Taken" || course.normalizedStatus === "Pending" ? " pos-course-row--greyed" : ""}`}
                              >
                                <span className="pos-course-code">
                                  {course.code || "CPE 000"}
                                </span>
                                <span className="pos-course-name">
                                  {course.name || "Course title unavailable"}
                                </span>
                                <span className="pos-course-units">
                                  {course.units || 0} units
                                </span>
                                <span
                                  className={`pos-course-badge pos-course-badge--${course.normalizedStatus.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {course.normalizedStatus}
                                </span>
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
    </StudentLayout>
  );
};

export default PlanOfStudy;
