const { Op } = require('sequelize');
const {
  PrerequisiteOverrideRequest,
  StudentAcademicRecord,
  StudyPlanVersion,
  Course,
  User,
  Program,
} = require('../models');
const NotificationService = require('../services/NotificationService');
const ActivityLogService = require('../services/ActivityLogService');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');
const { buildProgramWhere, isSuperadmin, normalizeProgramId } = require('../utils/programAccess');

const VALID_DECISIONS = new Set(['approved', 'rejected']);

const includeOverrideRelations = [
  {
    model: StudentAcademicRecord,
    attributes: ['id', 'studentName', 'studentNumber', 'email', 'programId'],
    include: [{ model: Program, attributes: ['id', 'code', 'name'] }],
  },
  { model: Program, attributes: ['id', 'code', 'name'], required: false },
  { model: StudyPlanVersion, attributes: ['id', 'versionNumber', 'status'] },
  { model: Course, as: 'PrerequisiteCourse', attributes: ['id', 'code', 'name'] },
  { model: Course, as: 'DependentCourse', attributes: ['id', 'code', 'name'] },
  { model: User, as: 'RequestedByAdviser', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: User, as: 'DecidedByAdmin', attributes: ['id', 'firstName', 'lastName', 'email'] },
];

const serializeOverride = (override) => {
  const plain = override?.get ? override.get({ plain: true }) : override;
  return {
    ...plain,
    sar: plain.StudentAcademicRecord || null,
    program: plain.Program || plain.StudentAcademicRecord?.Program || null,
    prerequisiteCourse: plain.PrerequisiteCourse || null,
    dependentCourse: plain.DependentCourse || null,
    requestedByAdviser: plain.RequestedByAdviser || null,
    decidedByAdmin: plain.DecidedByAdmin || null,
  };
};

exports.listPrerequisiteOverrides = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(
      req.query,
      {
        defaultSortBy: 'createdAt',
        allowedSortBy: ['createdAt', 'updatedAt', 'status', 'yearLevel', 'semester'],
      },
    );
    const where = {};
    const status = String(req.query.status || '')
      .trim()
      .toLowerCase();

    if (status) {
      where.status = status;
    }

    if (req.user.role === 'adviser') {
      where.requestedByAdviserId = req.user.id;
    }

    if (req.query.studyPlanVersionId) {
      where.studyPlanVersionId = req.query.studyPlanVersionId;
    }

    if (req.query.studentAcademicRecordId) {
      where.studentAcademicRecordId = req.query.studentAcademicRecordId;
    }

    const requestedProgramId = normalizeProgramId(req.query.programId);
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || requestedProgramId) {
      const programScope = await buildProgramWhere(req.user, requestedProgramId);
      if (!programScope.allowed) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (!(isSuperadmin(req.user) && !requestedProgramId)) {
        where.programId =
          programScope.programIds && programScope.programIds.length > 0
            ? programScope.programIds.length === 1
              ? programScope.programIds[0]
              : { [Op.in]: programScope.programIds }
            : { [Op.in]: [] };
      }
    }

    const include = includeOverrideRelations;
    const query = {
      where,
      include,
      order: [
        [sortBy, sortOrder],
        ['id', 'DESC'],
      ],
      offset,
      limit,
      distinct: true,
    };

    if (search) {
      query.where = {
        [Op.and]: [
          where,
          {
            [Op.or]: [
              { '$StudentAcademicRecord.studentName$': { [Op.iLike]: `%${search}%` } },
              { '$StudentAcademicRecord.studentNumber$': { [Op.iLike]: `%${search}%` } },
              { '$PrerequisiteCourse.code$': { [Op.iLike]: `%${search}%` } },
              { '$DependentCourse.code$': { [Op.iLike]: `%${search}%` } },
            ],
          },
        ],
      };
    }

    const { rows, count } = await PrerequisiteOverrideRequest.findAndCountAll(query);
    const items = rows.map(serializeOverride);
    const payload = buildPaginatedPayload({ items, page, pageSize, totalItems: count });
    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};

exports.decidePrerequisiteOverride = async (req, res, next) => {
  try {
    const status = String(req.body?.status || '')
      .trim()
      .toLowerCase();
    if (!VALID_DECISIONS.has(status)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_OVERRIDE_DECISION',
        message: 'status must be approved or rejected',
      });
    }

    const override = await PrerequisiteOverrideRequest.findByPk(req.params.id, {
      include: includeOverrideRelations,
    });

    if (!override) {
      return res
        .status(404)
        .json({ success: false, message: 'Prerequisite override request not found' });
    }

    await override.update({
      status,
      decisionNotes: req.body?.decisionNotes ? String(req.body.decisionNotes).trim() : null,
      decidedByAdminId: req.user.id,
      decidedAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await PrerequisiteOverrideRequest.findByPk(override.id, {
      include: includeOverrideRelations,
    });

    if (updated?.requestedByAdviserId) {
      NotificationService.notify({
        recipientId: updated.requestedByAdviserId,
        actorId: req.user.id,
        category:
          status === 'approved'
            ? 'prerequisite_override_approved'
            : 'prerequisite_override_rejected',
        resourceType: 'prerequisite_override_request',
        resourceId: updated.id,
        meta: {
          prerequisiteCode: updated.PrerequisiteCourse?.code,
          dependentCode: updated.DependentCourse?.code,
        },
      });
    }

    ActivityLogService.logSafe({
      programId: updated.programId || updated.StudentAcademicRecord?.programId,
      actorId: req.user?.id,
      action:
        status === 'approved' ? 'prerequisite_override.approved' : 'prerequisite_override.rejected',
      resourceType: 'prerequisite_override_request',
      resourceId: updated.id,
      resourceLabel: `${updated.PrerequisiteCourse?.code || 'Prerequisite'} -> ${updated.DependentCourse?.code || 'Dependent'}`,
      targetUserId: updated.requestedByAdviserId,
      metadata: { status, decisionNotes: updated.decisionNotes || null },
    });

    return res.status(200).json({ success: true, data: serializeOverride(updated) });
  } catch (error) {
    next(error);
  }
};
