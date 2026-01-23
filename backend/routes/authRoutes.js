const express = require('express');
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
  registerFaculty,
  validateInvitation,
  refreshToken
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/register-faculty/:token', registerFaculty);
router.get('/validate-invitation/:token', validateInvitation);
router.post('/login', login);
router.post('/verify-code', verifyCode);
router.post('/resend-code', resendCode);
router.post('/forgot-password', forgotPassword);
router.post('/refresh-token', refreshToken);
router.put('/reset-password/:token', resetPassword);
router.post('/logout', logout);
router.get('/activate/:token', activateAccount);
router.get('/me', protect, getMe);

module.exports = router;
