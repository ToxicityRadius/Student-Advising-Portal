const { Op } = require('sequelize');
const { ActivityLog, Program, StudentAcademicRecord, User } = require('../models');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');
const { buildNonSuperadminActivityWhere } = require('../utils/activityVisibility');
const {
  buildProgramWhere,
  canReadProgram,
  isSuperadmin,
  normalizeProgramId,
} = require('../utils/programAccess');

const includeActivityRelations = [
  { model: Program, attributes: ['id', 'code', 'name'], required: false },
  {
    model: User,
    as: 'Actor',
    attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
    required: false,
  },
  {
    model: User,
    as: 'TargetUser',
    attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
    required: false,
  },
];

exports.listActivity = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(
      req.query,
      {
        defaultSortBy: 'createdAt',
        allowedSortBy: ['createdAt', 'action', 'resourceType'],
      },
    );

    const filters = {};
    const requestedProgramId = normalizeProgramId(req.query.programId);
    const resourceType = req.query.resourceType ? String(req.query.resourceType).trim() : '';
    const resourceId = req.query.resourceId ? String(req.query.resourceId).trim() : '';
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (req.query.actorId) filters.actorId = Number(req.query.actorId);
    if (req.query.action) filters.action = String(req.query.action).trim();

    const whereParts = [filters];
    const isSarScopedTimeline = resourceType === 'sar' && resourceId;
    const actorVisibilityWhere = buildNonSuperadminActivityWhere(req.user);

    if (isSarScopedTimeline) {
      const sar = await StudentAcademicRecord.findByPk(resourceId, {
        attributes: ['id', 'programId'],
      });
      if (!sar) {
        return res
          .status(404)
          .json({ success: false, message: 'Student academic record not found' });
      }

      if (requestedProgramId && requestedProgramId !== sar.programId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      if (req.user.role === 'admin' && !(await canReadProgram(req.user, sar.programId))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      whereParts.push({ programId: sar.programId });
    } else {
      const programScope = await buildProgramWhere(req.user, requestedProgramId);
      if (!programScope.allowed) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      if (!(isSuperadmin(req.user) && !requestedProgramId)) {
        const programIds = programScope.programIds || [];
        whereParts.push({
          programId: programIds.length > 0 ? { [Op.in]: programIds } : { [Op.is]: null },
        });
      }
    }

    if (actorVisibilityWhere) {
      whereParts.push(actorVisibilityWhere);
    }

    if (search) {
      whereParts.push({
        [Op.or]: [
          { action: { [Op.iLike]: `%${search}%` } },
          { resourceType: { [Op.iLike]: `%${search}%` } },
          { resourceLabel: { [Op.iLike]: `%${search}%` } },
        ],
      });
    }

    const where = whereParts.length > 1 ? { [Op.and]: whereParts } : filters;
    const { rows, count } = await ActivityLog.findAndCountAll({
      where,
      include: includeActivityRelations,
      order: [
        [sortBy, sortOrder],
        ['id', 'DESC'],
      ],
      offset,
      limit,
      distinct: true,
    });

    const payload = buildPaginatedPayload({ items: rows, page, pageSize, totalItems: count });
    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};
