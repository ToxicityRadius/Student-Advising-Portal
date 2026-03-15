const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { shouldBypassAdminFirstLoginEnforcement } = require('../utils/featureFlags');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account not activated. Please check your email.'
        });
      }

      const isChangePasswordRoute = req.baseUrl === '/api/auth' && req.path === '/change-password';
      const isPasswordChangeToken = decoded.purpose === 'password_change';

      if (isPasswordChangeToken && !isChangePasswordRoute) {
        return res.status(403).json({
          success: false,
          message: 'Password change required before accessing this route'
        });
      }

      if (!isPasswordChangeToken && user.mustChangePassword && !isChangePasswordRoute && !shouldBypassAdminFirstLoginEnforcement(user)) {
        return res.status(403).json({
          success: false,
          message: 'Password change required before accessing this route'
        });
      }

      // Block all non-auth routes when email change is still required (Phase 2A)
      if (user.mustChangeEmail && !shouldBypassAdminFirstLoginEnforcement(user)) {
        const isAuthRoute = req.baseUrl === '/api/auth';
        if (!isAuthRoute) {
          return res.status(403).json({
            success: false,
            message: 'Email change required before accessing this route',
            code: 'EMAIL_CHANGE_REQUIRED'
          });
        }
      }

      // Store user and token info in request
      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      // Token expired or invalid
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Role-based access control middleware
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};
