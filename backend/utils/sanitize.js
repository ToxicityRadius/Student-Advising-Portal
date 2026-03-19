/**
 * Shared user sanitization utility.
 *
 * Strips all sensitive/internal fields from a Sequelize User instance or
 * plain object before the data is sent to API consumers.
 *
 * Two variants:
 *  - sanitizeUser(user)              — auth context; applies featureFlag masking.
 *  - sanitizeUserWithProfile(user)   — user-management context; also computes
 *                                      profileCompletionScore.
 *
 * Both accept either a Sequelize instance (with .get()) or a plain object.
 */

const {
  maskUserFirstLoginFlags
} = require('./featureFlags');

const REQUIRED_PROFILE_FIELDS_COMMON = [
  'first_name',
  'last_name',
  'contact_number',
  'sex',
  'citizenship',
  'address',
  'emergency_contact_name',
  'emergency_contact_number',
  'profile_picture'
];

const REQUIRED_PROFILE_FIELDS_STUDENT = [
  'program',
  'curriculum_id',
  'student_type',
  'current_year_level'
];

function computeProfileCompletionScore(user) {
  const fields =
    user.role === 'student'
      ? [...REQUIRED_PROFILE_FIELDS_COMMON, ...REQUIRED_PROFILE_FIELDS_STUDENT]
      : REQUIRED_PROFILE_FIELDS_COMMON;

  const filled = fields.filter((f) => {
    const val = user[f];
    return val !== null && val !== undefined && val !== '';
  });

  return Math.round((filled.length / fields.length) * 100);
}

const SENSITIVE_FIELDS = [
  'password',
  'activationToken',
  'activationTokenExpires',
  'resetPasswordToken',
  'resetPasswordExpires',
  'verificationCode',
  'verificationCodeExpires',
  'refreshToken',
  'refreshTokenExpires'
];

/**
 * Base sanitizer used in auth flows.
 * Applies featureFlag masking (maskUserFirstLoginFlags) and removes
 * sensitive credential fields.
 */
function sanitizeUser(user) {
  if (!user) return null;
  const plain = maskUserFirstLoginFlags(user);
  SENSITIVE_FIELDS.forEach((f) => delete plain[f]);
  plain.gender = plain.sex ?? null;
  return plain;
}

/**
 * Extended sanitizer used in user-management endpoints.
 * In addition to base sanitization, adds profileCompletionScore.
 */
function sanitizeUserWithProfile(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : { ...user };
  SENSITIVE_FIELDS.forEach((f) => delete plain[f]);
  plain.profileCompletionScore = computeProfileCompletionScore(plain);
  plain.gender = plain.sex ?? null;
  return plain;
}

module.exports = { sanitizeUser, sanitizeUserWithProfile, computeProfileCompletionScore };
