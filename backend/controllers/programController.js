const { Op } = require('sequelize');
const { Program, User, UserProgramAssignment } = require('../models');
const {
  isSuperadmin,
  getAccessibleProgramIds,
  canManageProgram,
} = require('../utils/programAccess');
const { DEFAULT_PROGRAM } = require('../constants');
const ActivityLogService = require('../services/ActivityLogService');

const normalizeProgramPayload = (body) => ({
  code: String(body.code || '')
    .trim()
    .toUpperCase(),
  name: String(body.name || '').trim(),
  collegeName:
    body.collegeName === undefined && body.departmentName === undefined
      ? null
      : String(body.collegeName ?? body.departmentName ?? '').trim() || null,
  emailSuffix:
    body.emailSuffix === undefined
      ? null
      : String(body.emailSuffix || '')
          .trim()
          .toLowerCase() || null,
  isActive: body.isActive === undefined ? true : Boolean(body.isActive),
});

const validateProgramPayload = (payload) => {
  const errors = {};
  if (!payload.code) errors.code = 'Program code is required';
  if (!payload.name) errors.name = 'Program name is required';
  if (payload.emailSuffix && !payload.emailSuffix.endsWith('@tip.edu.ph')) {
    errors.emailSuffix = 'Email suffix must end with @tip.edu.ph';
  }
  if (payload.emailSuffix && !payload.emailSuffix.startsWith('.')) {
    errors.emailSuffix = 'Email suffix must start with a college dot suffix';
  }
  return errors;
};

const includeAssignments = [
  {
    model: User,
    as: 'AssignedUsers',
    attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
    through: { attributes: [] },
    required: false,
  },
];

exports.ensureDefaultProgram = async () => {
  const [program] = await Program.findOrCreate({
    where: { code: DEFAULT_PROGRAM.code },
    defaults: { ...DEFAULT_PROGRAM, createdAt: Date.now(), updatedAt: Date.now() },
  });
  return program;
};

exports.listPrograms = async (req, res, next) => {
  try {
    const accessibleIds = await getAccessibleProgramIds(req.user);
    const where = {};

    if (!isSuperadmin(req.user)) {
      if (!accessibleIds || accessibleIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
      where.id = { [Op.in]: accessibleIds };
    }

    if (req.query.active !== undefined) {
      where.isActive = String(req.query.active).toLowerCase() === 'true';
    }

    const programs = await Program.findAll({
      where,
      include: isSuperadmin(req.user) ? includeAssignments : [],
      order: [
        ['code', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return res.status(200).json({ success: true, data: programs });
  } catch (error) {
    next(error);
  }
};

exports.createProgram = async (req, res, next) => {
  try {
    if (!isSuperadmin(req.user)) {
      return res
        .status(403)
        .json({ success: false, message: 'Only Super Admin can create programs' });
    }

    const payload = normalizeProgramPayload(req.body);
    const errors = validateProgramPayload(payload);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const existing = await Program.findOne({ where: { code: payload.code } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Program code already exists' });
    }

    const program = await Program.create({
      ...payload,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    ActivityLogService.logSafe({
      programId: program.id,
      actorId: req.user?.id,
      action: 'program.created',
      resourceType: 'program',
      resourceId: program.id,
      resourceLabel: program.code,
      metadata: { name: program.name, isActive: program.isActive },
    });

    return res.status(201).json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
};

exports.updateProgram = async (req, res, next) => {
  try {
    const program = await Program.findByPk(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    if (!(await canManageProgram(req.user, program.id))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const payload = normalizeProgramPayload({
      ...program.get({ plain: true }),
      ...req.body,
      code: req.body.code === undefined ? program.code : req.body.code,
    });
    const errors = validateProgramPayload(payload);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    if (payload.code !== program.code) {
      const existing = await Program.findOne({ where: { code: payload.code } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Program code already exists' });
      }
    }

    await program.update({ ...payload, updatedAt: Date.now() });
    ActivityLogService.logSafe({
      programId: program.id,
      actorId: req.user?.id,
      action: 'program.updated',
      resourceType: 'program',
      resourceId: program.id,
      resourceLabel: program.code,
      metadata: { name: program.name, isActive: program.isActive },
    });
    return res.status(200).json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
};

exports.setUserProgramAssignments = async (req, res, next) => {
  try {
    if (!isSuperadmin(req.user)) {
      return res
        .status(403)
        .json({ success: false, message: 'Only Super Admin can manage assignments' });
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const programIds = Array.isArray(req.body.programIds)
      ? Array.from(
          new Set(
            req.body.programIds
              .map((programId) => Number(programId))
              .filter((programId) => Number.isInteger(programId) && programId > 0),
          ),
        )
      : [];

    const existingCount = await Program.count({ where: { id: { [Op.in]: programIds } } });
    if (existingCount !== programIds.length) {
      return res.status(400).json({ success: false, message: 'One or more programs do not exist' });
    }

    await UserProgramAssignment.destroy({ where: { userId: user.id } });
    if (programIds.length > 0) {
      await UserProgramAssignment.bulkCreate(
        programIds.map((programId) => ({
          userId: user.id,
          programId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
      );
    }

    const refreshed = await User.findByPk(user.id, {
      include: [{ model: Program, as: 'AssignedPrograms' }],
    });
    ActivityLogService.logSafe({
      actorId: req.user?.id,
      action: 'user.program_assignments_updated',
      resourceType: 'user',
      resourceId: user.id,
      resourceLabel: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email,
      targetUserId: user.id,
      metadata: { programIds },
    });
    return res.status(200).json({ success: true, data: refreshed });
  } catch (error) {
    next(error);
  }
};
