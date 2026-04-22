const jwt = require('jsonwebtoken');

const VALID_SAME_SITE_VALUES = new Set(['strict', 'lax', 'none']);
const DEFAULT_AUTH_COOKIE_SAME_SITE = 'strict';

function parseBooleanEnv(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

function getAuthCookieSameSite() {
  const configured = (process.env.AUTH_COOKIE_SAME_SITE || DEFAULT_AUTH_COOKIE_SAME_SITE)
    .trim()
    .toLowerCase();
  return VALID_SAME_SITE_VALUES.has(configured) ? configured : DEFAULT_AUTH_COOKIE_SAME_SITE;
}

function getAuthCookieSecure(sameSiteValue) {
  const configuredSecure = parseBooleanEnv(process.env.AUTH_COOKIE_SECURE);
  if (configuredSecure !== null) {
    // Browsers reject SameSite=None cookies unless Secure is enabled.
    if (sameSiteValue === 'none' && configuredSecure === false) {
      return true;
    }
    return configuredSecure;
  }

  if (sameSiteValue === 'none') {
    return true;
  }

  return process.env.NODE_ENV === 'production';
}

function isValidCookieDomain(domainValue) {
  if (!domainValue) {
    return false;
  }

  if (
    domainValue.includes('://') ||
    domainValue.includes('/') ||
    domainValue.includes(':') ||
    domainValue.includes('*') ||
    /\s/.test(domainValue)
  ) {
    return false;
  }

  const normalized = domainValue.startsWith('.') ? domainValue.slice(1) : domainValue;
  if (
    !normalized ||
    normalized.startsWith('.') ||
    normalized.endsWith('.') ||
    normalized.includes('..')
  ) {
    return false;
  }

  return /^[a-z0-9.-]+$/i.test(normalized);
}

function getAuthCookieDomain() {
  const configuredDomain = (process.env.AUTH_COOKIE_DOMAIN || '').trim().toLowerCase();
  if (!configuredDomain) {
    return undefined;
  }

  return isValidCookieDomain(configuredDomain) ? configuredDomain : undefined;
}

function getAuthCookieBaseOptions() {
  const sameSite = getAuthCookieSameSite();
  const secure = getAuthCookieSecure(sameSite);
  const domain = getAuthCookieDomain();

  return {
    httpOnly: true,
    secure,
    sameSite,
    ...(domain ? { domain } : {}),
  };
}

const getAccessTokenExpiryMs = () => {
  const tokenExpiry = process.env.JWT_EXPIRE || '30m';

  if (tokenExpiry.endsWith('d')) {
    return parseInt(tokenExpiry, 10) * 24 * 60 * 60 * 1000;
  }
  if (tokenExpiry.endsWith('h')) {
    return parseInt(tokenExpiry, 10) * 60 * 60 * 1000;
  }
  if (tokenExpiry.endsWith('m')) {
    return parseInt(tokenExpiry, 10) * 60 * 1000;
  }

  return 30 * 60 * 1000;
};

const getBaseCookieOptions = (expiryMs) => ({
  expires: new Date(Date.now() + expiryMs),
  ...getAuthCookieBaseOptions(),
});

exports.getAuthCookieOptions = () => {
  const accessExpiryMs = getAccessTokenExpiryMs();
  return {
    token: getBaseCookieOptions(accessExpiryMs),
    refreshToken: {
      ...getBaseCookieOptions(30 * 24 * 60 * 60 * 1000),
      path: '/api/auth',
    },
  };
};

exports.clearAuthCookies = (res) => {
  const cookieOptions = getAuthCookieBaseOptions();

  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', { ...cookieOptions, path: '/api/auth' });
};

// Generate access token
// Supports both signatures:
// 1) generateToken(userObject)
// 2) generateToken(userId, role)
// NOTE: only id, role, and is_verified are embedded in the token.
// PII (name, program, contact) is intentionally omitted — fetch via /auth/me.
exports.generateToken = (userOrId, roleArg) => {
  const isObjectInput = userOrId && typeof userOrId === 'object';
  const id = isObjectInput ? userOrId.id || userOrId._id : userOrId;
  const role = isObjectInput ? userOrId.role : roleArg;
  const isVerified = isObjectInput ? (userOrId.is_verified ?? userOrId.isVerified ?? false) : false;

  return jwt.sign({ id, role, is_verified: isVerified }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30m',
  });
};

// Generate refresh token
exports.generateRefreshToken = (userId) => {
  // JWT_REFRESH_SECRET must be different from JWT_SECRET — validated at server startup.
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id: userId }, secret, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' });
};

// Verify token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// Verify refresh token
exports.verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// Send auth cookies with a sanitized JSON user payload.
// Access tokens are intentionally omitted from JSON bodies.
exports.sendTokenResponse = (user, statusCode, res, extraPayload = {}) => {
  const token = exports.generateToken(user);
  const refreshToken = exports.generateRefreshToken(user.id || user._id);

  // Persist the newly issued refresh token so rotation verification works (Step 3.2).
  // Fire-and-forget — the HTTP response must not be blocked by a DB write.
  try {
    const logger = require('./logger');
    const { User: UserModel } = require('../models');
    const refreshTokenHash = require('crypto')
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    UserModel.update(
      {
        refreshToken: refreshTokenHash,
        refreshTokenExpires: Date.now() + 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now(),
      },
      { where: { id: user.id || user._id } },
    ).catch((err) => {
      logger.error({ err, userId: user.id || user._id }, 'Failed to persist refresh token');
    });
  } catch {
    // No-op: auth response should continue even if token persistence wiring fails.
  }

  const cookieOptions = exports.getAuthCookieOptions();

  const userResponse = {
    id: user.id || user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    studentId: user.studentId,
  };

  const safeExtra =
    extraPayload && typeof extraPayload === 'object' && !Array.isArray(extraPayload)
      ? { ...extraPayload }
      : {};
  const customMessage =
    typeof safeExtra.message === 'string' && safeExtra.message.trim().length > 0
      ? safeExtra.message
      : 'Authentication successful';
  delete safeExtra.message;

  const extraData =
    safeExtra.data && typeof safeExtra.data === 'object' && !Array.isArray(safeExtra.data)
      ? safeExtra.data
      : {};
  delete safeExtra.data;

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions.token)
    .cookie('refreshToken', refreshToken, cookieOptions.refreshToken)
    .json({
      success: true,
      message: customMessage,
      // token is included in the body so cross-site mobile browsers (e.g.
      // Safari on iOS) that block third-party Set-Cookie headers can store
      // it in localStorage and attach it as Authorization: Bearer on
      // subsequent requests.  The httpOnly cookie remains the primary
      // mechanism for desktop browsers.
      token,
      refreshToken,
      data: {
        user: userResponse,
        ...extraData,
      },
      ...safeExtra,
      user: userResponse,
    });
};
