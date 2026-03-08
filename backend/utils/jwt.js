const jwt = require('jsonwebtoken');

// Generate access token
// Supports both signatures:
// 1) generateToken(userObject)
// 2) generateToken(userId, role)
exports.generateToken = (userOrId, roleArg) => {
  const isObjectInput = userOrId && typeof userOrId === 'object';
  const id = isObjectInput ? (userOrId.id || userOrId._id) : userOrId;
  const role = isObjectInput ? userOrId.role : roleArg;
  const isVerified = isObjectInput
    ? (userOrId.is_verified ?? userOrId.isVerified ?? false)
    : false;
  const firstName = isObjectInput
    ? (userOrId.first_name ?? userOrId.firstName ?? null)
    : null;
  const program = isObjectInput
    ? (userOrId.program ?? null)
    : null;
  const contactNumber = isObjectInput
    ? (userOrId.contact_number ?? null)
    : null;
  const yearLevel = isObjectInput
    ? (userOrId.year_level ?? userOrId.current_year_level ?? null)
    : null;

  return jwt.sign(
    {
      id,
      role,
      is_verified: isVerified,
      first_name: firstName,
      program,
      contact_number: contactNumber,
      year_level: yearLevel
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate refresh token
exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
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
  const token = this.generateToken(user);
  const refreshToken = this.generateRefreshToken(user.id || user._id);

  const tokenExpiry = process.env.JWT_EXPIRE || '7d';
  const expiryTime = tokenExpiry.endsWith('d')
    ? parseInt(tokenExpiry) * 24 * 60 * 60 * 1000
    : parseInt(tokenExpiry) * 60 * 60 * 1000;

  const options = {
    expires: new Date(Date.now() + expiryTime),
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
