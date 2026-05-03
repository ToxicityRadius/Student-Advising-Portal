const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { PERMISSIONS, requirePermission } = require('../utils/permissions');
const ctrl = require('../controllers/prerequisiteOverrideController');
const inactiveCurriculumCtrl = require('../controllers/inactiveCurriculumRegenerationController');

const router = express.Router();

router.get(
  '/prerequisite-overrides',
  protect,
  requireRole('admin', 'adviser'),
  ctrl.listPrerequisiteOverrides,
);

router.patch(
  '/prerequisite-overrides/:id/decision',
  protect,
  requirePermission(PERMISSIONS.manageOverrides),
  ctrl.decidePrerequisiteOverride,
);

router.get(
  '/inactive-curriculum-regeneration-requests',
  protect,
  requireRole('admin', 'adviser', 'superadmin'),
  inactiveCurriculumCtrl.listInactiveCurriculumRegenerationRequests,
);

router.patch(
  '/inactive-curriculum-regeneration-requests/:id/decision',
  protect,
  requirePermission(PERMISSIONS.manageOverrides),
  inactiveCurriculumCtrl.decideInactiveCurriculumRegenerationRequest,
);

module.exports = router;
