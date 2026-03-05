const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getDemandForecast } = require('../controllers/forecastingController');

// GET /api/forecasting/demand — admin only
router.get('/demand', protect, authorize('admin'), getDemandForecast);

module.exports = router;
