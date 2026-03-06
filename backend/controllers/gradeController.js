const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  sequelize,
  Grade,
  ProofDocument,
  Subject,
  User,
  AcademicTerm,
  CourseOffering,
  Prerequisite,
  StudyPlan,
  PlanSubject
} = require('../models');
const { internalGeneratePlan } = require('./advisingController');

function termSortKey(rawTerm) {
  const term = String(rawTerm || '').toLowerCase();
  const yearMatch = term.match(/year\s*(\d+)/i);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : Number.MAX_SAFE_INTEGER;

  let semesterOrder = 99;
  if (term.includes('1st semester')) semesterOrder = 1;
  else if (term.includes('2nd semester')) semesterOrder = 2;
  else if (term.includes('summer')) semesterOrder = 3;

  return { year, semesterOrder, raw: term };
}

// ── Multer config ──
const uploadsDir = path.join(__dirname, '..', 'uploads', 'proofs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image and PDF files are allowed'));
};

exports.upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── POST /api/grades/manual ──
exports.submitHistoricalGrade = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    // Parse the grades array from the request body
    let grades;
    try {
      grades = JSON.parse(req.body.grades);
    } catch {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'grades must be a valid JSON array'
      });
    }

    if (!Array.isArray(grades) || grades.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'grades array is required and must not be empty'
      });
    }

    const filePath = req.file ? `uploads/proofs/${req.file.filename}` : null;
    const created = [];
    const skipped = [];

    for (const entry of grades) {
      const { subject_id, grade_value, term_taken } = entry;

      if (!subject_id || !grade_value || !term_taken) continue; // skip invalid entries

      // Verify subject exists
      const subject = await Subject.findByPk(subject_id, { transaction: t });
      if (!subject) continue;

      // ── Duplicate prevention: check if already passed or currently enrolled ──
      const existingGrade = await Grade.findOne({
        where: {
          UserId: req.user.id,
          SubjectId: Number(subject_id),
          [require('sequelize').Op.or]: [
            { status: 'pending' },
            {
              status: 'verified',
              [require('sequelize').Op.or]: [
                { grade_value: null },
                { grade_value: { [require('sequelize').Op.lte]: 3.0 } }
              ]
            }
          ]
        },
        transaction: t
      });
      if (existingGrade) {
        skipped.push(subject_id);
        continue;
      }

      // Create grade with status pending
      const grade = await Grade.create({
        UserId: req.user.id,
        SubjectId: Number(subject_id),
        grade_value: parseFloat(grade_value),
        term_taken,
        status: 'pending'
      }, { transaction: t });

      // Link the single proof document to every grade
      if (filePath) {
        await ProofDocument.create({
          GradeId: grade.id,
          file_path: filePath,
          upload_date: new Date()
        }, { transaction: t });
      }

      created.push(grade.id);
    }

    await t.commit();

    // Re-fetch all created grades with associations
    const results = await Grade.findAll({
      where: { id: created },
      include: [
        { model: Subject, attributes: ['id', 'course_code', 'title'] },
        { model: ProofDocument }
      ]
    });

    res.status(201).json({
      success: true,
      message: `${created.length} grade(s) submitted successfully` + (skipped.length > 0 ? `. ${skipped.length} subject(s) skipped — already passed or currently enrolled.` : ''),
      data: results
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// ── GET /api/grades/pending ──
exports.getPendingGrades = async (req, res, next) => {
  try {
    const grades = await Grade.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, attributes: ['id', 'studentId', 'firstName', 'lastName', 'email'] },
        { model: Subject, attributes: ['id', 'course_code', 'title', 'units'] },
        { model: ProofDocument }
      ],
      order: [['id', 'ASC']]
    });

    res.json({ success: true, data: grades });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/grades/:id/verify ──
