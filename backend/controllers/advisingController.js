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

  const newPlan = await StudyPlan.create({
    UserId: userId,
    status: 'draft'
  });

  const chronologicalTerms = [
    'Year 1 - 1st Semester', 'Year 1 - 2nd Semester', 'Year 1 - Summer',
    'Year 2 - 1st Semester', 'Year 2 - 2nd Semester', 'Year 2 - Summer',
    'Year 3 - 1st Semester', 'Year 3 - 2nd Semester', 'Year 3 - Summer',
    'Year 4 - 1st Semester', 'Year 4 - 2nd Semester', 'Year 4 - Summer',
    'Year 5 - 1st Semester', 'Year 5 - 2nd Semester'
  ];

  let pendingSubjects = await Subject.findAll({ where: { CurriculumId: student.CurriculumId } });

  // Treat explicit passed/in_progress plus verified passing grades as completed.
  const explicitPassed = await Grade.findAll({
    where: {
      UserId: userId,
      status: ['passed', 'in_progress']
    }
  });
  const verifiedPassing = await Grade.findAll({ where: { UserId: userId, status: 'verified' } });
  const verifiedPassedIds = verifiedPassing
    .filter(g => {
      const gv = parseFloat(g.grade_value);
      return gv > 0 && gv <= 3.0;
    })
    .map(g => g.SubjectId)
    .filter(subjectId => Number.isInteger(subjectId));

  const passedIds = [...new Set([
    ...explicitPassed.map(g => g.SubjectId),
    ...verifiedPassedIds
  ])];

  const failedGrades = await Grade.findAll({ where: { UserId: userId, status: 'failed' } });
  const failedSubjectIds = failedGrades.map(g => g.SubjectId).filter(subjectId => Number.isInteger(subjectId));
  const failedSubjectSet = new Set(failedSubjectIds);

  pendingSubjects = pendingSubjects.filter(s => !passedIds.includes(s.id));

  // Prioritize failed retakes first, then typical curriculum progression.
  pendingSubjects.sort((a, b) => {
    const aFailed = failedSubjectSet.has(a.id);
    const bFailed = failedSubjectSet.has(b.id);
    if (aFailed && !bFailed) return -1;
    if (!aFailed && bFailed) return 1;
    if ((a.year_level || 0) !== (b.year_level || 0)) {
      return (a.year_level || 0) - (b.year_level || 0);
    }
    return (a.course_code || '').localeCompare(b.course_code || '');
  });

  const allPrereqs = await Prerequisite.findAll();
  const openOfferings = activeTerm
    ? await CourseOffering.findAll({ where: { target_term: activeTerm.term_name } })
    : [];
  const openSubjectIds = new Set(openOfferings.map(o => o.SubjectId).filter(subjectId => Number.isInteger(subjectId)));

  const projectedPassedIds = new Set(passedIds);
  const planSubjectsToCreate = [];

  // Keep completed subjects visible for adviser/student context.
  for (const passedId of passedIds) {
    planSubjectsToCreate.push({
      StudyPlanId: newPlan.id,
      SubjectId: passedId,
      target_term: 'Previous Terms',
      projected_term: 'Previous Terms',
      is_historical: true
    });
  }

  for (const term of chronologicalTerms) {
    if (pendingSubjects.length === 0) break;

    let termUnits = 0;
    const isFirstSem = term.includes('1st Semester');
    const isSecondSem = term.includes('2nd Semester');
    const isSummer = term.includes('Summer');

    for (let i = 0; i < pendingSubjects.length; i++) {
      const subject = pendingSubjects[i];
      const maxUnits = isSummer ? 9 : 24;
      const subjectUnits = Number(subject.units) || 0;

      if (termUnits + subjectUnits > maxUnits) continue;

      const subjectPrereqs = allPrereqs.filter(pr => pr.subject_id === subject.id);
      const prereqsMet = subjectPrereqs.every(pr => projectedPassedIds.has(pr.required_subj_id));

      const seasonal = (subject.seasonal_term || '').toLowerCase();
      const nativeFirstSem = seasonal.includes('1st semester');
      const nativeSecondSem = seasonal.includes('2nd semester');
      const nativeSummer = seasonal.includes('summer');
      const nativeBoth = seasonal === 'both' || seasonal === 'both semesters';

      let seasonalityMet = false;
      if (nativeBoth ||
          (isFirstSem && nativeFirstSem) ||
          (isSecondSem && nativeSecondSem) ||
          (isSummer && nativeSummer)) {
        seasonalityMet = true;
      }

      // Critical bypass: open offering override OR failed retake override.
      if (openSubjectIds.has(subject.id) || failedSubjectSet.has(subject.id)) {
        seasonalityMet = true;
      }

      if (prereqsMet && seasonalityMet) {
        planSubjectsToCreate.push({
          StudyPlanId: newPlan.id,
          SubjectId: subject.id,
          target_term: term,
          projected_term: term,
          is_historical: false
        });
        termUnits += subjectUnits;
        projectedPassedIds.add(subject.id); // Simulate passing to cascade unlocks.
        pendingSubjects.splice(i, 1);
        i--;
      }
    }
  }

  if (planSubjectsToCreate.length > 0) {
    await PlanSubject.bulkCreate(planSubjectsToCreate);
  }

  const fullPlan = await StudyPlan.findByPk(newPlan.id, {
    include: [{
      model: PlanSubject,
      include: [{ model: Subject }]
    }]
  });

  const subjectById = new Map((await Subject.findAll({ where: { CurriculumId: student.CurriculumId } }))
    .map(s => [s.id, s]));
  const totalUnits = planSubjectsToCreate.reduce((sum, ps) => {
    const subj = subjectById.get(ps.SubjectId);
    return sum + (subj ? (Number(subj.units) || 0) : 0);
  }, 0);

  return {
    plan: fullPlan,
    summary: {
      term: activeTerm.term_name,
      totalSubjects: planSubjectsToCreate.length,
      totalUnits
    }
  };
}

