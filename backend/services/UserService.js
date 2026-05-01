/**
 * UserService — Business logic for user management and profile operations.
 *
 * Extracted from userController to separate HTTP concerns from domain logic.
 * Controllers delegate query composition, validation, and data transformation here.
 */

const { Op } = require('sequelize');
const { User, AcademicTerm, Curriculum, Program } = require('../models');
const { sanitizeUserWithProfile } = require('../utils/sanitize');
const { buildProgramWhere, isProgramChair } = require('../utils/programAccess');

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
const normalizePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const listUsers = async ({
  paginationParams,
  roleFilter,
  status,
  adviserId,
  programId,
  requestUser,
}) => {
  const { page, pageSize, search, sortBy, sortOrder, offset, limit } = paginationParams;

  const normalizedRoleFilter = String(roleFilter || '').trim();
  const baseWhere = {};
  if (normalizedRoleFilter) {
    baseWhere.role = normalizedRoleFilter;
  }

  if (requestUser && isProgramChair(requestUser)) {
    if (normalizedRoleFilter && !['student', 'adviser'].includes(normalizedRoleFilter)) {
      baseWhere.id = null;
    } else if (!normalizedRoleFilter) {
      baseWhere.role = { [Op.in]: ['student', 'adviser'] };
    }
  }
  const normalizedStatus = String(status || '')
    .trim()
    .toLowerCase();
  if (normalizedStatus === 'active') {
    baseWhere.isActive = true;
  } else if (normalizedStatus === 'inactive') {
    baseWhere.isActive = false;
  }

  const normalizedAdviserId = normalizePositiveInt(adviserId);
  if (normalizedAdviserId) {
    baseWhere.adviserId = normalizedAdviserId;
  }
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

  let where = searchWhere ? { [Op.and]: [baseWhere, searchWhere] } : baseWhere;
  const include = [
    {
      model: Program,
      as: 'AssignedPrograms',
      through: { attributes: [] },
      required: false,
    },
    {
      model: User,
      as: 'Adviser',
      attributes: ['id', 'firstName', 'lastName', 'email'],
      required: false,
    },
    {
      model: Curriculum,
      as: 'CurriculumRef',
      attributes: ['id', 'name', 'programId'],
      required: false,
      include: [{ model: Program, attributes: ['id', 'code', 'name'], required: false }],
    },
  ];

  if (requestUser && (isProgramChair(requestUser) || programId)) {
    const programScope = await buildProgramWhere(requestUser, programId);
    if (!programScope.allowed) {
      where = { id: null };
    } else if (programScope.programIds && programScope.programIds.length > 0) {
      const scopedProgramWhere = {
        [Op.or]: [
          { '$AssignedPrograms.id$': { [Op.in]: programScope.programIds } },
          { '$CurriculumRef.programId$': { [Op.in]: programScope.programIds } },
        ],
      };
      where = where[Op.and]
        ? { [Op.and]: [...where[Op.and], scopedProgramWhere] }
        : { [Op.and]: [where, scopedProgramWhere] };
    }
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include,
    distinct: true,
    order: [
      [sortBy, sortOrder],
      ['id', 'DESC'],
    ],
    offset,
    limit,
    subQuery: false,
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
