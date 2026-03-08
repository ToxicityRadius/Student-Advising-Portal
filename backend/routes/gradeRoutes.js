const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  upload,
  submitHistoricalGrade,
  getPendingGrades,
  verifyGrade,
  updateCurrentGrade,
  getMyGrades,
  getEligibleSubjectsToEnroll,
  enrollCurrentSubjects
} = require('../controllers/gradeController');

// Student routes
router.post('/manual', protect, authorize('student'), upload.single('proof'), submitHistoricalGrade);
router.get('/enroll/eligible', protect, authorize('student'), getEligibleSubjectsToEnroll);
router.post('/enroll', protect, authorize('student'), enrollCurrentSubjects);
router.get('/my', protect, authorize('student'), getMyGrades);
router.put('/current/:id', protect, authorize('student'), updateCurrentGrade);

// Adviser / Admin routes
router.get('/pending', protect, authorize('adviser', 'admin'), getPendingGrades);
router.patch('/:id/verify', protect, authorize('adviser', 'admin'), verifyGrade);

module.exports = router;
