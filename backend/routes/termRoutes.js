const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { PERMISSIONS, requirePermission } = require('../utils/permissions');
const ctrl = require('../controllers/termController');

const router = express.Router();

const adminOnly = [protect, requirePermission(PERMISSIONS.manageTerms)];
const adminOrAdviser = [protect, requireRole('admin', 'adviser')];
const anyRole = [protect, requireRole('admin', 'adviser', 'student')];

router.post('/', adminOnly, ctrl.createTerm);
router.get('/', adminOrAdviser, ctrl.getAllTerms);
router.get('/current', anyRole, ctrl.getCurrentTerm);
router.patch('/:id/activate', adminOnly, ctrl.activateTerm);
router.patch('/current/end', adminOnly, ctrl.endCurrentTerm);

module.exports = router;
