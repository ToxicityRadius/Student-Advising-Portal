const jwt = require('jsonwebtoken');

// Generate access token
// Supports both signatures:
// 1) generateToken(userObject)
// 2) generateToken(userId, role)
// NOTE: only id, role, and is_verified are embedded in the token.
// PII (name, program, contact) is intentionally omitted — fetch via /auth/me.
exports.generateToken = (userOrId, roleArg) => {
  const isObjectInput = userOrId && typeof userOrId === 'object';
  const id = isObjectInput ? (userOrId.id || userOrId._id) : userOrId;
  const role = isObjectInput ? userOrId.role : roleArg;
  const isVerified = isObjectInput
    ? (userOrId.is_verified ?? userOrId.isVerified ?? false)
    : false;

  // Default of '30m' only applies when JWT_EXPIRE env var is not set.
  // Update JWT_EXPIRE in .env to '30m' once the frontend refresh-token flow (Phase 3) is in place.
  return jwt.sign(
    { id, role, is_verified: isVerified },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30m' }
  );
};

// Generate refresh token
exports.generateRefreshToken = (userId) => {
  // JWT_REFRESH_SECRET must be different from JWT_SECRET — validated at server startup.
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign(
    { id: userId },
    secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

// Verify token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Verify refresh token
exports.verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Send token response with refresh token
exports.sendTokenResponse = (user, statusCode, res) => {
  const token = exports.generateToken(user);
  const refreshToken = exports.generateRefreshToken(user.id || user._id);

  // Persist the newly issued refresh token so rotation verification works (Step 3.2).
  // Fire-and-forget — the HTTP response must not be blocked by a DB write.
  try {
    const { User: UserModel } = require('../models');
    UserModel.update({
      refreshToken,
      refreshTokenExpires: Date.now() + (30 * 24 * 60 * 60 * 1000),
      updatedAt: Date.now()
    }, { where: { id: user.id || user._id } }).catch(() => {});
  } catch (_) {}

  const tokenExpiry = process.env.JWT_EXPIRE || '30m';
  let expiryMs;
  if (tokenExpiry.endsWith('d')) {
    expiryMs = parseInt(tokenExpiry) * 24 * 60 * 60 * 1000;
  } else if (tokenExpiry.endsWith('h')) {
    expiryMs = parseInt(tokenExpiry) * 60 * 60 * 1000;
  } else if (tokenExpiry.endsWith('m')) {
    expiryMs = parseInt(tokenExpiry) * 60 * 1000;
  } else {
    expiryMs = 30 * 60 * 1000; // fallback: 30 minutes
  }

  const options = {
    expires: new Date(Date.now() + expiryMs),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  const userResponse = {
    id: user.id || user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    studentId: user.studentId
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .cookie('refreshToken', refreshToken, { ...options, path: '/api/auth/refresh' })
    .json({
      success: true,
      token,
      refreshToken,
      user: userResponse
    });
};
