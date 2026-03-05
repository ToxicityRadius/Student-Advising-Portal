const { Sequelize } = require('sequelize');
const { PlanSubject, StudyPlan, Subject } = require('../models');

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

    // Flatten the nested Subject fields for easier frontend consumption
    const data = rows.map(r => ({
      target_term: r.target_term,
      subject_id: r.Subject.id,
      course_code: r.Subject.course_code,
      title: r.Subject.title,
      units: r.Subject.units,
      student_count: parseInt(r.student_count, 10)
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Demand forecast error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch demand forecast' });
  }
};
