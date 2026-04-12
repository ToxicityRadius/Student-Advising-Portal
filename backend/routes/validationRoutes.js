const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/validationController');
const validate = require('../middleware/validate');
const { updateSARElectiveTrackValidation } = require('../middleware/sarValidation');
const { sarMutationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const adviserOrAdmin = [protect, requireRole('adviser', 'admin')];

router.patch(
  '/sars/:id/study-plan/versions/:versionId/validate',
  adviserOrAdmin,
  ctrl.validateVersion,
);
router.put(
  '/sars/:id/study-plan/versions/:versionId/courses',
  adviserOrAdmin,
  ctrl.updateDraftVersionCourses,
);
router.patch(
  '/sars/:id/elective-track',
  adviserOrAdmin,
  sarMutationLimiter,
  validate(updateSARElectiveTrackValidation),
  ctrl.selectElectiveTrack,
);

module.exports = router;