exports.generateDraftStudyPlanForUser = generateDraftStudyPlanForUser;
exports.internalGeneratePlan = generateDraftStudyPlanForUser;

// ──────────────── Generate Study Plan ────────────────

exports.generateStudyPlan = async (req, res, next) => {
  try {
    const requestedStudentId = req.body?.studentId || req.query?.studentId;
    const canTargetOtherStudent = req.user.role === 'adviser' || req.user.role === 'admin';
    const targetStudentId = canTargetOtherStudent && requestedStudentId
      ? Number(requestedStudentId)
      : req.user.id;

    if (Number.isNaN(targetStudentId)) {
      return res.status(400).json({ success: false, message: 'studentId must be a valid number' });
    }

    if (req.user.role === 'adviser' && targetStudentId !== req.user.id) {
      const advisee = await User.findOne({ where: { id: targetStudentId, adviserId: req.user.id, role: 'student' } });
      if (!advisee) {
        return res.status(403).json({ success: false, message: 'You are not authorized to generate a plan for this student' });
      }
    }

    const draftResult = await generateDraftStudyPlanForUser(targetStudentId);

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
    const requestedStudentId = req.query?.studentId;
    const canTargetOtherStudent = req.user.role === 'adviser' || req.user.role === 'admin';
    const targetStudentId = canTargetOtherStudent && requestedStudentId
      ? Number(requestedStudentId)
      : req.user.id;

    if (Number.isNaN(targetStudentId)) {
      return res.status(400).json({ success: false, message: 'studentId must be a valid number' });
    }

    if (req.user.role === 'adviser' && targetStudentId !== req.user.id) {
      const advisee = await User.findOne({ where: { id: targetStudentId, adviserId: req.user.id, role: 'student' } });
      if (!advisee) {
        return res.status(403).json({ success: false, message: 'You are not authorized to view this student plan' });
      }
    }

    const plan = await StudyPlan.findOne({
      where: { UserId: targetStudentId },
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
      attributes: ['id', 'firstName', 'lastName', 'studentId', 'adviserId', 'program', ['current_year_level', 'year_level'], 'contact_number'],
      include: [
        {
          model: Grade,
          attributes: ['id', 'SubjectId', 'grade_value', 'status', 'term_taken', 'risk_status'],
          include: [{ model: Subject, attributes: ['id', 'course_code', 'title', 'units'] }]
        }
      ]
    };
    if (req.user.role === 'adviser') {
      studentInclude.where = { adviserId: req.user.id };
      studentInclude.required = true;
    }

    const plans = await StudyPlan.findAll({
      include: [
        studentInclude,
        {
          model: PlanSubject,
          include: [{ model: Subject, attributes: ['id', 'course_code', 'title', 'units', 'year_level'] }]
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

// ──────────────── Inline Study Plan Subject Editing (Adviser/Admin) ────────────────

exports.addSubjectToPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { SubjectId, target_term } = req.body;

    if (!SubjectId || !target_term) {
      return res.status(400).json({ message: 'SubjectId and target_term are required' });
    }

    const plan = await StudyPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    if (req.user.role === 'adviser') {
      const advisee = await User.findOne({ where: { id: plan.UserId, adviserId: req.user.id, role: 'student' } });
      if (!advisee) {
        return res.status(403).json({ message: 'You are not authorized to edit this plan' });
      }
    }

    if (plan.status === 'voided_due_to_failure') {
      return res.status(403).json({ message: 'Cannot edit voided plans' });
    }

    const existing = await PlanSubject.findOne({
      where: { StudyPlanId: planId, SubjectId: Number(SubjectId) }
    });

    if (existing) {
      existing.target_term = target_term;
      existing.projected_term = target_term;
      await existing.save();
    } else {
      await PlanSubject.create({
        StudyPlanId: Number(planId),
        SubjectId: Number(SubjectId),
        target_term,
        projected_term: target_term,
        is_historical: false
      });
    }

    return res.json({ message: 'Subject added' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.removeSubjectFromPlan = async (req, res) => {
  try {
    const { planId, subjectId } = req.params;

    const plan = await StudyPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    if (req.user.role === 'adviser') {
      const advisee = await User.findOne({ where: { id: plan.UserId, adviserId: req.user.id, role: 'student' } });
      if (!advisee) {
        return res.status(403).json({ message: 'You are not authorized to edit this plan' });
      }
    }

    if (plan.status === 'voided_due_to_failure') {
      return res.status(403).json({ message: 'Cannot edit voided plans' });
    }

    await PlanSubject.destroy({
      where: {
        StudyPlanId: Number(planId),
        SubjectId: Number(subjectId)
      }
    });

    return res.json({ message: 'Removed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
