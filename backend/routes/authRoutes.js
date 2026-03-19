const express = require('express');
const rateLimit = require('express-rate-limit');
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
  resendEmailChangeCode
} = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');
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
  transferOwnershipValidation
} = require('../middleware/authValidation');

const router = express.Router();

// Rate limiters to prevent brute force and abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { success: false, message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, validate(registerValidation), register);
router.post('/login', authLimiter, validate(loginValidation), login);
router.post('/verify-code', strictLimiter, validate(verifyCodeValidation), verifyCode);
router.post('/resend-code', strictLimiter, validate(resendCodeValidation), resendCode);
router.post('/forgot-password', strictLimiter, validate(forgotPasswordValidation), forgotPassword);
router.post('/refresh', authLimiter, validate(refreshTokenValidation), refreshToken);
router.post('/refresh-token', authLimiter, validate(refreshTokenValidation), refreshToken);
router.put('/reset-password/:token', strictLimiter, validate(resetPasswordValidation), resetPassword);
router.post('/logout', validate(logoutValidation), logout);
router.get('/activate/:token', activateAccount);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(changePasswordValidation), changePassword);
router.patch('/transfer-ownership', protect, requireRole('admin'), validate(transferOwnershipValidation), transferOwnership);
router.post('/initiate-email-change', protect, validate(initiateEmailChangeValidation), initiateEmailChange);
router.post('/verify-email-change', protect, validate(verifyEmailChangeValidation), verifyEmailChange);
router.post('/resend-email-change-code', protect, resendEmailChangeCode);

module.exports = router;
