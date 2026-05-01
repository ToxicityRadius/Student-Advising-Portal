const { Op } = require('sequelize');
const { sequelize, AcademicTerm, StudyPlanVersion } = require('../models');
const { storeForecastSnapshot } = require('./forecastController');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');
const {
  buildProgramWhere,
  canManageProgram,
  resolveManageProgramId,
} = require('../utils/programAccess');
const ActivityLogService = require('../services/ActivityLogService');

const isValidSchoolYear = (value) => {
  if (!/^\d{4}-\d{4}$/.test(value || '')) {
    return false;
  }

  const [start, end] = value.split('-').map(Number);
  return end === start + 1;
};

const parseSemester = (value) => Number(value);

// @desc   Create a new academic term (not active by default)
// @route  POST /api/terms
// @access admin
exports.createTerm = async (req, res, next) => {
  try {
    const { schoolYear, semester } = req.body;
    const parsedSemester = parseSemester(semester);
    const programId = await resolveManageProgramId(
      req.user,
      req.body.programId || req.query.programId,
    );
    if (!programId) {
      return res.status(403).json({ success: false, message: 'Program access denied' });
    }

    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({
        success: false,
        message: 'schoolYear must be in YYYY-YYYY format with consecutive years',
      });
    }

    if (![1, 2, 3].includes(parsedSemester)) {
      return res.status(400).json({ success: false, message: 'semester must be 1, 2, or 3' });
    }

    const existing = await AcademicTerm.findOne({
      where: { programId, schoolYear, semester: parsedSemester },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Term already exists for this school year and semester' });
    }

    const term = await AcademicTerm.create({
      programId,
      schoolYear,
      semester: parsedSemester,
      isCurrent: false,
    });

    return res.status(201).json({ success: true, data: term });
  } catch (error) {
    next(error);
  }
};

// @desc   Get currently active term
// @route  GET /api/terms/current
// @access admin, adviser, student
exports.getCurrentTerm = async (req, res, next) => {
  try {
    const programScope =
      req.user?.role === 'student' && !req.query.programId
        ? { where: {} }
        : await buildProgramWhere(req.user, req.query.programId, { allowStudent: true });
    const where = { isCurrent: true, ...programScope.where };
    const currentTerm = await AcademicTerm.findOne({ where });
    return res.status(200).json({ success: true, data: currentTerm || null });
  } catch (error) {
    next(error);
  }
};

// @desc   Get all terms
// @route  GET /api/terms
// @access admin, adviser
exports.getAllTerms = async (req, res, next) => {
  try {
    const { page, pageSize, search, sortBy, sortOrder, offset, limit } = parsePaginationParams(
      req.query,
      {
        defaultSortBy: 'schoolYear',
        allowedSortBy: ['schoolYear', 'semester', 'id'],
      },
    );

    const semesterSearch = Number.parseInt(search, 10);
    const searchFilters = [{ schoolYear: { [Op.iLike]: `%${search}%` } }];
    if (Number.isInteger(semesterSearch)) {
      searchFilters.push({ semester: semesterSearch });
    }

    const programScope = await buildProgramWhere(req.user, req.query.programId);
    if (!programScope.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const searchWhere = search ? { [Op.or]: searchFilters } : {};
    const where =
      Object.keys(searchWhere).length > 0
        ? { [Op.and]: [programScope.where, searchWhere] }
        : programScope.where;

    const { rows, count } = await AcademicTerm.findAndCountAll({
      where,
      order: [
        [sortBy, sortOrder],
        ['semester', 'DESC'],
        ['id', 'DESC'],
      ],
      offset,
      limit,
    });

    const payload = buildPaginatedPayload({
      items: rows,
      page,
      pageSize,
      totalItems: count,
    });

    return res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
};

// @desc   Activate a term and mark active study plans for revalidation
// @route  PATCH /api/terms/:id/activate
// @access admin
exports.activateTerm = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const term = await AcademicTerm.findByPk(req.params.id, { transaction });

    if (!term) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Term not found' });
    }

    if (!(await canManageProgram(req.user, term.programId))) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const existingCurrentTerm = await AcademicTerm.findOne({
      where: { programId: term.programId, isCurrent: true },
      transaction,
    });

    if (
      existingCurrentTerm &&
      String(existingCurrentTerm.id) !== String(term.id) &&
      !existingCurrentTerm.endedAt
    ) {
      await storeForecastSnapshot(existingCurrentTerm.id, req.user.id, {
        transaction,
        term: existingCurrentTerm,
      });
    }

    await AcademicTerm.update(
      { isCurrent: false },
      { where: { programId: term.programId, isCurrent: true }, transaction },
    );

    await term.update(
      {
        isCurrent: true,
        startedAt: Date.now(),
      },
      { transaction },
    );

    await StudyPlanVersion.update(
      { needsRevalidation: true },
      { where: { status: 'active' }, transaction },
    );

    await transaction.commit();

    const refreshedTerm = await AcademicTerm.findByPk(term.id);
    ActivityLogService.logSafe({
      programId: refreshedTerm.programId,
      actorId: req.user.id,
      action: 'term.activated',
      resourceType: 'academic_term',
      resourceId: refreshedTerm.id,
      resourceLabel: `${refreshedTerm.schoolYear} S${refreshedTerm.semester}`,
      metadata: { schoolYear: refreshedTerm.schoolYear, semester: refreshedTerm.semester },
    });
    return res.status(200).json({ success: true, data: refreshedTerm });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   End current term and store forecast snapshot
// @route  PATCH /api/terms/current/end
// @access admin
exports.endCurrentTerm = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const programId = await resolveManageProgramId(
      req.user,
      req.body.programId || req.query.programId,
    );
    if (!programId) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Program access denied' });
    }

    const currentTerm = await AcademicTerm.findOne({
      where: { programId, isCurrent: true },
      transaction,
    });

    if (!currentTerm) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'No active current term found' });
    }

    if (currentTerm.endedAt) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'Current term has already been ended' });
    }

    const endedAt = Date.now();

    await currentTerm.update(
      {
        endedAt,
        closedById: req.user.id,
        isCurrent: false,
      },
      { transaction },
    );

    await storeForecastSnapshot(currentTerm.id, req.user.id, {
      transaction,
      term: currentTerm,
      createdAt: endedAt,
    });

    await transaction.commit();

    ActivityLogService.logSafe({
      programId: currentTerm.programId,
      actorId: req.user.id,
      action: 'term.ended',
      resourceType: 'academic_term',
      resourceId: currentTerm.id,
      resourceLabel: `${currentTerm.schoolYear} S${currentTerm.semester}`,
      metadata: { schoolYear: currentTerm.schoolYear, semester: currentTerm.semester, endedAt },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: currentTerm.id,
        schoolYear: currentTerm.schoolYear,
        semester: currentTerm.semester,
        endedAt,
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
