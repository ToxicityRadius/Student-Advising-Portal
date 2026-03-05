const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getDemandForecast, openSection } = require('../controllers/forecastingController');

// GET /api/forecasting/demand — admin only
router.get('/demand', protect, authorize('admin'), getDemandForecast);

// POST /api/forecasting/open — admin only
router.post('/open', protect, authorize('admin'), openSection);

module.exports = router;
