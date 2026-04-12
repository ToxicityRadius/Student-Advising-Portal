/**
 * UserService — Business logic for user management and profile operations.
 *
 * Extracted from userController to separate HTTP concerns from domain logic.
 * Controllers delegate query composition, validation, and data transformation here.
 */

const { Op } = require('sequelize');
const { User, AcademicTerm, Curriculum } = require('../models');
const { sanitizeUserWithProfile, computeProfileCompletionScore } = require('../utils/sanitize');

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
    attributes: ['id', 'schoolYear', 'semester'],
  });

  const currentTermKey = getTermKey(currentTerm);
  const lastSubmittedTermKey = user?.profile_last_submitted_term_key || null;

  return {
    currentProfileTerm: currentTerm
      ? {
          id: currentTerm.id,
          schoolYear: currentTerm.schoolYear,
          semester: currentTerm.semester,
          key: currentTermKey,
        }
      : null,
    lastSubmittedProfileTermKey: lastSubmittedTermKey,
    isProfileLockedForCurrentTerm: Boolean(
      lastSubmittedTermKey && currentTermKey && lastSubmittedTermKey === currentTermKey,
    ),
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
          { role: { [Op.iLike]: `%${search}%` } },
        ],
      }
    : null;

  const where = searchWhere ? { [Op.and]: [baseWhere, searchWhere] } : baseWhere;

  const { rows, count } = await User.findAndCountAll({
    where,
    order: [
      [sortBy, sortOrder],
      ['id', 'DESC'],
    ],
    offset,
    limit,
  });

  return { items: rows.map(sanitizeUserWithProfile), count, page, pageSize };
};

/**
 * Returns active curriculum options for profile form dropdowns.
 */
const getCurriculumOptions = async () => {
  return Curriculum.findAll({
    attributes: ['id', 'name', 'isActive'],
    order: [
      ['name', 'ASC'],
      ['id', 'DESC'],
    ],
  });
};

module.exports = {
  getTermKey,
  getStudentProfileLockMeta,
  listUsers,
  getCurriculumOptions,
  NO_ACTIVE_TERM_KEY,
};
