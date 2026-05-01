const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/programController');

const router = express.Router();

const staffOnly = [protect, requireRole('superadmin', 'admin', 'adviser')];
const superadminOnly = [protect, requireRole('superadmin')];

router.get('/', staffOnly, ctrl.listPrograms);
router.post('/', superadminOnly, ctrl.createProgram);
router.put('/users/:userId/assignments', superadminOnly, ctrl.setUserProgramAssignments);
router.put('/:id', superadminOnly, ctrl.updateProgram);

module.exports = router;
