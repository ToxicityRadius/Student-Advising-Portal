const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getOfferingsByTerm,
  toggleOffering
} = require('../controllers/courseOfferingController');

const router = express.Router();

router.use(protect);

router.get('/:term', getOfferingsByTerm);
router.post('/toggle', authorize('admin'), toggleOffering);

module.exports = router;
