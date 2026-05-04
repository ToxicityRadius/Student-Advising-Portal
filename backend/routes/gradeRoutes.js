const express = require('express');
const multer = require('multer');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/gradeController');
const inactiveCurriculumCtrl = require('../controllers/inactiveCurriculumRegenerationController');
const { gradeEntryLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const adviserOrAdmin = [protect, requireRole('adviser', 'admin')];
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      String(file.originalname || '')
        .toLowerCase()
        .endsWith('.pdf');
    if (!isPdf) {
      return cb(new Error('Only PDF checklist files are allowed'));
    }
    return cb(null, true);
  },
});

const uploadChecklistPdf = (req, res, next) => {
  pdfUpload.single('checklist_pdf')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        code: 'PDF_FILE_TOO_LARGE',
        message: 'PDF checklist file must be 5 MB or smaller',
      });
    }
    return res.status(400).json({
      success: false,
      code: 'INVALID_PDF_UPLOAD',
      message: error.message || 'Invalid PDF checklist upload',
    });
  });
};

router.put(
  '/sars/:id/study-plan/active-version/grades',
  gradeEntryLimiter,
  adviserOrAdmin,
  ctrl.enterGrades,
);
router.post(
  '/sars/:id/study-plan/active-version/grades/bulk-import',
  gradeEntryLimiter,
  adviserOrAdmin,
  ctrl.bulkImportGrades,
);
router.post(
  '/sars/:id/study-plan/active-version/grades/pdf-preview',
  gradeEntryLimiter,
  adviserOrAdmin,
  uploadChecklistPdf,
  ctrl.previewPdfChecklistGrades,
);
router.post(
  '/sars/:id/study-plan/active-version/grades/pdf-import',
  gradeEntryLimiter,
  adviserOrAdmin,
  uploadChecklistPdf,
  ctrl.importPdfChecklistGrades,
);
router.post(
  '/sars/:id/study-plan/regenerate',
  gradeEntryLimiter,
  adviserOrAdmin,
  ctrl.triggerRegeneration,
);
router.post(
  '/sars/:id/study-plan/inactive-curriculum-regeneration-request',
  gradeEntryLimiter,
  adviserOrAdmin,
  inactiveCurriculumCtrl.requestInactiveCurriculumRegenerationApproval,
);

module.exports = router;
