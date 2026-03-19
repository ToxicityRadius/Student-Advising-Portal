/**
 * CSRF protection using the double-submit cookie pattern.
 *
 * On every request the middleware ensures a CSRF token cookie is set
 * (non-HttpOnly so frontend JavaScript can read it).
 *
 * On state-changing requests (POST/PUT/PATCH/DELETE) that include an
 * Origin header (i.e. browser-initiated requests), the middleware
 * verifies that the X-CSRF-Token header value matches the cookie value.
 *
 * Requests without Origin (CLI, Postman, supertest) bypass the check so
 * server-to-server calls and automated tests continue to work.
 */

const crypto = require('crypto');

const CSRF_COOKIE = 'csrfToken';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

module.exports = function csrf(req, res, next) {
  // Ensure a CSRF token cookie exists; issue one if missing.
  let token = req.cookies[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by frontend JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }
  req.csrfToken = token;

  // Safe methods never mutate state — skip validation.
  if (SAFE_METHODS.has(req.method)) return next();

  // Only enforce the check when the browser supplies an Origin header.
  // Requests without Origin are assumed to be non-browser (CLI/server/test).
  const origin = req.headers.origin;
  if (!origin) return next();

  const headerToken = req.headers['x-csrf-token'];

  // Reject when token is absent or has a different length (prevents
  // timing-safe comparison from throwing on mismatched buffer sizes).
  if (!headerToken || headerToken.length !== token.length) {
    const err = new Error('Invalid CSRF token');
    err.statusCode = 403;
    return next(err);
  }

  // Constant-time comparison to prevent timing-oracle attacks.
  if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(token))) {
    const err = new Error('Invalid CSRF token');
    err.statusCode = 403;
    return next(err);
  }

  next();
};
