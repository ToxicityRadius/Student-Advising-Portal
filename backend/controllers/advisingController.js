const {
  AcademicTerm,
  Grade,
  Subject,
  Prerequisite,
  Curriculum,
  StudyPlan,
  PlanSubject,
  User,
  CourseOffering
} = require('../models');

function parseAcademicTerm(termName) {
  const name = (termName || '').toLowerCase();
  const currentTerm = name.includes('2nd semester') ? '2nd Semester' : '1st Semester';
  const yearMatch = (termName || '').match(/(\d{4})/);
  const currentYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
  return { currentTerm, currentYear };
}

function getImmediateUpcomingTerm(currentTerm, currentYear) {
  if (currentTerm === '1st Semester') {
    return { term: '2nd Semester', year: currentYear };
  }

  return { term: '1st Semester', year: currentYear + 1 };
}

async function generateDraftStudyPlanForUser(userId) {
  // Cleanup old drafts before generating a fresh projection
  await StudyPlan.destroy({ where: { UserId: userId, status: 'draft' } });

  const activeTerm = await AcademicTerm.findOne({ where: { is_active: true } });
  if (!activeTerm) {
    const error = new Error('No active academic term is set. Please ask an admin to configure one.');
    error.statusCode = 400;
    throw error;
  }

  const student = await User.findByPk(userId);
  if (!student || !student.CurriculumId) {
    const error = new Error('You have not been assigned a curriculum yet. Please contact your adviser.');
    error.statusCode = 400;
    throw error;
  }

  const verifiedGrades = await Grade.findAll({
    where: { UserId: userId, status: 'verified' }
  });

  const passedGrades = verifiedGrades.filter(g => {
    const gv = parseFloat(g.grade_value);
    return gv > 0 && gv <= 3.0;
  });

  const subjects = await Subject.findAll({
    where: { CurriculumId: student.CurriculumId },
    include: [{ model: Prerequisite, as: 'prerequisites' }]
  });

  const projectedSubjects = [];
  const simulatedPassed = [];

  for (const grade of passedGrades) {
    projectedSubjects.push({
      SubjectId: grade.SubjectId,
      projected_term: grade.term_taken || 'Previous Terms',
      is_historical: true
    });
    simulatedPassed.push(grade.SubjectId);
  }

  const { currentTerm: initialTerm, currentYear: initialYear } = parseAcademicTerm(activeTerm.term_name);
  const immediateUpcoming = getImmediateUpcomingTerm(initialTerm, initialYear);

  // Seasonality override data: offerings configured for the current active academic term
  const offeringsForActiveTerm = await CourseOffering.findAll({
    where: { target_term: activeTerm.term_name },
    attributes: ['SubjectId']
  });
  const offeredSubjectIds = new Set(
    offeringsForActiveTerm
      .map(offering => offering.SubjectId)
      .filter(subjectId => Number.isInteger(subjectId))
  );

  let currentTerm = initialTerm;
  let currentYear = initialYear;
  let projectedYearLevel = student.current_year_level || 1;

  const passedSet = new Set(simulatedPassed);
  let remaining = subjects.filter(s => !passedSet.has(s.id));

  let iterations = 0;
  while (remaining.length > 0) {
    iterations++;
    if (iterations > 20) break;

    const simulatedSet = new Set(simulatedPassed);
    const isImmediateUpcomingSemester = (
      currentTerm === immediateUpcoming.term && currentYear === immediateUpcoming.year
    );

    const eligible = remaining.filter(s => {
      const prereqs = s.prerequisites || [];
      const prereqsMet = prereqs.every(p => simulatedSet.has(p.required_subj_id));
      if (!prereqsMet) return false;

      const st = (s.seasonal_term || '').toLowerCase();
      const ct = currentTerm.toLowerCase();
      const seasonalMatch = st === ct || st === 'both' || st === 'both semesters';
      if (seasonalMatch) return true;

      return isImmediateUpcomingSemester && offeredSubjectIds.has(s.id);
    });

    eligible.sort((a, b) => a.year_level - b.year_level);

    const MAX_UNITS = 21;
    const termSubjects = [];
    let termUnits = 0;

    for (const subj of eligible) {
      if (termUnits + subj.units > MAX_UNITS) continue;
      termSubjects.push(subj);
      termUnits += subj.units;
    }

    const termLabel = `Year ${projectedYearLevel} - ${currentTerm} (${currentYear}-${currentYear + 1})`;

    for (const subj of termSubjects) {
      projectedSubjects.push({
        SubjectId: subj.id,
        projected_term: termLabel,
        is_historical: false
      });
      simulatedPassed.push(subj.id);
    }

    const placedIds = new Set(termSubjects.map(s => s.id));
    remaining = remaining.filter(s => !placedIds.has(s.id));

    if (currentTerm === '1st Semester') {
      currentTerm = '2nd Semester';
    } else {
      currentTerm = '1st Semester';
      currentYear += 1;
      projectedYearLevel++;
    }
  }

  const studyPlan = await StudyPlan.create({
    UserId: userId,
    status: 'draft'
  });

  if (projectedSubjects.length > 0) {
    const planSubjectRows = projectedSubjects.map(ps => ({
      StudyPlanId: studyPlan.id,
      SubjectId: ps.SubjectId,
      target_term: ps.projected_term,
      projected_term: ps.projected_term,
      is_historical: ps.is_historical
    }));
    await PlanSubject.bulkCreate(planSubjectRows);
  }

  const fullPlan = await StudyPlan.findByPk(studyPlan.id, {
    include: [{
      model: PlanSubject,
      include: [{ model: Subject }]
    }]
  });

  const totalUnits = projectedSubjects.reduce((sum, ps) => {
    const subj = subjects.find(s => s.id === ps.SubjectId);
    return sum + (subj ? subj.units : 0);
  }, 0);

  return {
    plan: fullPlan,
    summary: {
      term: activeTerm.term_name,
      totalSubjects: projectedSubjects.length,
      totalUnits
    }
  };
}

