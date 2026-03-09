const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  uploadUsers,
  importUsers,
  uploadGrades,
  importGrades,
  uploadSubjects,
  importSubjects
} = require('../controllers/importController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

// Import student masterlist (CSV)
router.post('/users', uploadUsers, importUsers);

// Import historical grades (CSV)
router.post('/grades', uploadGrades, importGrades);

// Import curriculum subjects (CSV)
router.post('/subjects', uploadSubjects, importSubjects);

module.exports = router;
