const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const validate = require('../middleware/validate');
const {
  register,
  login,
  logout,
  activateAccount,
  getMe,
  verifyCode,
  resendCode,
  forgotPassword,
  resetPassword,
  refreshToken,
  changePassword,
  transferOwnership,
  initiateEmailChange,
  verifyEmailChange,
  resendEmailChangeCode,
  resolveVerificationSessionFromRequest,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { PERMISSIONS, requirePermission } = require('../utils/permissions');
const {
  registerValidation,
  loginValidation,
  verifyCodeValidation,
  resendCodeValidation,
  forgotPasswordValidation,
  refreshTokenValidation,
  logoutValidation,
  resetPasswordValidation,
  changePasswordValidation,
  initiateEmailChangeValidation,
  verifyEmailChangeValidation,
  transferOwnershipValidation,
} = require('../middleware/authValidation');

const router = express.Router();

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const isTestEnvironment = process.env.NODE_ENV === 'test';
const disableAuthRateLimiting = /^(true|1|yes)$/i.test(
  process.env.DISABLE_AUTH_RATE_LIMITING || '',
);
const AUTH_LIMIT_MAX = disableAuthRateLimiting
  ? Number.MAX_SAFE_INTEGER
  : isTestEnvironment
    ? 200
    : 15;
const STRICT_AUTH_LIMIT_MAX = disableAuthRateLimiting
  ? Number.MAX_SAFE_INTEGER
  : isTestEnvironment
    ? 200
    : 5;

const getRequestIpKey = (req) => {
  const requestIp = req.ip || req.socket?.remoteAddress || 'unknown';
  return ipKeyGenerator(requestIp);
};

const verificationUserOrIpKey = (req) => {
  const verificationUserId = req.verificationSessionUserId;
  if (typeof verificationUserId !== 'string' || verificationUserId.trim().length === 0) {
    return getRequestIpKey(req);
  }

  return `verify-user:${verificationUserId.trim()}`;
};

const attachVerificationSessionContext = (req, _res, next) => {
  const verificationSession = resolveVerificationSessionFromRequest(req);
  req.verificationSessionId = verificationSession?.sessionId || null;
  req.verificationSessionUserId = verificationSession?.userId || null;
  next();
};

// Rate limiters to prevent brute force and abuse
const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: AUTH_LIMIT_MAX,
  message: { success: false, message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: STRICT_AUTH_LIMIT_MAX,
  message: { success: false, message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyCodeLimiter = rateLimit({
  windowMs: FIVE_MINUTES_MS,
  max: 20,
  keyGenerator: verificationUserOrIpKey,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    reasonCode: 'VERIFY_ROUTE_RATE_LIMITED',
    message: 'Too many verification attempts. Please try again after 5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendCodeLimiter = rateLimit({
  windowMs: FIVE_MINUTES_MS,
  max: 3,
  keyGenerator: verificationUserOrIpKey,
  message: {
    success: false,
    reasonCode: 'RESEND_ROUTE_RATE_LIMITED',
    message: 'Too many code resend attempts. Please try again after 5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailChangeLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: disableAuthRateLimiting ? Number.MAX_SAFE_INTEGER : isTestEnvironment ? 200 : 5,
  keyGenerator: getRequestIpKey,
  message: { success: false, message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerValidation), register);
router.post('/login', authLimiter, validate(loginValidation), login);
router.post(
  '/verify-code',
  attachVerificationSessionContext,
  verifyCodeLimiter,
  validate(verifyCodeValidation),
  verifyCode,
);
router.post(
  '/resend-code',
  attachVerificationSessionContext,
  resendCodeLimiter,
  validate(resendCodeValidation),
  resendCode,
);
router.post(
  '/forgot-password',
  strictAuthLimiter,
  validate(forgotPasswordValidation),
  forgotPassword,
);
router.post('/refresh', authLimiter, validate(refreshTokenValidation), refreshToken);
router.post('/refresh-token', authLimiter, validate(refreshTokenValidation), refreshToken);
router.put(
  '/reset-password/:token',
  strictAuthLimiter,
  validate(resetPasswordValidation),
  resetPassword,
);
router.post('/logout', validate(logoutValidation), logout);
router.get('/activate/:token', activateAccount);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(changePasswordValidation), changePassword);
router.patch(
  '/transfer-ownership',
  protect,
  requirePermission(PERMISSIONS.transferOwnership),
  validate(transferOwnershipValidation),
  transferOwnership,
);
router.post(
  '/initiate-email-change',
  protect,
  emailChangeLimiter,
  validate(initiateEmailChangeValidation),
  initiateEmailChange,
);
router.post(
  '/verify-email-change',
  protect,
  emailChangeLimiter,
  validate(verifyEmailChangeValidation),
  verifyEmailChange,
);
router.post('/resend-email-change-code', protect, emailChangeLimiter, resendEmailChangeCode);

module.exports = router;
