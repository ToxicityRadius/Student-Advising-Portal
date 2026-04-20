/**
 * Reusable rate-limiter instances for mutation endpoints.
 *
 * For authenticated routes the key generator prefers the authenticated user ID
 * over IP address so that NAT/shared-IP users are not penalised unfairly.
 *
 * All limiters emit standard RateLimit-* headers (RFC 6585) and suppress the
 * deprecated X-RateLimit-* headers.
 */

const rateLimit = require('express-rate-limit');
// ipKeyGenerator normalises IPv6 addresses (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
// to prevent users from bypassing per-IP limits via address-format tricks.
const { ipKeyGenerator } = rateLimit;

/**
 * Key generator: uses authenticated user ID when available, falls back to IP.
 */
const userOrIpKey = (req) =>
  (req.user && req.user.id ? String(req.user.id) : null) ||
  ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown');

const defaultOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  // Return JSON consistently with the rest of the API
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down and try again later.',
    });
  },
};

/**
 * General mutation limiter — 100 requests per 15 minutes per user/IP.
 * Applied to protected write endpoints (profile updates, etc.).
 */
const mutationLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: userOrIpKey,
});

/**
 * SAR mutation limiter — 60 creates/updates per hour per user/IP.
 */
const sarMutationLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max: 60,
  keyGenerator: userOrIpKey,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many SAR mutation requests. Please try again later.',
    });
  },
});

/**
 * Grade entry limiter — 120 submissions per hour per user/IP.
 * Higher cap because advisers may process many students in one sitting.
 */
const gradeEntryLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max: 120,
  keyGenerator: userOrIpKey,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many grade entry requests. Please try again later.',
    });
  },
});

module.exports = { mutationLimiter, sarMutationLimiter, gradeEntryLimiter };
