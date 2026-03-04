const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateStudyPlan,
  getMyPlan,
  generateContingencyPlan
} = require('../controllers/advisingController');

// All routes require authentication
router.use(protect);

// Generate a new study plan for the logged-in student
router.post('/generate', generateStudyPlan);

// Get the latest study plan for the logged-in student
router.get('/my-plan', getMyPlan);

// Get contingency "Plan B" for at-risk subjects
router.get('/contingency', generateContingencyPlan);

module.exports = router;
