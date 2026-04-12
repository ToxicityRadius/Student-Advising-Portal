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

module.exports = {
  FACULTY_EMAIL_WHITELIST,
};
