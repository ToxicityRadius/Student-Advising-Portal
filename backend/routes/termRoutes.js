const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getTerms,
  getActiveTerm,
  createTerm,
  updateTerm,
  deleteTerm,
  setActiveTerm
} = require('../controllers/termController');

// All routes require authentication
router.use(protect);

// Read — any logged-in user
router.get('/', getTerms);
router.get('/active', getActiveTerm);

// Write — admin only
router.post('/', authorize('admin'), createTerm);
router.put('/:id', authorize('admin'), updateTerm);
router.delete('/:id', authorize('admin'), deleteTerm);
router.patch('/:id/activate', authorize('admin'), setActiveTerm);

module.exports = router;
