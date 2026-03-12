const express = require('express');
const rateLimit = require('express-rate-limit');
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
  transferOwnership
} = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');

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

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-code', strictLimiter, verifyCode);
router.post('/resend-code', strictLimiter, resendCode);
router.post('/forgot-password', strictLimiter, forgotPassword);
router.post('/refresh-token', authLimiter, refreshToken);
router.put('/reset-password/:token', strictLimiter, resetPassword);
router.post('/logout', logout);
router.get('/activate/:token', activateAccount);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.patch('/transfer-ownership', protect, requireRole('admin'), transferOwnership);

module.exports = router;
