const { Sequelize } = require('sequelize');
const { PlanSubject, StudyPlan, Subject, OpenedSection } = require('../models');

/**
 * GET /api/forecasting/demand
 *
 * Aggregates demand for subjects across all *approved* study plans.
 * Returns rows grouped by (target_term, SubjectId) with a student_count.
 * Sorted by target_term ascending, then student_count descending.
 */
exports.getDemandForecast = async (req, res) => {
  try {
    const rows = await PlanSubject.findAll({
      attributes: [
        'target_term',
        'SubjectId',
        [Sequelize.fn('COUNT', Sequelize.col('PlanSubject.StudyPlanId')), 'student_count']
      ],
      include: [
        {
          model: StudyPlan,
          attributes: [],                       // we only need the WHERE filter
          where: { status: 'approved' }
        },
        {
          model: Subject,
          attributes: ['id', 'course_code', 'title', 'units']
        }
      ],
      group: [
        'PlanSubject.target_term',
        'PlanSubject.SubjectId',
        'Subject.id',
        'Subject.course_code',
        'Subject.title',
        'Subject.units'
      ],
      order: [
        ['target_term', 'ASC'],
        [Sequelize.literal('student_count'), 'DESC']
      ],
      raw: true,
      nest: true
    });

    // Fetch all opened sections to mark demand rows
    const openedSections = await OpenedSection.findAll({ raw: true });
    const openedSet = new Set(
      openedSections.map(os => `${os.SubjectId}::${os.target_term}`)
    );

    // Flatten the nested Subject fields for easier frontend consumption
    const data = rows.map(r => ({
      target_term: r.target_term,
      subject_id: r.Subject.id,
      course_code: r.Subject.course_code,
      title: r.Subject.title,
      units: r.Subject.units,
      student_count: parseInt(r.student_count, 10),
      is_opened: openedSet.has(`${r.Subject.id}::${r.target_term}`)
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Demand forecast error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch demand forecast' });
  }
};

/**
 * POST /api/forecasting/open
 *
 * Creates an OpenedSection record for the given SubjectId + target_term.
 */
exports.openSection = async (req, res) => {
  try {
    const { SubjectId, target_term } = req.body;

    if (!SubjectId || !target_term) {
      return res.status(400).json({ success: false, message: 'SubjectId and target_term are required' });
    }

    // Prevent duplicates
    const existing = await OpenedSection.findOne({ where: { SubjectId, target_term } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Section already opened for this subject and term' });
    }

    await OpenedSection.create({ SubjectId, target_term });

    return res.json({ success: true, message: 'Section opened successfully' });
  } catch (error) {
    console.error('Open section error:', error);
    return res.status(500).json({ success: false, message: 'Failed to open section' });
  }
};
