const { Op } = require('sequelize');
const {
  InactiveCurriculumRegenerationRequest,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  Curriculum,
  Program,
  User,
} = require('../models');
const NotificationService = require('../services/NotificationService');
const ActivityLogService = require('../services/ActivityLogService');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');
const {
  buildProgramWhere,
  canReadProgram,
  canManageProgram,
  isSuperadmin,
  normalizeProgramId,
} = require('../utils/programAccess');

const VALID_DECISIONS = new Set(['approved', 'rejected']);

const includeInactiveRegenerationRelations = [
  {
    model: StudentAcademicRecord,
    attributes: ['id', 'studentName', 'studentNumber', 'email', 'programId'],
    include: [{ model: Program, attributes: ['id', 'code', 'name'] }],
  },
  { model: Program, attributes: ['id', 'code', 'name'], required: false },
  { model: Curriculum, attributes: ['id', 'name', 'isActive'] },
  { model: StudyPlanVersion, attributes: ['id', 'versionNumber', 'status'] },
  { model: User, as: 'RequestedByAdviser', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: User, as: 'DecidedByAdmin', attributes: ['id', 'firstName', 'lastName', 'email'] },
];

const serializeRequest = (request) => {
  const plain = request?.get ? request.get({ plain: true }) : request;
  return {
    ...plain,
    sar: plain.StudentAcademicRecord || null,
    program: plain.Program || plain.StudentAcademicRecord?.Program || null,
    curriculum: plain.Curriculum || null,
    studyPlanVersion: plain.StudyPlanVersion || null,
    requestedByAdviser: plain.RequestedByAdviser || null,
    decidedByAdmin: plain.DecidedByAdmin || null,
  };
};

const adviserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Adviser';

const findProgramChairs = async (programId) =>
  User.findAll({
    where: { role: 'admin' },
    attributes: ['id'],
    include: [
      {
        model: Program,
        as: 'AssignedPrograms',
        attributes: ['id'],
        through: { attributes: [] },
        where: { id: programId },
        required: true,
      },
    ],
  });

exports.requestInactiveCurriculumRegenerationApproval = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [
        { model: StudyPlan, attributes: ['id', 'studentAcademicRecordId'] },
        { model: Curriculum, attributes: ['id', 'name', 'isActive'] },
      ],
    });

    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (!(await canReadProgram(req.user, sar.programId))) {
      return res.status(403).json({ success: false, message: 'Program access denied' });
    }

    if (!sar.StudyPlan) {
      return res
        .status(400)
        .json({ success: false, message: 'No study plan exists for this student academic record' });
    }

    const curriculum =
      sar.Curriculum ||
      (sar.curriculumId
        ? await Curriculum.findByPk(sar.curriculumId, {
            attributes: ['id', 'name', 'isActive'],
          })
        : null);

    if (!curriculum) {
      return res
        .status(400)
        .json({ success: false, message: 'The student academic record has no curriculum.' });
    }

    if (curriculum.isActive) {
      return res.status(400).json({
        success: false,
        code: 'CURRICULUM_ALREADY_ACTIVE',
        message: 'Program Chair approval is not required for an active curriculum.',
      });
    }

    const activeVersion = await StudyPlanVersion.findOne({
      where: { studyPlanId: sar.StudyPlan.id, status: 'active' },
      attributes: ['id', 'versionNumber', 'status'],
    });

    if (!activeVersion) {
      return res
        .status(404)
        .json({ success: false, message: 'No active study plan version found for regeneration' });
    }

    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({
        success: false,
        code: 'INACTIVE_CURRICULUM_REQUEST_REASON_REQUIRED',
        message: 'A reason is required before requesting Program Chair approval.',
      });
    }

    const existingPending = await InactiveCurriculumRegenerationRequest.findOne({
      where: {
        studentAcademicRecordId: sar.id,
        curriculumId: curriculum.id,
        studyPlanVersionId: activeVersion.id,
        status: 'pending',
      },
    });

    if (existingPending) {
      return res.status(200).json({ success: true, data: serializeRequest(existingPending) });
    }

    const now = new Date();
    const request = await InactiveCurriculumRegenerationRequest.create({
      studentAcademicRecordId: sar.id,
      programId: sar.programId,
      curriculumId: curriculum.id,
      studyPlanVersionId: activeVersion.id,
      status: 'pending',
      reason,
      requestedByAdviserId: req.user.id,
      createdAt: now,
      updatedAt: now,
    });

    const chairs = await findProgramChairs(sar.programId);
    chairs.forEach((chair) => {
      NotificationService.notify({
        recipientId: chair.id,
        actorId: req.user.id,
        category: 'inactive_curriculum_regeneration_requested',
        resourceType: 'inactive_curriculum_regeneration_request',
        resourceId: request.id,
        meta: {
          adviserName: adviserName(req.user),
          studentName: sar.studentName,
          curriculumName: curriculum.name,
        },
      });
    });

    ActivityLogService.logSafe({
      programId: sar.programId,
      actorId: req.user.id,
      action: 'inactive_curriculum_regeneration.requested',
      resourceType: 'inactive_curriculum_regeneration_request',
      resourceId: request.id,
      resourceLabel: curriculum.name,
      targetUserId: sar.userId || null,
      metadata: { sarId: sar.id, studyPlanVersionId: activeVersion.id },
    });

    return res.status(201).json({ success: true, data: serializeRequest(request) });
  } catch (error) {
    next(error);
  }
};

