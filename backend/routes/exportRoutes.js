const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { exportSARPDF } = require('../controllers/exportController');

const router = express.Router();

router.get('/sars/:id/export/pdf', protect, requireRole('student', 'adviser', 'admin'), exportSARPDF);

module.exports = router;
