const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/sarController');

const router = express.Router();

const adviserOrAdmin = [protect, requireRole('adviser', 'admin')];
const anyRole = [protect, requireRole('adviser', 'admin', 'student')];

router.post('/', adviserOrAdmin, ctrl.createSAR);
router.get('/', anyRole, ctrl.getSARs);
router.post('/:id/study-plan/generate', adviserOrAdmin, ctrl.generateInitialStudyPlan);
router.get('/:id/study-plan/versions', anyRole, ctrl.getStudyPlanVersions);
router.get('/:id', anyRole, ctrl.getSARById);
router.put('/:id', adviserOrAdmin, ctrl.updateSAR);

module.exports = router;