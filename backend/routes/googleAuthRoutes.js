const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const { sendVerificationCode } = require('../utils/email');
const { FACULTY_EMAIL_WHITELIST } = require('../constants');

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Google OAuth client
// Replace with your actual Google Client ID
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const crypto = require('crypto');

function getGoogleAudiences() {
  const multi = (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (multi.length > 0) {
    return multi;
  }

  return [process.env.GOOGLE_CLIENT_ID].filter(Boolean);
}

// Helper: generate a cryptographically secure 6-digit verification code
function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Google Sign-In route
router.post('/google', googleAuthLimiter, async (req, res) => {
  try {
    const { token, email, name, selectedRole } = req.body;

    // Verify the Google token
    const audiences = getGoogleAudiences();

    if (!audiences.length) {
      return res.status(500).json({
        message: 'Google OAuth is not configured on the server.',
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: audiences,
    });

    const payload = ticket.getPayload();
    const googleEmail = payload.email.toLowerCase();

    // Verify email domain
    if (!googleEmail.endsWith('@tip.edu.ph')) {
      return res.status(403).json({
        message: 'Only TIP email addresses (@tip.edu.ph) are allowed.',
      });
    }

    // Faculty must use a department email (.cpe@tip.edu.ph)
    if (
      selectedRole === 'faculty' &&
      !googleEmail.endsWith('.cpe@tip.edu.ph') &&
      !FACULTY_EMAIL_WHITELIST.includes(googleEmail)
    ) {
      return res.status(403).json({
        message: 'Faculty/Admin login requires a department email (e.g. lastname.cpe@tip.edu.ph).',
      });
    }

    // Students must not use a faculty department address
    if (selectedRole === 'student' && googleEmail.endsWith('.cpe@tip.edu.ph')) {
      return res.status(403).json({
        message: 'Please use the Faculty login for department email addresses.',
      });
    }

    // Check if user exists
    let user = await User.findOne({ where: { email: googleEmail } });

    if (!user) {
      // Create new user if doesn't exist
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), salt);

      const parsedFirstName = payload.given_name || name.split(' ')[0];
      const parsedLastName = payload.family_name || name.split(' ').slice(1).join(' ');

      user = await User.create({
        studentId: null,
        firstName: parsedFirstName,
        lastName: parsedLastName,
        first_name: parsedFirstName,
        last_name: parsedLastName,
        email: googleEmail,
        role: selectedRole === 'faculty' ? 'adviser' : 'student',
        isActive: true,
        password: hashedPassword,
        activationToken: null,
        activationTokenExpires: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (!user.isActive) {
      // Auto-activate user when they sign in with Google (verified identity)
      await User.update(
        {
          isActive: true,
          activationToken: null,
          activationTokenExpires: null,
          updatedAt: Date.now(),
        },
        { where: { id: user.id } },
      );
      user = await User.findByPk(user.id);
    }

    // Check if 2FA is enabled
    if (process.env.ENABLE_2FA === 'true') {
      // Generate verification code for 2FA
      const verificationCode = generateVerificationCode();
      const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Update user with verification code
      await User.update(
        {
          verificationCode,
          verificationCodeExpires,
          isVerified: false,
          updatedAt: Date.now(),
        },
        { where: { id: user.id } },
      );

      // Send verification code email
      await sendVerificationCode(user.email, verificationCode, user.firstName);

      // Return success without token - user needs to verify first
      res.json({
        success: true,
        message: 'Verification code sent to your email. Please check your inbox.',
        userId: user.id,
        requiresVerification: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      // 2FA disabled - log in directly
      await User.update(
        { lastLogin: Date.now(), updatedAt: Date.now() },
        { where: { id: user.id } },
      );
      const updatedUser = await User.findByPk(user.id);
      const jwtToken = generateToken(updatedUser);

      res.json({
        token: jwtToken,
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
          studentId: updatedUser.studentId,
        },
      });
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({
      message: 'Authentication failed. Please try again.',
    });
  }
});

module.exports = router;
