/**
 * Shared application constants.
 *
 * Import from this module instead of scattering magic strings throughout
 * controllers, routes, and middleware.
 */

// ─── User roles ────────────────────────────────────────────────────────────
const ROLES = Object.freeze({
  STUDENT: 'student',
  ADVISER: 'adviser',
  ADMIN: 'admin'
});

// ─── Valid sex/gender options ───────────────────────────────────────────────
const ALLOWED_SEX = Object.freeze([
  'Male',
  'Female',
  'Non-binary',
  'Prefer not to say'
]);

// ─── Valid student types ────────────────────────────────────────────────────
const ALLOWED_STUDENT_TYPES = Object.freeze([
  'regular',
  'irregular',
  'transferee',
  'ladderized'
]);

// ─── Academic year/semester ranges ─────────────────────────────────────────
const MIN_YEAR_LEVEL = 1;
const MAX_YEAR_LEVEL = 5;

const MIN_SEMESTER = 1;
const MAX_SEMESTER = 3; // includes summer

// ─── Unit ranges ───────────────────────────────────────────────────────────
const MIN_COURSE_UNITS = 0;
const MAX_COURSE_UNITS = 9;

// ─── File upload limits ─────────────────────────────────────────────────────
const MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

// ─── Pagination defaults ────────────────────────────────────────────────────
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ─── Security ──────────────────────────────────────────────────────────────
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCKOUT_MS = 15 * 60 * 1000; // 15 min
const LOGIN_LOCKOUT_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION_SECONDS = 300; // 5 min

module.exports = {
  ROLES,
  ALLOWED_SEX,
  ALLOWED_STUDENT_TYPES,
  MIN_YEAR_LEVEL,
  MAX_YEAR_LEVEL,
  MIN_SEMESTER,
  MAX_SEMESTER,
  MIN_COURSE_UNITS,
  MAX_COURSE_UNITS,
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_VERIFY_ATTEMPTS,
  VERIFY_LOCKOUT_MS,
  LOGIN_LOCKOUT_MAX_ATTEMPTS,
  LOGIN_LOCKOUT_DURATION_SECONDS
};
