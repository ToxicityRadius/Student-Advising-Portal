const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { Curriculum } = require('../models');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const { sendVerificationCode } = require('../utils/email');
const { generateDraftStudyPlanForUser } = require('../controllers/advisingController');

// Initialize Google OAuth client
// Replace with your actual Google Client ID
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: generate a random 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Google Sign-In route
router.post('/google', async (req, res) => {
  try {
    const { token, email, name } = req.body;

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleEmail = payload.email;

    // Verify email domain
    if (!googleEmail.toLowerCase().endsWith('@tip.edu.ph')) {
      return res.status(403).json({ 
        message: 'Only TIP email addresses (@tip.edu.ph) are allowed.' 
      });
    }

    // Check if user exists
    let user = await User.findOne({ where: { email: googleEmail } });

    if (!user) {
      // Create new user if doesn't exist
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), salt);
      const activeCurriculum = await Curriculum.findOne({ where: { active_status: true } });

      const parsedFirstName = payload.given_name || name.split(' ')[0];
      const parsedLastName = payload.family_name || name.split(' ').slice(1).join(' ');

      user = await User.create({
        studentId: null,
        firstName: parsedFirstName,
        lastName: parsedLastName,
        first_name: parsedFirstName,
        last_name: parsedLastName,
        email: googleEmail,
        role: 'student',
        CurriculumId: activeCurriculum ? activeCurriculum.id : null,
        isActive: true,
        password: hashedPassword,
        activationToken: null,
        activationTokenExpires: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      if (activeCurriculum) {
        try {
          await generateDraftStudyPlanForUser(user.id);
        } catch (planError) {
          console.warn(`Draft plan generation failed for Google user ${user.id}:`, planError.message);
        }
      }
      
      // Check if student ID is missing - require student to provide it
      if (!user.studentId) {
        return res.json({
          success: true,
          message: 'Student Number is required to complete registration.',
          userId: user.id,
          requiresStudentId: true,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      }
    } else if (!user.isActive) {
      // Auto-activate user when they sign in with Google (verified identity)
      await User.update({
        isActive: true,
        activationToken: null,
        activationTokenExpires: null,
        updatedAt: Date.now()
      }, { where: { id: user.id } });
      user = await User.findByPk(user.id);
    } else if (!user.studentId) {
      // Existing user without student ID - require them to provide it
      return res.json({
        success: true,
        message: 'Student Number is required to continue.',
        userId: user.id,
        requiresStudentId: true,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    }

    // Check if 2FA is enabled
    if (process.env.ENABLE_2FA === 'true') {
      // Generate verification code for 2FA
      const verificationCode = generateVerificationCode();
      const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Update user with verification code
      await User.update({
        verificationCode,
        verificationCodeExpires,
        isVerified: false,
        updatedAt: Date.now()
      }, { where: { id: user.id } });

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
      await User.update({ lastLogin: Date.now(), updatedAt: Date.now() }, { where: { id: user.id } });
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
        },
      });
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ 
      message: 'Authentication failed. Please try again.' 
    });
  }
});

module.exports = router;