exports.generateDraftStudyPlanForUser = generateDraftStudyPlanForUser;

// ──────────────── Generate Study Plan ────────────────

exports.generateStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const draftResult = await generateDraftStudyPlanForUser(userId);

    res.status(201).json({
      success: true,
      data: {
        plan: draftResult.plan,
        summary: draftResult.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Get My Latest Plan ────────────────

exports.getMyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const plan = await StudyPlan.findOne({
      where: { UserId: userId },
      order: [['id', 'DESC']],
      include: [{
        model: PlanSubject,
        include: [{ model: Subject }]
      }]
    });

    if (!plan) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Contingency "Plan B" Engine ────────────────

exports.generateContingencyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch all at-risk grades for this student, including the Subject details
    const atRiskGrades = await Grade.findAll({
      where: { UserId: userId, risk_status: 'at_risk' },
      include: [{ model: Subject, attributes: ['id', 'course_code', 'title', 'units'] }]
    });

    const retakeSubjects = atRiskGrades.map(g => ({
      grade_id: g.id,
      subject_id: g.Subject?.id,
      course_code: g.Subject?.course_code,
      title: g.Subject?.title,
      units: g.Subject?.units,
      prelim_grade: g.prelim_grade,
      midterm_grade: g.midterm_grade
    }));

    const warning = retakeSubjects.length > 0
      ? 'Warning: Failing these subjects will require you to retake them next semester and will delay dependent courses.'
      : 'No at-risk subjects found. You are on track!';

    res.json({
      success: true,
      data: {
        retake_subjects: retakeSubjects,
        warning
      }
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Get Pending Study Plans (Adviser) ────────────────

exports.getPendingPlans = async (req, res, next) => {
  try {
    const studentInclude = {
      model: User,
      as: 'Student',
      attributes: ['id', 'firstName', 'lastName', 'studentId', 'adviserId']
    };
    if (req.user.role === 'adviser') {
      studentInclude.where = { adviserId: req.user.id };
      studentInclude.required = true;
    }

    const plans = await StudyPlan.findAll({
      where: { status: 'draft' },
      include: [
        studentInclude,
        {
          model: PlanSubject,
          include: [{ model: Subject }]
        }
      ],
      order: [['id', 'DESC']]
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Approve Study Plan (Adviser) ────────────────

exports.approvePlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const plan = await StudyPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Study plan not found' });
    }

    if (plan.status === 'approved') {
      return res.status(400).json({ success: false, message: 'This plan is already approved' });
    }

    await StudyPlan.update({ status: 'approved' }, { where: { id } });

    const updated = await StudyPlan.findByPk(id, {
      include: [
        { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'studentId', 'adviserId'] },
        {
          model: PlanSubject,
          include: [{ model: Subject }]
        }
      ]
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ──────────────── Modify Study Plan (Adviser) ────────────────

exports.modifyPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subjects } = req.body;

    if (!Array.isArray(subjects)) {
      return res.status(400).json({ success: false, message: 'subjects must be an array of { SubjectId, target_term }.' });
    }

    const plan = await StudyPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Study plan not found.' });
    }

    if (plan.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot modify an already-approved plan.' });
    }

    // Remove all existing non-historical PlanSubjects and rebuild
    await PlanSubject.destroy({ where: { StudyPlanId: id, is_historical: false } });

    if (subjects.length > 0) {
      const rows = subjects.map(item => ({
        StudyPlanId: parseInt(id, 10),
        SubjectId: item.SubjectId,
        target_term: item.target_term || 'TBD',
        projected_term: item.target_term || 'TBD',
        is_historical: false
      }));
      await PlanSubject.bulkCreate(rows);
    }

    // Re-fetch full plan
    const updated = await StudyPlan.findByPk(id, {
      include: [
        { model: User, as: 'Student', attributes: ['id', 'firstName', 'lastName', 'studentId', 'adviserId'] },
        {
          model: PlanSubject,
          include: [{ model: Subject }]
        }
      ]
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