exports.verifyGrade = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be 'verified' or 'rejected'"
      });
    }

    const grade = await Grade.findByPk(id);
    if (!grade) {
      return res.status(404).json({ success: false, message: 'Grade not found' });
    }

    await Grade.update({ status }, { where: { id } });

    // ── Lifecycle Invalidation: void approved plan on failing grade ──
    if (status === 'verified') {
      const gv = parseFloat(grade.grade_value);
      if (gv > 3.0) {
        // A failing grade breaks prerequisite chains — void the approved plan
        await StudyPlan.update(
          { status: 'voided' },
          { where: { UserId: grade.UserId, status: 'approved' } }
        );
      }
    }

    const updated = await Grade.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'studentId', 'firstName', 'lastName'] },
        { model: Subject, attributes: ['id', 'course_code', 'title'] }
      ]
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/grades/current/:id ──
exports.updateCurrentGrade = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prelim_grade, midterm_grade, final_grade } = req.body;

    if (prelim_grade === undefined && midterm_grade === undefined && final_grade === undefined) {
      return res.status(400).json({ success: false, message: 'At least one of prelim_grade, midterm_grade, or final_grade is required' });
    }

    const grade = await Grade.findByPk(id);
    if (!grade) {
      return res.status(404).json({ success: false, message: 'Grade not found' });
    }

    // Ensure the grade belongs to the logged-in student
    const ownerId = grade.StudentId ?? grade.UserId;
    if (ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this grade' });
    }

    // Build the update payload
    const updateData = {};
    if (prelim_grade !== undefined && prelim_grade !== null && prelim_grade !== '') {
      updateData.prelim_grade = parseFloat(prelim_grade);
    }
    if (midterm_grade !== undefined && midterm_grade !== null && midterm_grade !== '') {
      updateData.midterm_grade = parseFloat(midterm_grade);
    }
    if (final_grade !== undefined) {
      updateData.final_grade = final_grade === null || String(final_grade).trim() === ''
        ? null
        : String(final_grade).trim().toUpperCase();
    }

    // ── Prediction Engine: compute risk_status ──
    // Use incoming values if provided, otherwise fall back to existing DB values
    const effectivePrelim = updateData.prelim_grade !== undefined
      ? updateData.prelim_grade
      : (grade.prelim_grade !== null ? parseFloat(grade.prelim_grade) : null);

    const effectiveMidterm = updateData.midterm_grade !== undefined
      ? updateData.midterm_grade
      : (grade.midterm_grade !== null ? parseFloat(grade.midterm_grade) : null);

    // A grade > 3.0 is considered failing
    if ((effectivePrelim !== null && effectivePrelim > 3.0) ||
        (effectiveMidterm !== null && effectiveMidterm > 3.0)) {
      updateData.risk_status = 'at_risk';
    } else if (effectivePrelim !== null && effectiveMidterm !== null &&
               effectivePrelim <= 3.0 && effectiveMidterm <= 3.0) {
      updateData.risk_status = 'on_track';
    }
    // Otherwise leave risk_status as its current value (e.g. 'pending')

    if (req.body.final_grade !== undefined && req.body.final_grade !== null && req.body.final_grade !== '') {
      const finalStr = String(req.body.final_grade).trim().toLowerCase();
      const failGrades = ['5', '5.0', '5.00', 'f', 'inc', 'drp', 'failed'];
      const passGrades = ['1.00', '1.25', '1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00', 'p', 'passed', '1', '2', '3'];

      if (failGrades.includes(finalStr) || parseFloat(finalStr) >= 5.0) {
        grade.status = 'failed';
      } else if (passGrades.includes(finalStr) || (parseFloat(finalStr) >= 1.0 && parseFloat(finalStr) <= 3.0)) {
        grade.status = 'passed';
      }
    }

    // Apply updates to the instance and save (avoids Grade.update which skips hooks/returns)
    Object.assign(grade, updateData);
    await grade.save();

    // ── Auto-void & re-draft on failure ──
    if (grade.status === 'failed') {
      try {
        const studentId = grade.StudentId ?? grade.UserId;
        const planOwnerKey = StudyPlan.rawAttributes?.StudentId ? 'StudentId' : 'UserId';

        const approvedPlan = await StudyPlan.findOne({
          where: { [planOwnerKey]: studentId, status: 'approved' }
        });

        if (approvedPlan) {
          approvedPlan.status = 'voided_due_to_failure';
          await approvedPlan.save();
          // CRITICAL: generation must target the owning student id
          await internalGeneratePlan(studentId);
        }
      } catch (error) {
        console.error('Auto-voiding generation failed:', error);
      }
    }

    const updated = await Grade.findByPk(id, {
      include: [{ model: Subject, attributes: ['id', 'course_code', 'title'] }]
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/grades/my ── (student's own grades)
exports.getMyGrades = async (req, res, next) => {
  try {
    const grades = await Grade.findAll({
      where: { UserId: req.user.id },
      include: [
        { model: Subject, attributes: ['id', 'course_code', 'title', 'units'] },
        { model: ProofDocument }
      ],
      order: [['id', 'DESC']]
    });

    res.json({ success: true, data: grades });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/grades/enroll/eligible ── (subjects student can enroll now)
exports.getEligibleSubjectsToEnroll = async (req, res, next) => {
  try {
    const approvedPlan = await StudyPlan.findOne({
      where: { UserId: req.user.id, status: 'approved' },
      include: [{
        model: PlanSubject,
        include: [{ model: Subject, attributes: ['id', 'course_code', 'title', 'units', 'year_level'] }]
      }],
      order: [['id', 'DESC']]
    });

    if (!approvedPlan) {
      return res.json({ success: true, data: [] });
    }

    // No historical-grade prerequisite: first-year students with zero records are valid.
    const grades = await Grade.findAll({ where: { UserId: req.user.id } });

    const activeTerm = await AcademicTerm.findOne({ where: { is_active: true } });
    let openSubjectIds = [];
    if (activeTerm) {
      const openOfferings = await CourseOffering.findAll({ where: { target_term: activeTerm.term_name } });
      openSubjectIds = openOfferings.map(o => o.SubjectId);
    }
    const prereqs = await Prerequisite.findAll();

    const passedSubjectIds = grades
      .filter(g => String(g.status || '').toLowerCase() === 'passed')
      .map(g => g.SubjectId);

    const enrolledOrPassedSubjectIds = grades
      .filter(g => {
        const status = String(g.status || '').toLowerCase();
        return ['passed', 'in_progress'].includes(status);
      })
      .map(g => g.SubjectId);

    const passedSet = new Set(passedSubjectIds);
    const enrolledOrPassedSet = new Set(enrolledOrPassedSubjectIds);
    const openedSet = new Set(openSubjectIds);

    let unenrolledPlanSubjects = (approvedPlan.PlanSubjects || [])
      .filter(ps => !ps.is_historical)
      .filter(ps => !enrolledOrPassedSet.has(ps.SubjectId));

    unenrolledPlanSubjects.sort((a, b) => (a.target_term || '').localeCompare(b.target_term || ''));

    if (unenrolledPlanSubjects.length > 0) {
      const firstAvailableTerm = unenrolledPlanSubjects[0].target_term;

      unenrolledPlanSubjects = unenrolledPlanSubjects.filter(ps => {
        // Rule 1: Always show subjects scheduled for their immediate next regular term
        if (ps.target_term === firstAvailableTerm) return true;

        // Rule 2: If subject is manually opened (CourseOffering), check prerequisites
        if (openedSet.has(ps.SubjectId)) {
          const subjectPrereqs = prereqs.filter(pr => (
            pr.SubjectId === ps.SubjectId || pr.subject_id === ps.SubjectId
          ));
          const hasPassedAllPrereqs = subjectPrereqs.every(pr => {
            const prereqId = pr.PrerequisiteId || pr.required_subj_id;
            return passedSet.has(prereqId);
          });
          return hasPassedAllPrereqs; // Bypass lock if prereqs are met!
        }

        return false;
      });
    }

    const subjects = unenrolledPlanSubjects
      .filter(ps => !!ps.Subject)
      .map(ps => ({
        ...ps.Subject.get({ plain: true }),
        target_term: ps.target_term,
        projected_term: ps.projected_term
      }));

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/grades/enroll ── (enroll in current-semester subjects)
exports.enrollCurrentSubjects = async (req, res, next) => {
  try {
    // 1. Get active academic term
    const activeTerm = await AcademicTerm.findOne({ where: { is_active: true } });
    if (!activeTerm) {
      return res.status(400).json({
        success: false,
        message: 'No active academic term is set. Please ask an admin to configure one.'
      });
    }

    // 2. Validate incoming subject IDs
    const { subjectIds } = req.body;
    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'subjectIds array is required and must not be empty'
      });
    }

    const enrollmentStatus = req.body?.status === 'in_progress' ? 'in_progress' : 'pending';

    const created = [];
    const skipped = [];
    for (const sid of subjectIds) {
      // Verify subject exists
      const subject = await Subject.findByPk(sid);
      if (!subject) continue;

      // ── Duplicate prevention: check if already passed or currently enrolled ──
      const { Op } = require('sequelize');
      const existingGrade = await Grade.findOne({
        where: {
          UserId: req.user.id,
          SubjectId: Number(sid),
          [Op.or]: [
            { status: 'pending' },
            { status: 'in_progress' },
            {
              status: 'verified',
              [Op.or]: [
                { grade_value: null },
                { grade_value: { [Op.lte]: 3.0 } }
              ]
            }
          ]
        }
      });
      if (existingGrade) {
        skipped.push(sid);
        continue;
      }

      // Avoid duplicate enrollment for the same subject+term
      const existing = await Grade.findOne({
        where: { UserId: req.user.id, SubjectId: sid, term_taken: activeTerm.term_name }
      });
      if (existing) continue;

      const grade = await Grade.create({
        UserId: req.user.id,
        SubjectId: Number(sid),
        grade_value: null,
        term_taken: activeTerm.term_name,
        status: enrollmentStatus
      });
      created.push(grade.id);
    }

    // Re-fetch created records with Subject info
    const results = await Grade.findAll({
      where: { id: created },
      include: [
        { model: Subject, attributes: ['id', 'course_code', 'title', 'units'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: `${created.length} subject(s) enrolled for ${activeTerm.term_name}` + (skipped.length > 0 ? `. ${skipped.length} subject(s) skipped — already passed or currently enrolled.` : ''),
      data: results
    });
  } catch (error) {
    next(error);
  }
};
