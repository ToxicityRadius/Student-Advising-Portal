const User = require('../models/User');
const crypto = require('crypto');
const { sendTokenResponse } = require('../utils/jwt');
const { sendActivationEmail, sendVerificationCode } = require('../utils/email');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { studentId, firstName, lastName, email, password } = req.body;

    // Validate Student ID format (7 digits only)
    if (studentId && (!/^\d{7}$/.test(studentId))) {
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

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user - automatically assign Student role
    const user = await User.create({
      studentId,
      firstName,
      lastName,
      email,
      password,
      role: 'student',
      activationToken,
      activationTokenExpires
    });

    // Send activation email
    await sendActivationEmail(user.email, activationToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to activate your account.',
      userId: user._id
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

    const user = await User.findByActivationToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired activation token'
      });
    }

    await User.update(user.id, {
      isActive: true,
      activationToken: null,
      activationTokenExpires: null
    });

    const updatedUser = await User.findById(user.id);
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
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await User.comparePassword(password, user.password);

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
      const verificationCode = User.generateVerificationCode();
      const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Update user with verification code
      await User.update(user.id, {
        verificationCode,
        verificationCodeExpires,
        isVerified: false
      });

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
      await User.update(user.id, { lastLogin: true });
      const updatedUser = await User.findById(user.id);
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

    const user = await User.findById(userId);

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
    await User.update(user.id, {
      verificationCode: null,
      verificationCodeExpires: null,
      isVerified: true,
      lastLogin: true
    });

    const updatedUser = await User.findById(user.id);
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

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new verification code
    const verificationCode = User.generateVerificationCode();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update user with new verification code
    await User.update(user.id, {
      verificationCode,
      verificationCodeExpires
    });

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
    const user = User.toJSON(await User.findById(req.user.id));

    res.status(200).json({
      success: true,
      user
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

    const user = await User.findByEmail(email);

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

    await User.update(user.id, {
      resetPasswordToken,
      resetPasswordExpires
    });

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
    const result = await User.findByResetToken(resetPasswordToken);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    await User.updatePassword(result.id, hashedPassword);

    const updatedUser = await User.findById(result.id);
    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};
