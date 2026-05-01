/**
 * Shared application constants.
 *
 * Import from this module instead of scattering magic strings throughout
 * controllers, routes, and middleware.
 */

// ─── Faculty/Admin email rules ─────────────────────────────────────────────
// Emails that are allowed to register/login as faculty or admin even if they
// do not follow the standard .cpe@tip.edu.ph department suffix pattern.
const FACULTY_EMAIL_WHITELIST = Object.freeze(['jennifer.enriquez@tip.edu.ph']);

const ROLE_SUPERADMIN = 'superadmin';
const ROLE_PROGRAM_CHAIR = 'admin';
const ROLE_ADVISER = 'adviser';
const ROLE_STUDENT = 'student';

const ALL_ROLES = Object.freeze([ROLE_SUPERADMIN, ROLE_PROGRAM_CHAIR, ROLE_ADVISER, ROLE_STUDENT]);

const PUBLIC_REGISTRATION_ROLES = Object.freeze([ROLE_STUDENT, ROLE_ADVISER, ROLE_PROGRAM_CHAIR]);

const FACULTY_ROLES = Object.freeze([ROLE_SUPERADMIN, ROLE_PROGRAM_CHAIR, ROLE_ADVISER]);

const ROLE_LABELS = Object.freeze({
  [ROLE_SUPERADMIN]: 'Super Admin',
  [ROLE_PROGRAM_CHAIR]: 'Program Chair',
  [ROLE_ADVISER]: 'Adviser',
  [ROLE_STUDENT]: 'Student',
});

const DEFAULT_PROGRAM_CODE = 'BSCPE';
const DEFAULT_PROGRAM = Object.freeze({
  code: DEFAULT_PROGRAM_CODE,
  name: 'Bachelor of Science in Computer Engineering',
  departmentName: 'Computer Engineering',
  emailSuffix: '.cpe@tip.edu.ph',
  isActive: true,
});

module.exports = {
  FACULTY_EMAIL_WHITELIST,
  ROLE_SUPERADMIN,
  ROLE_PROGRAM_CHAIR,
  ROLE_ADVISER,
  ROLE_STUDENT,
  ALL_ROLES,
  PUBLIC_REGISTRATION_ROLES,
  FACULTY_ROLES,
  ROLE_LABELS,
  DEFAULT_PROGRAM_CODE,
  DEFAULT_PROGRAM,
};
