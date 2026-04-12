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

module.exports = {
  meetsStandingRequirement,
  standingLabel,
};
