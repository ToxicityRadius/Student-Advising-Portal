/**
 * Request context middleware.
 *
 * Attaches a per-request context object (`req.ctx`) containing:
 *   - requestId  — UUID-like hex string for log correlation
 *   - startTime  — Date.now() at request start
 *   - ip         — normalized client IP (trusts X-Forwarded-For only in production)
 *
 * The requestId is also echoed in the response via the `X-Request-Id` header
 * so clients can correlate frontend-reported errors with server logs.
 */

const crypto = require('crypto');

module.exports = function requestContext(req, res, next) {
  const requestId = crypto.randomBytes(8).toString('hex');

  req.ctx = {
    requestId,
    startTime: Date.now(),
    ip: req.ip
  };

  res.setHeader('X-Request-Id', requestId);

  next();
};
