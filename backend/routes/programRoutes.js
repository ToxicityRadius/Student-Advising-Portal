const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { PERMISSIONS, requirePermission } = require('../utils/permissions');
const ctrl = require('../controllers/programController');

const router = express.Router();

const staffOnly = [protect, requireRole('superadmin', 'admin', 'adviser')];
const managePrograms = [protect, requirePermission(PERMISSIONS.managePrograms)];
const allAuthenticated = [protect];

router.get('/options', allAuthenticated, ctrl.listActiveProgramsOptions);
router.get('/', staffOnly, ctrl.listPrograms);
router.post('/', managePrograms, ctrl.createProgram);
router.put('/users/:userId/assignments', managePrograms, ctrl.setUserProgramAssignments);
router.put('/:id', managePrograms, ctrl.updateProgram);

module.exports = router;
