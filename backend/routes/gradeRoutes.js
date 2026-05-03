const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/gradeController');
const inactiveCurriculumCtrl = require('../controllers/inactiveCurriculumRegenerationController');
const { gradeEntryLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const adviserOrAdmin = [protect, requireRole('adviser', 'admin')];

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
