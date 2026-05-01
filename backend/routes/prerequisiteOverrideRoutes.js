const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { PERMISSIONS, requirePermission } = require('../utils/permissions');
const ctrl = require('../controllers/prerequisiteOverrideController');

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

module.exports = router;
