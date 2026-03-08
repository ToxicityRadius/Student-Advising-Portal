const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generateStudyPlan,
  getMyPlan,
  generateContingencyPlan,
  getPendingPlans,
  approvePlan,
  modifyPlan,
  addSubjectToPlan,
  removeSubjectFromPlan
} = require('../controllers/advisingController');

// All routes require authentication
router.use(protect);

// Generate a new study plan for the logged-in student
router.post('/generate', generateStudyPlan);

// Alias endpoints used by study-plan builder UI
router.get('/plan', getMyPlan);
router.post('/plan', generateStudyPlan);

// Get the latest study plan for the logged-in student
router.get('/my-plan', getMyPlan);

// Get contingency "Plan B" for at-risk subjects
router.get('/contingency', generateContingencyPlan);

// Adviser/Admin: get all draft study plans
router.get('/pending', authorize('adviser', 'admin'), getPendingPlans);

// Adviser/Admin: approve a study plan
router.put('/plan/:id/approve', authorize('adviser', 'admin'), approvePlan);

// Adviser/Admin: modify a draft study plan
router.put('/plan/:id/modify', authorize('adviser', 'admin'), modifyPlan);

// Adviser/Admin: inline subject operations inside adviser 360 modal
router.post('/plan/:planId/add-subject', authorize('admin', 'adviser'), addSubjectToPlan);
router.delete('/plan/:planId/remove-subject/:subjectId', authorize('admin', 'adviser'), removeSubjectFromPlan);

module.exports = router;
