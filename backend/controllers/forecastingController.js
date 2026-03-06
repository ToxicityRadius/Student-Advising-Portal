const { Sequelize } = require('sequelize');
const {
  PlanSubject,
  StudyPlan,
  Subject,
  OpenedSection,
  Grade,
  AcademicTerm,
  CourseOffering
} = require('../models');

/**
 * GET /api/forecasting/demand
 *
 * Aggregates demand for subjects across all *approved* study plans.
 * Returns rows grouped by (target_term, SubjectId) with a student_count.
 * Sorted by target_term ascending, then student_count descending.
 */
exports.getDemandForecast = async (req, res) => {
  try {
    // 1) Projected demand from approved study plans (exclude historical placements)
    const rows = await PlanSubject.findAll({
      attributes: [
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
      where: { is_historical: false },
      group: [
        'PlanSubject.SubjectId',
        'Subject.id',
        'Subject.course_code',
        'Subject.title',
        'Subject.units'
      ],
      order: [[Sequelize.literal('student_count'), 'DESC']],
      raw: true,
      nest: true
    });

    const demandData = rows.map(r => ({
      SubjectId: r.Subject.id,
      subjectCode: r.Subject.course_code,
      title: r.Subject.title,
      units: r.Subject.units,
      expectedCount: parseInt(r.student_count, 10)
    }));

    // 2) At-risk pipeline from active-term grades
    const activeTerm = await AcademicTerm.findOne({ where: { is_active: true } });
    let atRiskData = [];

    if (activeTerm) {
      const activeTermGrades = await Grade.findAll({
        where: { term_taken: activeTerm.term_name },
        include: [{ model: Subject, attributes: ['id', 'course_code'] }]
      });

      const atRiskMap = new Map();
      for (const grade of activeTermGrades) {
        const status = String(grade.status || '').toLowerCase();
        const prelim = grade.prelim_grade === null || grade.prelim_grade === undefined
          ? null
          : parseFloat(grade.prelim_grade);
        const midterm = grade.midterm_grade === null || grade.midterm_grade === undefined
          ? null
          : parseFloat(grade.midterm_grade);

        const triggersWarning = (
          status === 'failed' ||
          status === 'at_risk' ||
          grade.risk_status === 'at_risk' ||
          (prelim !== null && prelim > 3.0) ||
          (midterm !== null && midterm > 3.0)
        );

        if (!triggersWarning) continue;

        const subjectId = grade.SubjectId;
        const subjectCode = grade.Subject?.course_code || `SUBJ-${subjectId}`;
        const current = atRiskMap.get(subjectId) || { SubjectId: subjectId, subjectCode, atRiskCount: 0 };
        current.atRiskCount += 1;
        atRiskMap.set(subjectId, current);
      }

      atRiskData = Array.from(atRiskMap.values())
        .sort((a, b) => b.atRiskCount - a.atRiskCount);
    }

    // 3) Low-efficiency alerts: subjects manually/legal-opened in active term but expected < 5
    let lowEfficiencyAlerts = [];
    if (activeTerm) {
      const openOfferings = await CourseOffering.findAll({
        where: { target_term: activeTerm.term_name },
        include: [{ model: Subject, attributes: ['id', 'course_code', 'title'] }]
      });

      const demandMap = new Map(demandData.map(d => [d.SubjectId, d.expectedCount]));

      lowEfficiencyAlerts = openOfferings
        .map(offering => {
          const expectedCount = demandMap.get(offering.SubjectId) || 0;
          return {
            SubjectId: offering.SubjectId,
            subjectCode: offering.Subject?.course_code || `SUBJ-${offering.SubjectId}`,
            title: offering.Subject?.title || 'Unknown Subject',
            expectedCount,
            targetTerm: offering.target_term
          };
        })
        .filter(item => item.expectedCount < 5)
        .sort((a, b) => a.expectedCount - b.expectedCount);
    }

    return res.json({ demandData, atRiskData, lowEfficiencyAlerts });
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
