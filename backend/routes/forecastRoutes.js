const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/forecastController');

const router = express.Router();
const adminOrAdviser = [protect, requireRole('admin', 'adviser')];

router.get('/current', adminOrAdviser, ctrl.getCurrentDemand);
router.get('/next', adminOrAdviser, ctrl.getNextSemesterForecast);
router.get('/comparison', adminOrAdviser, ctrl.getComparisonReport);
router.get('/history', adminOrAdviser, ctrl.getForecastHistory);

module.exports = router;