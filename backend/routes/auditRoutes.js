const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

const router = express.Router();

router.get('/', protect, requireRole('admin'), ctrl.getAuditLogs);
router.get('/actions', protect, requireRole('admin'), ctrl.getAuditActions);

module.exports = router;
