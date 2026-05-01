const { ROLE_SUPERADMIN, ROLE_PROGRAM_CHAIR, ROLE_ADVISER, ROLE_STUDENT } = require('../constants');

const PERMISSIONS = Object.freeze({
  managePrograms: 'managePrograms',
  manageUserDetails: 'manageUserDetails',
  toggleUserStatus: 'toggleUserStatus',
  transferOwnership: 'transferOwnership',
  assignAdviser: 'assignAdviser',
  manageCurriculum: 'manageCurriculum',
  manageTerms: 'manageTerms',
  manageOverrides: 'manageOverrides',
});

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

const ROLE_PERMISSIONS = Object.freeze({
  [ROLE_SUPERADMIN]: ALL_PERMISSIONS,
  [ROLE_PROGRAM_CHAIR]: Object.freeze([
    PERMISSIONS.assignAdviser,
    PERMISSIONS.manageCurriculum,
    PERMISSIONS.manageTerms,
    PERMISSIONS.manageOverrides,
  ]),
  [ROLE_ADVISER]: Object.freeze([]),
  [ROLE_STUDENT]: Object.freeze([]),
});

function hasPermission(user, permission) {
  if (!user || !permission) return false;
  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient Permission',
        code: 'INSUFFICIENT_PERMISSION',
      });
    }

    return next();
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  requirePermission,
};
