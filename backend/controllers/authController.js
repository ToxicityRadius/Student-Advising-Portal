const { User, Invitation, Curriculum } = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sendTokenResponse } = require('../utils/jwt');
const { sendActivationEmail, sendVerificationCode } = require('../utils/email');

// Helper: generate a random 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: strip sensitive fields from a user plain object
function sanitizeUser(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : { ...user };
  delete plain.password;
  delete plain.activationToken;
  delete plain.activationTokenExpires;
  delete plain.resetPasswordToken;
  delete plain.resetPasswordExpires;
  delete plain.verificationCode;
  delete plain.verificationCodeExpires;
  return plain;
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { studentId, firstName, lastName, email, password, role: requestedRole } = req.body;
    const isFaculty = requestedRole === 'adviser';

    // Validate Student ID format (7 digits only) - only for students
    if (!isFaculty && studentId && (!/^\d{7}$/.test(studentId))) {
      return res.status(400).json({
        success: false,
        message: 'Student ID must be exactly 7 digits'
      });
    }

    // Check if email ends with @tip.edu.ph
    if (!email.toLowerCase().endsWith('@tip.edu.ph')) {
      return res.status(400).json({
        success: false,
        message: 'Only T.I.P. email addresses (@tip.edu.ph) are allowed to register.'
      });
    }

    // For faculty, validate .cpe@tip.edu.ph domain
    if (isFaculty && !email.toLowerCase().endsWith('.cpe@tip.edu.ph')) {
      return res.status(400).json({
        success: false,
        message: 'Faculty email must end with .cpe@tip.edu.ph'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Assign new students to the active curriculum when available.
    const activeCurriculum = await Curriculum.findOne({ where: { active_status: true } });

    // Create user - assign role based on request
    const user = await User.create({
      studentId: isFaculty ? null : studentId,
      firstName,
      lastName,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      password: hashedPassword,
      role: isFaculty ? 'adviser' : 'student',
      CurriculumId: !isFaculty && activeCurriculum ? activeCurriculum.id : null,
      activationToken,
      activationTokenExpires,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Send activation email
    await sendActivationEmail(user.email, activationToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to activate your account.',
      userId: user.id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate account
// @route   GET /api/auth/activate/:token
// @access  Public
exports.activateAccount = async (req, res, next) => {
  try {
    const { token } = req.params;

    const now = Date.now();
    const user = await User.findOne({
      where: {
        activationToken: token,
        activationTokenExpires: { [Op.gt]: now }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired activation token'
      });
    }

    await User.update({
      isActive: true,
      activationToken: null,
      activationTokenExpires: null,
      updatedAt: Date.now()
    }, { where: { id: user.id } });

    const updatedUser = await User.findByPk(user.id);
    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. If you signed up with Google, please use the "Sign in with Google" button.'
      });
    }

    // Check if account is activated
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Please activate your account. Check your email for activation link.'
      });
    }

    // Check if 2FA is enabled
    if (process.env.ENABLE_2FA === 'true') {
      // Generate verification code
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
      res.status(200).json({
        success: true,
        message: 'Verification code sent to your email. Please check your inbox.',
        userId: user.id,
        requiresVerification: true
      });
    } else {
      // 2FA disabled - log in directly
      await User.update({ lastLogin: Date.now(), updatedAt: Date.now() }, { where: { id: user.id } });
      const updatedUser = await User.findByPk(user.id);
      sendTokenResponse(updatedUser, 200, res);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 2FA code
// @route   POST /api/auth/verify-code
// @access  Public
exports.verifyCode = async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and verification code'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if code matches and hasn't expired
    if (user.verificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    if (Date.now() > user.verificationCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    // Clear verification code and mark as verified
    await User.update({
      verificationCode: null,
      verificationCodeExpires: null,
      isVerified: true,
      lastLogin: Date.now(),
      updatedAt: Date.now()
    }, { where: { id: user.id } });

    const updatedUser = await User.findByPk(user.id);
    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-code
// @access  Public
exports.resendCode = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update user with new verification code
    await User.update({
      verificationCode,
      verificationCodeExpires,
      updatedAt: Date.now()
    }, { where: { id: user.id } });

    // Send verification code email
    await sendVerificationCode(user.email, verificationCode, user.firstName);

    res.status(200).json({
      success: true,
      message: 'New verification code sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

    await User.update({
      resetPasswordToken,
      resetPasswordExpires,
      updatedAt: Date.now()
    }, { where: { id: user.id } });

    // Send password reset email
    const { sendPasswordResetEmail } = require('../utils/email');
    await sendPasswordResetEmail(user.email, resetToken, user.firstName);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Hash the token from URL to compare with database
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by reset token and check if not expired
    const now = Date.now();
    const result = await User.findOne({
      where: {
        resetPasswordToken,
        resetPasswordExpires: { [Op.gt]: now }
      }
    });

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    await User.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      updatedAt: Date.now()
    }, { where: { id: result.id } });

    const updatedUser = await User.findByPk(result.id);
    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Register faculty via invitation
// @route   POST /api/auth/register-faculty/:token
// @access  Public
exports.registerFaculty = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Find and validate invitation
    const now = Date.now();
    const invitation = await Invitation.findOne({
      where: {
        invitationToken: token,
        invitationExpires: { [Op.gt]: now },
        isUsed: false
      }
    });
    
    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation link'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: invitation.email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create faculty user with pre-assigned role (no activation needed)
    const user = await User.create({
      studentId: null, // Faculty don't have student IDs
      firstName,
      lastName,
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role, // Use role from invitation (adviser or admin)
      activationToken: null,
      activationTokenExpires: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Activate user immediately
    await User.update({
      isActive: true,
      updatedAt: Date.now()
    }, { where: { id: user.id } });

    // Mark invitation as used
    await Invitation.update({ isUsed: true }, { where: { id: invitation.id } });

    // Get updated user and send token
    const activatedUser = await User.findByPk(user.id);
    sendTokenResponse(activatedUser, 201, res);

  } catch (error) {
    next(error);
  }
};

// @desc    Validate invitation token
// @route   GET /api/auth/validate-invitation/:token
// @access  Public
exports.validateInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    const nowVal = Date.now();
    const invitation = await Invitation.findOne({
      where: {
        invitationToken: token,
        invitationExpires: { [Op.gt]: nowVal },
        isUsed: false
      }
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation link'
      });
    }

    res.status(200).json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: new Date(invitation.invitationExpires)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const { verifyRefreshToken, generateToken } = require('../utils/jwt');
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newToken = generateToken(user);

    res.json({
      success: true,
      token: newToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};
