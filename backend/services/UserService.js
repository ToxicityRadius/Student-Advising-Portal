/**
 * UserService — Business logic for user management and profile operations.
 *
 * Extracted from userController to separate HTTP concerns from domain logic.
 * Controllers delegate query composition, validation, and data transformation here.
 */

const { Op } = require('sequelize');
const { User, AcademicTerm, Curriculum } = require('../models');
const { sanitizeUserWithProfile, computeProfileCompletionScore } = require('../utils/sanitize');

const ALLOWED_SEX = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const ALLOWED_STUDENT_TYPES = ['regular', 'irregular', 'transferee', 'ladderized'];

const NO_ACTIVE_TERM_KEY = 'NO_ACTIVE_TERM';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const getTermKey = (term) => {
  if (!term) return NO_ACTIVE_TERM_KEY;
  return `${term.schoolYear}-S${term.semester}`;
};

/**
 * Returns profile-lock metadata for the given user if they are a student.
 */
const getStudentProfileLockMeta = async (user) => {
  if (user?.role !== 'student') return {};

  const currentTerm = await AcademicTerm.findOne({
    where: { isCurrent: true },
    attributes: ['id', 'schoolYear', 'semester']
  });

  const currentTermKey = getTermKey(currentTerm);
  const lastSubmittedTermKey = user?.profile_last_submitted_term_key || null;

  return {
    currentProfileTerm: currentTerm
      ? { id: currentTerm.id, schoolYear: currentTerm.schoolYear, semester: currentTerm.semester, key: currentTermKey }
      : null,
    lastSubmittedProfileTermKey: lastSubmittedTermKey,
    isProfileLockedForCurrentTerm: Boolean(
      lastSubmittedTermKey && currentTermKey && lastSubmittedTermKey === currentTermKey
    )
  };
};

/**
 * Builds a paginated query for users with optional role filter and search.
 */
const listUsers = async ({ paginationParams, roleFilter }) => {
  const { page, pageSize, search, sortBy, sortOrder, offset, limit } = paginationParams;

  const baseWhere = roleFilter ? { role: roleFilter } : {};
  const searchWhere = search
    ? {
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { role: { [Op.iLike]: `%${search}%` } }
      ]
    }
    : null;

  const where = searchWhere ? { [Op.and]: [baseWhere, searchWhere] } : baseWhere;

  const { rows, count } = await User.findAndCountAll({
    where,
    order: [[sortBy, sortOrder], ['id', 'DESC']],
    offset,
    limit
  });

  return { items: rows.map(sanitizeUserWithProfile), count, page, pageSize };
};

/**
 * Finds a user by ID and enriches with profile-lock metadata.
 * Returns null if not found.
 */
const getUserWithLockMeta = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const sanitized = sanitizeUserWithProfile(user);
  const lockMeta = await getStudentProfileLockMeta(user);
  return { ...sanitized, ...lockMeta };
};

/**
 * Returns active curriculum options for profile form dropdowns.
 */
const getCurriculumOptions = async () => {
  return Curriculum.findAll({
    attributes: ['id', 'name', 'isActive'],
    order: [['name', 'ASC'], ['id', 'DESC']]
  });
};

/**
 * Validates and normalises a profile update payload.
 * Returns { payload, errors } — if errors is non-empty, the caller should respond 400.
 */
const buildProfileUpdatePayload = ({ body, userRole, isAdminRequest }) => {
  const allowedFields = [
    'first_name', 'middle_name', 'last_name', 'suffix', 'preferred_name',
    'program', 'curriculum_id', 'student_type',
    'contact_number', 'alternate_email',
    'sex', 'citizenship', 'address',
    'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_number',
    'year_level'
  ];

  const payload = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  // adviserId may only be set by admins
  if (isAdminRequest && Object.prototype.hasOwnProperty.call(body, 'adviserId')) {
    payload.adviserId = body.adviserId;
  }

  // Accept 'gender' as alias for 'sex'
  if (!Object.prototype.hasOwnProperty.call(body, 'sex') && Object.prototype.hasOwnProperty.call(body, 'gender')) {
    payload.sex = body.gender;
  }

  const errors = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'sex') && payload.sex !== '' && payload.sex !== null) {
    if (!ALLOWED_SEX.includes(payload.sex)) {
      errors.sex = `sex must be one of: ${ALLOWED_SEX.join(', ')}`;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'student_type') && payload.student_type !== '' && payload.student_type !== null) {
    if (!ALLOWED_STUDENT_TYPES.includes(payload.student_type)) {
      errors.student_type = `student_type must be one of: ${ALLOWED_STUDENT_TYPES.join(', ')}`;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'alternate_email') && payload.alternate_email !== '' && payload.alternate_email !== null) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.alternate_email)) {
      errors.alternate_email = 'alternate_email must be a valid email address';
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'curriculum_id') && payload.curriculum_id !== '' && payload.curriculum_id !== null) {
    const cid = Number(payload.curriculum_id);
    if (Number.isNaN(cid) || !Number.isInteger(cid) || cid < 1) {
      errors.curriculum_id = 'curriculum_id must be a valid positive integer';
    } else {
      payload.curriculum_id = cid;
    }
  } else if (Object.prototype.hasOwnProperty.call(payload, 'curriculum_id')) {
    payload.curriculum_id = null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'adviserId')) {
    payload.adviserId = payload.adviserId === '' ? null : Number(payload.adviserId);
    if (payload.adviserId !== null && Number.isNaN(payload.adviserId)) {
      errors.adviserId = 'adviserId must be a valid number or empty';
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'year_level')) {
    const normalized = payload.year_level === '' || payload.year_level === null
      ? null
      : Number(payload.year_level);
    if (normalized !== null && (Number.isNaN(normalized) || normalized < 1 || normalized > 5)) {
      errors.year_level = 'year_level must be a number from 1 to 5';
    } else {
      payload.current_year_level = normalized;
      delete payload.year_level;
      if (userRole === 'student' && normalized !== null) {
        payload.is_onboarded = true;
      }
    }
  }

  return { payload, errors };
};

/**
 * Validates a student ID (7 digits) and checks for uniqueness conflict.
 * Returns an error message if invalid, otherwise null.
 */
const validateStudentId = async (studentId, currentUserId) => {
  if (!studentId || !/^\d{7}$/.test(studentId)) {
    return 'Student Number must be exactly 7 digits';
  }
  const existingUser = await User.findOne({ where: { studentId } });
  if (existingUser && String(existingUser.id) !== String(currentUserId)) {
    return 'This Student Number is already registered to another account';
  }
  return null;
};

module.exports = {
  getTermKey,
  getStudentProfileLockMeta,
  listUsers,
  getUserWithLockMeta,
  getCurriculumOptions,
  buildProfileUpdatePayload,
  validateStudentId,
  NO_ACTIVE_TERM_KEY
};
