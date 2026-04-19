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

const { maskUserFirstLoginFlags } = require('./featureFlags');

const REQUIRED_PROFILE_FIELDS_COMMON = [
  'firstName',
  'lastName',
  'contactNumber',
  'sex',
  'citizenship',
  'address',
  'emergencyContactName',
  'emergencyContactNumber',
  'profilePicture',
];

const REQUIRED_PROFILE_FIELDS_STUDENT = [
  'program',
  'curriculumId',
  'studentType',
  'currentYearLevel',
];

const FIELD_ALIASES = {
  firstName: ['firstName', 'first_name'],
  lastName: ['lastName', 'last_name'],
  contactNumber: ['contactNumber', 'contact_number'],
  emergencyContactName: ['emergencyContactName', 'emergency_contact_name'],
  emergencyContactNumber: ['emergencyContactNumber', 'emergency_contact_number'],
  profilePicture: ['profilePicture', 'profile_picture'],
  curriculumId: ['curriculumId', 'curriculum_id'],
  studentType: ['studentType', 'student_type'],
  currentYearLevel: ['currentYearLevel', 'current_year_level'],
};

const getFieldValue = (user, field) => {
  const aliases = FIELD_ALIASES[field] || [field];
  for (const alias of aliases) {
    const value = user?.[alias];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
};

const normalizeNameAliases = (plain) => {
  if (!plain) {
    return plain;
  }

  if (!plain.firstName && plain.first_name) {
    plain.firstName = plain.first_name;
  }

  if (!plain.lastName && plain.last_name) {
    plain.lastName = plain.last_name;
  }

  return plain;
};

function computeProfileCompletionScore(user) {
  const fields =
    user.role === 'student'
      ? [...REQUIRED_PROFILE_FIELDS_COMMON, ...REQUIRED_PROFILE_FIELDS_STUDENT]
      : REQUIRED_PROFILE_FIELDS_COMMON;

  const filled = fields.filter((f) => {
    const val = getFieldValue(user, f);
    return val !== null;
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
  'refreshTokenExpires',
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
  normalizeNameAliases(plain);
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
  normalizeNameAliases(plain);
  plain.profileCompletionScore = computeProfileCompletionScore(plain);
  plain.gender = plain.sex ?? null;
  return plain;
}

module.exports = { sanitizeUser, sanitizeUserWithProfile, computeProfileCompletionScore };
