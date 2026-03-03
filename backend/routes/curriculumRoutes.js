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
  setEquivalency
} = require('../controllers/curriculumController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

// Curriculum CRUD
router.post('/', createCurriculum);
router.get('/', getCurriculums);
router.put('/:id', updateCurriculum);
router.delete('/:id', deleteCurriculum);

// Subject CRUD (nested under curriculum)
router.post('/subjects', createSubject);
router.get('/:curriculumId/subjects', getSubjectsByCurriculum);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

// Prerequisites & Equivalencies
router.post('/prerequisites', addPrerequisite);
router.post('/equivalencies', setEquivalency);

module.exports = router;
