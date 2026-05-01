const { Op } = require('sequelize');
const { UserProgramAssignment, Program } = require('../models');
const {
  ROLE_SUPERADMIN,
  ROLE_PROGRAM_CHAIR,
  ROLE_ADVISER,
  DEFAULT_PROGRAM_CODE,
} = require('../constants');

const normalizeProgramId = (programId) => {
  const value = Number(programId);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const isSuperadmin = (user) => user?.role === ROLE_SUPERADMIN;
const isProgramChair = (user) => user?.role === ROLE_PROGRAM_CHAIR;
const isAdviser = (user) => user?.role === ROLE_ADVISER;
const hasProgramAssignments = (user) => isProgramChair(user) || isAdviser(user);

const uniqueIds = (ids) =>
  Array.from(new Set(ids.map((id) => normalizeProgramId(id)).filter((id) => id !== null)));

const getDefaultProgramId = async () => {
  const program = await Program.findOne({
    where: { code: DEFAULT_PROGRAM_CODE },
    attributes: ['id'],
  });
  return program ? program.id : null;
};

const getAssignedProgramIds = async (userId) => {
  const rows = await UserProgramAssignment.findAll({
    where: { userId },
    attributes: ['programId'],
  });
  return uniqueIds(rows.map((row) => row.programId));
};

const getAccessibleProgramIds = async (user) => {
  if (isSuperadmin(user)) return null;
  if (!hasProgramAssignments(user)) return [];

  return getAssignedProgramIds(user.id);
};

const canReadProgram = async (user, programId) => {
  const normalizedProgramId = normalizeProgramId(programId);
  if (!normalizedProgramId) return false;
  const accessibleIds = await getAccessibleProgramIds(user);
  return accessibleIds === null || accessibleIds.includes(normalizedProgramId);
};

const canManageProgram = async (user, programId) => {
  const normalizedProgramId = normalizeProgramId(programId);
  if (!normalizedProgramId) return false;
  if (isSuperadmin(user)) return true;
  if (!isProgramChair(user)) return false;
  const accessibleIds = await getAccessibleProgramIds(user);
  return accessibleIds === null || accessibleIds.includes(normalizedProgramId);
};

const buildProgramWhere = async (user, requestedProgramId = null, options = {}) => {
  const { allowStudent = false } = options;
  const normalizedRequestedId = normalizeProgramId(requestedProgramId);

  if (user?.role === 'student' && !allowStudent) {
    return { allowed: false, where: { programId: { [Op.in]: [] } }, programIds: [] };
  }

  const accessibleIds = await getAccessibleProgramIds(user);
  if (accessibleIds === null) {
    return {
      allowed: true,
      where: normalizedRequestedId ? { programId: normalizedRequestedId } : {},
      programIds: normalizedRequestedId ? [normalizedRequestedId] : null,
    };
  }

  if (normalizedRequestedId && !accessibleIds.includes(normalizedRequestedId)) {
    return { allowed: false, where: { programId: { [Op.in]: [] } }, programIds: [] };
  }

  const programIds = normalizedRequestedId ? [normalizedRequestedId] : accessibleIds;
  return {
    allowed: true,
    where:
      programIds.length > 0
        ? { programId: { [Op.in]: programIds } }
        : { programId: { [Op.in]: [] } },
    programIds,
  };
};

const resolveManageProgramId = async (user, requestedProgramId = null) => {
  const normalizedRequestedId = normalizeProgramId(requestedProgramId);
  if (normalizedRequestedId) {
    return (await canManageProgram(user, normalizedRequestedId)) ? normalizedRequestedId : null;
  }

  if (isSuperadmin(user)) {
    const defaultProgramId = await getDefaultProgramId();
    return defaultProgramId;
  }

  if (!isProgramChair(user)) return null;
  const accessibleIds = await getAccessibleProgramIds(user);
  return accessibleIds && accessibleIds.length > 0 ? accessibleIds[0] : null;
};

module.exports = {
  ROLE_SUPERADMIN,
  ROLE_PROGRAM_CHAIR,
  ROLE_ADVISER,
  isSuperadmin,
  isProgramChair,
  isAdviser,
  getAccessibleProgramIds,
  canReadProgram,
  canManageProgram,
  buildProgramWhere,
  resolveManageProgramId,
  normalizeProgramId,
};
