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

    // ── 1. Get Active Term ──────────────────────────────────────────
    const activeTerm = await AcademicTerm.findOne({ where: { is_active: true } });

    if (!activeTerm) {
      return res.status(400).json({
        success: false,
        message: 'No active academic term is set. Please ask an admin to configure one.'
      });
    }

    // Parse the semester type from the term_name (e.g. "1st Semester 2025-2026")
    let currentSemester;
    const termName = activeTerm.term_name.toLowerCase();
    if (termName.includes('1st semester')) {
      currentSemester = '1st Semester';
    } else if (termName.includes('2nd semester')) {
      currentSemester = '2nd Semester';
    } else if (termName.includes('summer')) {
      currentSemester = 'Summer';
    } else {
      currentSemester = null; // couldn't determine — skip seasonality filter
    }

    // ── 2. Get Student History ──────────────────────────────────────
    const verifiedGrades = await Grade.findAll({
      where: { UserId: userId, status: 'verified' }
    });

    // A subject is "passed" when grade_value > 0 AND grade_value <= 3.0
    const passedSubjectIds = verifiedGrades
      .filter(g => {
        const gv = parseFloat(g.grade_value);
        return gv > 0 && gv <= 3.0;
      })
      .map(g => g.SubjectId);

    // ── 3. Get Curriculum Subjects ──────────────────────────────────
    // Determine which curriculum the student is assigned to
    const student = await User.findByPk(userId);
    if (!student.CurriculumId) {
      return res.status(400).json({
        success: false,
        message: 'You have not been assigned a curriculum yet. Please contact your adviser.'
      });
    }

    const subjects = await Subject.findAll({
      where: { CurriculumId: student.CurriculumId },
      include: [
        {
          model: Prerequisite,
          as: 'prerequisites'
        }
      ]
    });

    // ── 4. Filter 1 — Un-taken ──────────────────────────────────────
    const passedSet = new Set(passedSubjectIds);
    let eligible = subjects.filter(s => !passedSet.has(s.id));

    // ── 5. Filter 2 — Prerequisites met ─────────────────────────────
    eligible = eligible.filter(s => {
      const prereqs = s.prerequisites || [];
      return prereqs.every(p => passedSet.has(p.required_subj_id));
    });

    // ── 6. Filter 3 — Seasonality ──────────────────────────────────
    if (currentSemester) {
      eligible = eligible.filter(s => {
        const st = (s.seasonal_term || '').toLowerCase();
        const cs = currentSemester.toLowerCase();
        return (
          st === cs ||
          st === 'both' ||
          st === 'both semesters'
        );
      });
    }

    // ── 7. Limit Units (cap: 21) ───────────────────────────────────
    const MAX_UNITS = 21;
    const recommended = [];
    let totalUnits = 0;

    for (const subj of eligible) {
      if (totalUnits + subj.units > MAX_UNITS) continue;
      recommended.push(subj);
      totalUnits += subj.units;
    }

    // ── 8. Save Study Plan ──────────────────────────────────────────
    const studyPlan = await StudyPlan.create({
      UserId: userId,
      status: 'draft'
    });

    if (recommended.length > 0) {
      const planSubjects = recommended.map(subj => ({
        StudyPlanId: studyPlan.id,
        SubjectId: subj.id,
        target_term: activeTerm.term_name
      }));

      await PlanSubject.bulkCreate(planSubjects);
    }

    // Re-fetch plan with its subjects for the response
    const fullPlan = await StudyPlan.findByPk(studyPlan.id, {
      include: [{
        model: PlanSubject,
        include: [{ model: Subject }]
      }]
    });

    res.status(201).json({
      success: true,
      data: {
        plan: fullPlan,
        summary: {
          term: activeTerm.term_name,
          totalSubjects: recommended.length,
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
