const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Grade = require('../models/Grade');
const ProofDocument = require('../models/ProofDocument');
const Subject = require('../models/Subject');
const User = require('../models/User');

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
  try {
    const { SubjectId, grade_value, term_taken } = req.body;

    if (!SubjectId || !grade_value || !term_taken) {
      return res.status(400).json({
        success: false,
        message: 'SubjectId, grade_value, and term_taken are required'
      });
    }

    // Verify subject exists
    const subject = await Subject.findByPk(SubjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Create grade with status pending
    const grade = await Grade.create({
      UserId: req.user.id,
      SubjectId: Number(SubjectId),
      grade_value: parseFloat(grade_value),
      term_taken,
      status: 'pending'
    });

    // Create proof document if file was uploaded
    if (req.file) {
      await ProofDocument.create({
        GradeId: grade.id,
        file_path: `uploads/proofs/${req.file.filename}`,
        upload_date: new Date()
      });
    }

    // Re-fetch with associations
    const result = await Grade.findByPk(grade.id, {
      include: [
        { model: Subject, attributes: ['id', 'course_code', 'title'] },
        { model: ProofDocument }
      ]
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
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
    const { grade_value } = req.body;

    if (grade_value === undefined || grade_value === null) {
      return res.status(400).json({ success: false, message: 'grade_value is required' });
    }

    const grade = await Grade.findByPk(id);
    if (!grade) {
      return res.status(404).json({ success: false, message: 'Grade not found' });
    }

    // Ensure the grade belongs to the logged-in student
    if (grade.UserId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this grade' });
    }

    await Grade.update({ grade_value: parseFloat(grade_value) }, { where: { id } });
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