exports.listInactiveCurriculumRegenerationRequests = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(
      req.query,
      {
        defaultSortBy: 'createdAt',
        allowedSortBy: ['createdAt', 'updatedAt', 'status'],
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

    const query = {
      where,
      include: includeInactiveRegenerationRelations,
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
              { '$Curriculum.name$': { [Op.iLike]: `%${search}%` } },
            ],
          },
        ],
      };
    }

    const { rows, count } = await InactiveCurriculumRegenerationRequest.findAndCountAll(query);
    const items = rows.map(serializeRequest);
    const payload = buildPaginatedPayload({ items, page, pageSize, totalItems: count });
    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};

exports.decideInactiveCurriculumRegenerationRequest = async (req, res, next) => {
  try {
    const status = String(req.body?.status || '')
      .trim()
      .toLowerCase();
    if (!VALID_DECISIONS.has(status)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_INACTIVE_CURRICULUM_REGENERATION_DECISION',
        message: 'status must be approved or rejected',
      });
    }

    const request = await InactiveCurriculumRegenerationRequest.findByPk(req.params.id, {
      include: includeInactiveRegenerationRelations,
    });

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: 'Inactive curriculum regeneration request not found' });
    }

    const programId = request.programId || request.StudentAcademicRecord?.programId;
    if (!(await canManageProgram(req.user, programId))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await request.update({
      status,
      decisionNotes: req.body?.decisionNotes ? String(req.body.decisionNotes).trim() : null,
      decidedByAdminId: req.user.id,
      decidedAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await InactiveCurriculumRegenerationRequest.findByPk(request.id, {
      include: includeInactiveRegenerationRelations,
    });

    if (updated?.requestedByAdviserId) {
      NotificationService.notify({
        recipientId: updated.requestedByAdviserId,
        actorId: req.user.id,
        category:
          status === 'approved'
            ? 'inactive_curriculum_regeneration_approved'
            : 'inactive_curriculum_regeneration_rejected',
        resourceType: 'inactive_curriculum_regeneration_request',
        resourceId: updated.id,
        meta: {
          studentName: updated.StudentAcademicRecord?.studentName,
          curriculumName: updated.Curriculum?.name,
          sarId: updated.studentAcademicRecordId,
          versionId: updated.studyPlanVersionId,
        },
      });
    }

    ActivityLogService.logSafe({
      programId,
      actorId: req.user?.id,
      action:
        status === 'approved'
          ? 'inactive_curriculum_regeneration.approved'
          : 'inactive_curriculum_regeneration.rejected',
      resourceType: 'inactive_curriculum_regeneration_request',
      resourceId: updated.id,
      resourceLabel: updated.Curriculum?.name || 'Inactive curriculum regeneration',
      targetUserId: updated.requestedByAdviserId,
      metadata: { status, decisionNotes: updated.decisionNotes || null },
    });

    return res.status(200).json({ success: true, data: serializeRequest(updated) });
  } catch (error) {
    next(error);
  }
};
