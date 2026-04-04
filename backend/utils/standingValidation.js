'use strict';

/**
 * standingValidation.js
 *
 * Utilities for enforcing min-year-standing requirements on curriculum courses.
 *
 * minYearStandingRequired encoding (stored in curriculum_courses):
 *   null         — no restriction
 *   1            — 1st Year Standing (student must be in year 1 or above)
 *   2            — 2nd Year Standing
 *   3            — 3rd Year Standing
 *   4            — 4th Year Standing
 *   5            — Graduating (student must have passed all or nearly all courses)
 *
 * "Graduating" is treated as the highest tier and is separate from year level.
 * Advisers and Program Chairs may override 4th-year / graduating violations
 * by passing overrideStanding=true in the request body, which is logged to
 * the audit trail. The elective-track rule (no override) is handled separately.
 */

const STANDING_LABELS = {
  1: '1st Year Standing',
  2: '2nd Year Standing',
  3: '3rd Year Standing',
  4: '4th Year Standing',
  5: 'Graduating',
};

/**
 * Returns a human-readable label for a standing requirement value.
 * @param {number} req
 * @returns {string}
 */
const standingLabel = (req) => STANDING_LABELS[req] || String(req);

/**
 * Returns true if the student currently satisfies the given standing requirement.
 *
 * @param {number|null} minYearStandingRequired — Value from CurriculumCourse
 * @param {number} studentYearLevel            — Current year level from SAR (1-based)
 * @param {boolean} isGraduating               — Whether the student is graduating
 */
const meetsStandingRequirement = (
  minYearStandingRequired,
  studentYearLevel,
  isGraduating = false,
) => {
  if (minYearStandingRequired === null || minYearStandingRequired === undefined) {
    return true;
  }
  const req = Number(minYearStandingRequired);
  if (req === 5) {
    return isGraduating === true;
  }
  return Number(studentYearLevel) >= req;
};

/**
 * Scans a list of CurriculumCourse entries (with Course included) for standing
 * violations against the student's current academic status.
 *
 * @param {Array}   curriculumCourses — CurriculumCourse model instances or plain objects
 * @param {number}  studentYearLevel  — From SAR
 * @param {boolean} isGraduating      — From SAR or inferred from study plan progress
 * @returns {Array<{courseCode, courseName, minYearStandingRequired, studentYearLevel}>}
 */
const checkStandingViolations = (curriculumCourses, studentYearLevel, isGraduating = false) => {
  const violations = [];
  for (const cc of curriculumCourses) {
    const req = cc.minYearStandingRequired ?? null;
    if (!meetsStandingRequirement(req, studentYearLevel, isGraduating)) {
      violations.push({
        courseCode: cc.Course?.code || String(cc.courseId || ''),
        courseName: cc.Course?.name || '',
        minYearStandingRequired: req,
        requiredLabel: standingLabel(req),
        studentYearLevel: Number(studentYearLevel),
        isGraduating,
      });
    }
  }
  return violations;
};

/**
 * Returns true if any violation in the list requires a graduating override
 * (minYearStandingRequired === 5) or a 4th-year override (=== 4).
 * Violations for years 1-3 are considered structural data errors rather than
 * adviser-override scenarios — they should not happen if the curriculum is set
 * up correctly.
 *
 * @param {Array} violations — from checkStandingViolations
 * @returns {boolean}
 */
const requiresAdviserOverride = (violations) =>
  violations.some((v) => v.minYearStandingRequired >= 4);

module.exports = {
  meetsStandingRequirement,
  checkStandingViolations,
  standingLabel,
  requiresAdviserOverride,
};
