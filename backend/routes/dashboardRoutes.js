const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { getDashboardSummary } = require('../controllers/dashboardController');

const router = express.Router();

router.get(
  '/summary',
  protect,
  requireRole('superadmin', 'admin', 'adviser', 'student'),
  getDashboardSummary,
);

module.exports = router;
