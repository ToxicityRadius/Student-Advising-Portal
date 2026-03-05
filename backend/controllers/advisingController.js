const {
  AcademicTerm,
  Grade,
  Subject,
  Prerequisite,
  Curriculum,
  StudyPlan,
  PlanSubject,
  User
} = require('../models');

// ──────────────── Generate Study Plan ────────────────

exports.generateStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // ── 1. Cleanup — destroy any existing drafts ────────────────────
    await StudyPlan.destroy({ where: { UserId: userId, status: 'draft' } });

    // ── 2. Setup — active term, passed grades, curriculum subjects ──
    const activeTerm = await AcademicTerm.findOne({ where: { is_active: true } });
    if (!activeTerm) {
      return res.status(400).json({
        success: false,
        message: 'No active academic term is set. Please ask an admin to configure one.'
      });
    }

    const student = await User.findByPk(userId);
    if (!student.CurriculumId) {
      return res.status(400).json({
        success: false,
        message: 'You have not been assigned a curriculum yet. Please contact your adviser.'
      });
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

    // ── 3. Map Historical Data ──────────────────────────────────────
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

    // ── 4. The Future Pathfinding Loop ──────────────────────────────
    // Parse current semester from active term name
    let currentTerm;
    const termNameLower = activeTerm.term_name.toLowerCase();
    if (termNameLower.includes('1st semester')) {
      currentTerm = '1st Semester';
    } else if (termNameLower.includes('2nd semester')) {
      currentTerm = '2nd Semester';
    } else {
      currentTerm = '1st Semester';
    }

    // Extract starting academic year from term_name (e.g. "1st Semester 2025-2026" → 2025)
    const yearMatch = activeTerm.term_name.match(/(\d{4})/);
    let currentYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    // Dynamic year-level tracking based on the student's onboarding data
    let projectedYearLevel = student.current_year_level || 1;

    // Build remaining subjects list (those not yet passed)
    const passedSet = new Set(simulatedPassed);
    let remaining = subjects.filter(s => !passedSet.has(s.id));

    let iterations = 0;
    while (remaining.length > 0) {
      iterations++;
      if (iterations > 20) break; // safety breakout

      const simulatedSet = new Set(simulatedPassed);

      // Find subjects whose prerequisites are ALL met and seasonal_term matches
      const eligible = remaining.filter(s => {
        const prereqs = s.prerequisites || [];
        const prereqsMet = prereqs.every(p => simulatedSet.has(p.required_subj_id));
        if (!prereqsMet) return false;

        const st = (s.seasonal_term || '').toLowerCase();
        const ct = currentTerm.toLowerCase();
        return st === ct || st === 'both' || st === 'both semesters';
      });

      // Priority sort: lower year_level subjects first (retakes/missed before advanced)
      eligible.sort((a, b) => a.year_level - b.year_level);

      // Take up to 21 units from eligible subjects
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

      // Remove placed subjects from remaining
      const placedIds = new Set(termSubjects.map(s => s.id));
      remaining = remaining.filter(s => !placedIds.has(s.id));

      // Increment term
      if (currentTerm === '1st Semester') {
        currentTerm = '2nd Semester';
      } else {
        currentTerm = '1st Semester';
        currentYear += 1;
        projectedYearLevel++;
      }
    }

    // ── 5. Save ─────────────────────────────────────────────────────
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

    // Re-fetch plan with subjects for the response
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

    res.status(201).json({
      success: true,
      data: {
        plan: fullPlan,
        summary: {
          term: activeTerm.term_name,
          totalSubjects: projectedSubjects.length,
          totalUnits
        }
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
    const plans = await StudyPlan.findAll({
      where: { status: 'draft' },
      include: [
        { model: User, attributes: ['id', 'firstName', 'lastName', 'studentId'] },
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
        { model: User, attributes: ['id', 'firstName', 'lastName', 'studentId'] },
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
        { model: User, attributes: ['id', 'firstName', 'lastName', 'studentId'] },
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
