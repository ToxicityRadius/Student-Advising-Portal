const { sequelize, AcademicTerm, StudyPlanVersion, ForecastSnapshot } = require('../models');

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

    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ success: false, message: 'schoolYear must be in YYYY-YYYY format with consecutive years' });
    }

    if (![1, 2, 3].includes(parsedSemester)) {
      return res.status(400).json({ success: false, message: 'semester must be 1, 2, or 3' });
    }

    const existing = await AcademicTerm.findOne({ where: { schoolYear, semester: parsedSemester } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Term already exists for this school year and semester' });
    }

    const term = await AcademicTerm.create({
      schoolYear,
      semester: parsedSemester,
      isCurrent: false
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
    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
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
    const terms = await AcademicTerm.findAll({
      order: [['schoolYear', 'DESC'], ['semester', 'DESC'], ['id', 'DESC']]
    });

    return res.status(200).json({ success: true, data: terms });
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

    await AcademicTerm.update(
      { isCurrent: false },
      { where: { isCurrent: true }, transaction }
    );

    await term.update(
      {
        isCurrent: true,
        startedAt: Date.now()
      },
      { transaction }
    );

    await StudyPlanVersion.update(
      { needsRevalidation: true },
      { where: { status: 'active' }, transaction }
    );

    await transaction.commit();

    const refreshedTerm = await AcademicTerm.findByPk(term.id);
    return res.status(200).json({ success: true, data: refreshedTerm });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc   End current term and store forecast snapshot placeholder
// @route  PATCH /api/terms/current/end
// @access admin
exports.endCurrentTerm = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const currentTerm = await AcademicTerm.findOne({
      where: { isCurrent: true },
      transaction
    });

    if (!currentTerm) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'No active current term found' });
    }

    if (currentTerm.endedAt) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Current term has already been ended' });
    }

    const endedAt = Date.now();

    await currentTerm.update(
      {
        endedAt,
        closedById: req.user.id,
        isCurrent: false
      },
      { transaction }
    );

    await ForecastSnapshot.create(
      {
        academicTermId: currentTerm.id,
        schoolYear: currentTerm.schoolYear,
        semester: currentTerm.semester,
        snapshotData: {
          placeholder: true,
          note: 'Forecast snapshot placeholder. Full demand computation will be implemented in Phase 9.'
        },
        triggeredByUserId: req.user.id,
        createdAt: endedAt
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      data: {
        id: currentTerm.id,
        schoolYear: currentTerm.schoolYear,
        semester: currentTerm.semester,
        endedAt
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
