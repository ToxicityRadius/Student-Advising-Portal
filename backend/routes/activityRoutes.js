const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { listActivity } = require('../controllers/activityController');

const router = express.Router();

router.get('/', protect, requireRole('superadmin', 'admin', 'adviser'), listActivity);

module.exports = router;
