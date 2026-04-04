const { User } = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sendTokenResponse, clearAuthCookies, getAuthCookieOptions } = require('../utils/jwt');
const {
  sendActivationEmail,
  sendVerificationCode,
  sendEmailChangeVerificationCode,
} = require('../utils/email');
const { linkStudentAccountToSar } = require('../utils/sarLinking');
const { shouldBypassAdminFirstLoginEnforcement } = require('../utils/featureFlags');
const { sanitizeUser } = require('../utils/sanitize');
const logger = require('../utils/logger');
const { FACULTY_EMAIL_WHITELIST } = require('../constants');

// In-memory attempt tracker for verification code brute-force protection.
// Keys are String(userId); values are { count, resetAt }.
// This resets on server restart which is acceptable for a single-instance deployment.
// For clustered deployments, replace with a shared store (e.g., Redis).
const verifyAttempts = new Map();
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCKOUT_MS = 15 * 60 * 1000; // 15-minute lockout window

// Helper: generate a cryptographically secure 6-digit verification code
function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function generatePasswordChangeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      purpose: 'password_change',
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const {
      studentId,
      firstName,
      lastName,
      email,
      password,
      role: requestedRole,
      gender,
    } = req.body;
    const normalizedRequestedRole =
      requestedRole === 'adviser' ? 'adviser' : requestedRole === 'admin' ? 'admin' : 'student';
    const isFaculty = normalizedRequestedRole === 'adviser';
    const emailLower = (email || '').toLowerCase();

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    // Validate Student ID format (7 digits only) - only for students
    if (!isFaculty && studentId && !/^\d{7}$/.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student ID must be exactly 7 digits',
      });
    }

    if (normalizedRequestedRole === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin account creation is restricted.',
      });
    }

    // Enforce role-specific email domain rules
    if (!emailLower.endsWith('@tip.edu.ph')) {
      return res.status(400).json({
        success: false,
        message: 'Only T.I.P. email addresses (@tip.edu.ph) are allowed to register.',
      });
    }

    if (
      isFaculty &&
      !emailLower.endsWith('.cpe@tip.edu.ph') &&
      !FACULTY_EMAIL_WHITELIST.includes(emailLower)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Faculty email must end with .cpe@tip.edu.ph',
      });
    }

    if (!isFaculty && emailLower.endsWith('.cpe@tip.edu.ph')) {
      return res.status(400).json({
        success: false,
        message: 'Student registration does not allow faculty department email addresses.',
      });
    }

    // Check if user exists (case-insensitive)
    const existingUser = await User.findOne({ where: { email: emailLower } });
    if (existingUser) {
      if (!existingUser.isActive) {
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

        await User.update(
          {
            activationToken,
            activationTokenExpires,
            updatedAt: Date.now(),
          },
          { where: { id: existingUser.id } },
        );

        await sendActivationEmail(existingUser.email, activationToken);

        return res.status(200).json({
          success: true,
          message:
            'Account already exists but is not activated. A new activation email has been sent.',
          userId: existingUser.id,
          alreadyRegistered: true,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user - assign role based on request
    const ALLOWED_SEX = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
    const sexValue = gender && ALLOWED_SEX.includes(gender) ? gender : null;

    const user = await User.create({
      studentId: isFaculty ? null : studentId,
      firstName,
      lastName,
      first_name: firstName || null,
      last_name: lastName || null,
      email: emailLower,
      password: hashedPassword,
      role: isFaculty ? 'adviser' : 'student',
      sex: sexValue,
      activationToken,
      activationTokenExpires,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (!isFaculty) {
      try {
        await linkStudentAccountToSar({
          userId: user.id,
          email: user.email,
          studentId: user.studentId,
        });
      } catch (sarErr) {
        // SAR linking is non-critical — log but do not fail registration
        logger.warn({ err: sarErr, userId: user.id }, 'SAR link on register failed (non-fatal)');
      }
    }

    // Send activation email
    await sendActivationEmail(user.email, activationToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to activate your account.',
      userId: user.id,
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const emailFromBody = (req.body?.email || '').toLowerCase();
      if (emailFromBody) {
        const existingUser = await User.findOne({ where: { email: emailFromBody } });
        if (existingUser && !existingUser.isActive) {
          const activationToken = crypto.randomBytes(32).toString('hex');
          const activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

          await User.update(
            {
              activationToken,
              activationTokenExpires,
              updatedAt: Date.now(),
            },
            { where: { id: existingUser.id } },
          );

          await sendActivationEmail(existingUser.email, activationToken);

          return res.status(200).json({
            success: true,
            message:
              'Account already exists but is not activated. A new activation email has been sent.',
            userId: existingUser.id,
            alreadyRegistered: true,
          });
        }
      }

      return res.status(400).json({
        success: false,
        message:
          'Email already registered. If this is your account, activate it or use forgot password.',
      });
    }

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
        activationTokenExpires: { [Op.gt]: now },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired activation token',
      });
    }

    await User.update(
      {
        isActive: true,
        activationToken: null,
        activationTokenExpires: null,
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id);

    const acceptsHtml = (req.headers.accept || '').includes('text/html');
    const mobileScheme = process.env.MOBILE_APP_SCHEME || 'studentadvising';
    const mobileDeepLink = `${mobileScheme}://login?activated=1`;
    const webLoginUrl = `${(process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '')}/login?activated=1`;

    if (acceptsHtml) {
      return res.status(200).send(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Account Activated</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f7f7f7; color: #222; margin: 0; }
      .wrap { max-width: 560px; margin: 48px auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { line-height: 1.5; }
      .row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
      a.btn { text-decoration: none; background: #FFC107; color: #111; padding: 12px 16px; border-radius: 8px; display: inline-block; }
      a.alt { background: #e9e9e9; color: #111; }
      .small { margin-top: 16px; color: #555; font-size: 13px; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Account Activated</h1>
      <p>Your account is now active. We will try to open the mobile app automatically. If it does not open, use one of the buttons below.</p>
      <div class="row">
        <a class="btn" href="${mobileDeepLink}">Open Mobile App</a>
        <a class="btn alt" href="${webLoginUrl}">Open Web Login</a>
      </div>
      <p class="small">Mobile link: ${mobileDeepLink}</p>
      <p class="small">Web link: ${webLoginUrl}</p>
    </div>
    <script>
      setTimeout(function () { window.location.href = '${mobileDeepLink}'; }, 50);
      setTimeout(function () { window.location.href = '${webLoginUrl}'; }, 1200);
    </script>
  </body>
</html>
      `);
    }

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
    const { email, password, selectedRole } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const emailLower = email.toLowerCase();

    // Enforce email format matches selected role
    if (
      selectedRole === 'faculty' &&
      !emailLower.endsWith('.cpe@tip.edu.ph') &&
      !FACULTY_EMAIL_WHITELIST.includes(emailLower)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Faculty/Admin login requires a department email (e.g. lastname.cpe@tip.edu.ph).',
      });
    }
    if (selectedRole === 'student' && emailLower.endsWith('.cpe@tip.edu.ph')) {
      return res.status(403).json({
        success: false,
        message: 'Please use the Faculty login for department email addresses.',
      });
    }

    // Check for user (case-insensitive).
    let user;
    try {
      user = await User.findOne({ where: { email: emailLower } });
    } catch (queryError) {
      const dbErr = queryError?.original || queryError?.parent || queryError;
      const missingColumn =
        dbErr?.code === '42703' || /column .* does not exist/i.test(dbErr?.message || '');

      if (!missingColumn) {
        throw queryError;
      }

      user = await User.findOne({
        where: { email: emailLower },
        attributes: ['id', 'email', 'password', 'role', 'studentId', 'isActive'],
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Account lockout check (Step 3.1)
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const secondsRemaining = Math.ceil((user.lockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to too many failed login attempts. Try again in ${secondsRemaining} seconds.`,
      });
    }

    if (user.role === 'student') {
      try {
        await linkStudentAccountToSar({
          userId: user.id,
          email: user.email,
          studentId: user.studentId,
        });
      } catch (sarErr) {
        // SAR linking is non-critical — log but do not fail login
        logger.warn({ err: sarErr, userId: user.id }, 'SAR link on login failed (non-fatal)');
      }
    }

    // Ensure the account role matches the selected login portal
    const isFacultyRole = user.role === 'adviser' || user.role === 'admin';
    if (selectedRole === 'faculty' && !isFacultyRole) {
      return res.status(403).json({
        success: false,
        message: 'This account is not registered as Faculty or Admin.',
      });
    }
    if (selectedRole === 'student' && isFacultyRole) {
      return res.status(403).json({
        success: false,
        message: 'Please use the Faculty login for this account.',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Increment failed login counter; lock account after 5 consecutive failures (Step 3.1)
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockUpdate = { failedLoginAttempts: newAttempts, updatedAt: Date.now() };
      if (newAttempts >= 5) {
        lockUpdate.lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
      }
      await User.update(lockUpdate, { where: { id: user.id } });
      return res.status(401).json({
        success: false,
        message:
          'Invalid credentials. If you signed up with Google, please use the "Sign in with Google" button.',
      });
    }

    // Check if account is activated
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Please activate your account. Check your email for activation link.',
      });
    }

    // Check if 2FA is enabled
    if (user.mustChangePassword && !shouldBypassAdminFirstLoginEnforcement(user)) {
      return res.status(200).json({
        success: true,
        mustChangePassword: true,
        token: generatePasswordChangeToken(user),
      });
    }

    // Phase 2A: if email change is pending, return restricted response
    if (user.mustChangeEmail && !shouldBypassAdminFirstLoginEnforcement(user)) {
      const { generateToken } = require('../utils/jwt');
      const token = generateToken(user);
      return res.status(200).json({
        success: true,
        mustChangeEmail: true,
        token,
        user: sanitizeUser(user),
      });
    }

    if (process.env.ENABLE_2FA === 'true') {
      // Generate verification code
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
      res.status(200).json({
        success: true,
        message: 'Verification code sent to your email. Please check your inbox.',
        userId: user.id,
        requiresVerification: true,
      });
    } else {
      // 2FA disabled - log in directly; reset lockout counters on success (Step 3.1)
      await User.update(
        {
          lastLogin: Date.now(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: Date.now(),
        },
        { where: { id: user.id } },
      );
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
        message: 'Please provide user ID and verification code',
      });
    }

    // Enforce attempt-based lockout before hitting the database
    const key = String(userId);
    const now = Date.now();
    const attempt = verifyAttempts.get(key);
    if (attempt && attempt.count >= MAX_VERIFY_ATTEMPTS && now < attempt.resetAt) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new verification code.',
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if code matches and hasn't expired
    if (user.verificationCode !== code) {
      // Increment attempt counter
      const cur = verifyAttempts.get(key);
      if (!cur || now >= cur.resetAt) {
        verifyAttempts.set(key, { count: 1, resetAt: now + VERIFY_LOCKOUT_MS });
      } else {
        cur.count++;
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    if (Date.now() > user.verificationCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.',
      });
    }

    // Successful verification — clear attempt counter
    verifyAttempts.delete(key);

    // Clear verification code and mark as verified
    await User.update(
      {
        verificationCode: null,
        verificationCodeExpires: null,
        isVerified: true,
        lastLogin: Date.now(),
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id);

    if (updatedUser.mustChangePassword && !shouldBypassAdminFirstLoginEnforcement(updatedUser)) {
      return res.status(200).json({
        success: true,
        mustChangePassword: true,
        token: generatePasswordChangeToken(updatedUser),
      });
    }

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
        message: 'Please provide user ID',
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update user with new verification code
    await User.update(
      {
        verificationCode,
        verificationCodeExpires,
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    // Reset attempt counter so the user gets a fresh set of attempts
    verifyAttempts.delete(String(userId));

    // Send verification code email
    await sendVerificationCode(user.email, verificationCode, user.firstName);

    res.status(200).json({
      success: true,
      message: 'New verification code sent to your email',
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
    const refreshTokenFromRequest = req.body?.refreshToken || req.cookies?.refreshToken || null;

    if (refreshTokenFromRequest) {
      const { verifyRefreshToken } = require('../utils/jwt');
      const decoded = verifyRefreshToken(refreshTokenFromRequest);

      if (decoded?.id) {
        await User.update(
          {
            refreshToken: null,
            refreshTokenExpires: null,
            updatedAt: Date.now(),
          },
          { where: { id: decoded.id } },
        );
      }
    }

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
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
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password for authenticated user
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect',
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from old password',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.update(
      {
        password: hashedPassword,
        mustChangePassword: false,
        passwordUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id);

    // Phase 2A: if email change is still required, return restricted response
    if (updatedUser.mustChangeEmail && !shouldBypassAdminFirstLoginEnforcement(updatedUser)) {
      const { generateToken } = require('../utils/jwt');
      const token = generateToken(updatedUser);
      logger.info(
        { userId: updatedUser.id, role: updatedUser.role },
        '[AUDIT] password rotated, email change still required',
      );
      return res.status(200).json({
        success: true,
        mustChangeEmail: true,
        token,
        user: sanitizeUser(updatedUser),
      });
    }

    logger.info({ userId: updatedUser.id, role: updatedUser.role }, '[AUDIT] password changed');
    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate email change — send verification code to new email (Phase 2A)
// @route   POST /api/auth/initiate-email-change
// @access  Private
exports.initiateEmailChange = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user || !user.mustChangeEmail) {
      return res
        .status(400)
        .json({ success: false, message: 'Email change not required for this account' });
    }

    const newEmailLower = (newEmail || '').toLowerCase().trim();

    if (!newEmailLower) {
      return res.status(400).json({ success: false, message: 'New email is required' });
    }

    // Validate institutional email format
    if (!newEmailLower.endsWith('@tip.edu.ph')) {
      return res
        .status(400)
        .json({ success: false, message: 'Only @tip.edu.ph email addresses are allowed' });
    }

    // Program Chair must use department email
    if (user.role === 'admin' && !newEmailLower.endsWith('.cpe@tip.edu.ph')) {
      return res
        .status(400)
        .json({ success: false, message: 'Program Chair email must end with .cpe@tip.edu.ph' });
    }

    // Must differ from current email
    if (newEmailLower === user.email.toLowerCase()) {
      return res
        .status(400)
        .json({ success: false, message: 'New email must be different from current email' });
    }

    // Must be unique
    const existing = await User.findOne({ where: { email: newEmailLower } });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: 'This email address is already in use' });
    }

    const code = generateVerificationCode();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await User.update(
      {
        pendingEmail: newEmailLower,
        emailChangeCode: code,
        emailChangeCodeExpires: expires,
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    await sendEmailChangeVerificationCode(newEmailLower, code, user.firstName);

    logger.info(
      { userId: user.id, role: user.role, pendingEmail: newEmailLower },
      '[AUDIT] email change initiated',
    );

    res.status(200).json({ success: true, message: 'Verification code sent to new email address' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email change code and activate new email (Phase 2A)
// @route   POST /api/auth/verify-email-change
// @access  Private
exports.verifyEmailChange = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user || !user.mustChangeEmail) {
      return res
        .status(400)
        .json({ success: false, message: 'Email change not required for this account' });
    }

    if (!user.pendingEmail || !user.emailChangeCode) {
      return res.status(400).json({
        success: false,
        message: 'No pending email change. Please submit your new email first.',
      });
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    if (user.emailChangeCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    if (Date.now() > Number(user.emailChangeCodeExpires)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.',
      });
    }

    const oldEmail = user.email;
    const newEmail = user.pendingEmail;

    await User.update(
      {
        email: newEmail,
        pendingEmail: null,
        emailChangeCode: null,
        emailChangeCodeExpires: null,
        mustChangeEmail: false,
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    const updatedUser = await User.findByPk(user.id);

    logger.info(
      { userId: user.id, role: user.role, oldEmail, newEmail },
      '[AUDIT] email change completed',
    );

    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Resend email change verification code (Phase 2A)
// @route   POST /api/auth/resend-email-change-code
// @access  Private
exports.resendEmailChangeCode = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user || !user.mustChangeEmail) {
      return res
        .status(400)
        .json({ success: false, message: 'Email change not required for this account' });
    }

    if (!user.pendingEmail) {
      return res.status(400).json({
        success: false,
        message: 'No pending email found. Please submit your new email address first.',
      });
    }

    const code = generateVerificationCode();
    const expires = Date.now() + 10 * 60 * 1000;

    await User.update(
      {
        emailChangeCode: code,
        emailChangeCodeExpires: expires,
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    await sendEmailChangeVerificationCode(user.pendingEmail, code, user.firstName);

    res
      .status(200)
      .json({ success: true, message: 'New verification code sent to your new email address' });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer program chair ownership to an adviser
// @route   PATCH /api/auth/transfer-ownership
// @access  Private/Admin
exports.transferOwnership = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'targetUserId is required',
      });
    }

    const requester = await User.findByPk(req.user.id);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only current Program Chair can transfer ownership',
      });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    if (targetUser.role !== 'adviser') {
      return res.status(400).json({
        success: false,
        message: 'Ownership can only be transferred to an adviser',
      });
    }

    await User.update({ role: 'admin', updatedAt: Date.now() }, { where: { id: targetUser.id } });
    await User.update({ role: 'adviser', updatedAt: Date.now() }, { where: { id: requester.id } });

    return res.status(200).json({
      success: true,
      message: 'Program Chair ownership transferred successfully',
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
        message: 'Please provide an email address',
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Return success regardless to prevent account enumeration (Step 3.7)
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

    await User.update(
      {
        resetPasswordToken,
        resetPasswordExpires,
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    // Send password reset email
    const { sendPasswordResetEmail } = require('../utils/email');
    await sendPasswordResetEmail(user.email, resetToken, user.firstName);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
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

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    // Hash the token from URL to compare with database
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by reset token and check if not expired
    const now = Date.now();
    const result = await User.findOne({
      where: {
        resetPasswordToken,
        resetPasswordExpires: { [Op.gt]: now },
      },
    });

    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    await User.update(
      {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        updatedAt: Date.now(),
      },
      { where: { id: result.id } },
    );

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
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
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const { verifyRefreshToken, generateToken, generateRefreshToken } = require('../utils/jwt');
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Rotation: verify token matches what was last issued for this user (Step 3.2)
    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    // Invalidate old token by overwriting with the newly issued one
    await User.update(
      {
        refreshToken: newRefreshToken,
        refreshTokenExpires: Date.now() + 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      },
      { where: { id: user.id } },
    );

    const cookieOptions = getAuthCookieOptions();

    res
      .cookie('token', newToken, cookieOptions.token)
      .cookie('refreshToken', newRefreshToken, cookieOptions.refreshToken)
      .json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      });
  } catch (error) {
    next(error);
  }
};
