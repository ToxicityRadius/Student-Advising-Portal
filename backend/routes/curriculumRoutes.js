const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createCurriculum,
  getCurriculums,
  updateCurriculum,
  deleteCurriculum,
  createSubject,
  getSubjectsByCurriculum,
  updateSubject,
  deleteSubject,
  addPrerequisite,
  setEquivalency,
  deletePrerequisite,
  deleteEquivalency
} = require('../controllers/curriculumController');

// All routes require authentication
router.use(protect);

// Curriculum — read (any logged-in user), write (admin only)
router.get('/', getCurriculums);
router.post('/', authorize('admin'), createCurriculum);
router.put('/:id', authorize('admin'), updateCurriculum);
router.delete('/:id', authorize('admin'), deleteCurriculum);

// Subjects — read (any logged-in user), write (admin only)
router.get('/:curriculumId/subjects', getSubjectsByCurriculum);
router.post('/subjects', authorize('admin'), createSubject);
router.put('/subjects/:id', authorize('admin'), updateSubject);
router.delete('/subjects/:id', authorize('admin'), deleteSubject);

// Prerequisites & Equivalencies (admin only)
router.post('/prerequisites', authorize('admin'), addPrerequisite);
router.delete('/prerequisites/:id', authorize('admin'), deletePrerequisite);
router.post('/equivalencies', authorize('admin'), setEquivalency);
router.delete('/equivalencies/:id', authorize('admin'), deleteEquivalency);

module.exports = router;
