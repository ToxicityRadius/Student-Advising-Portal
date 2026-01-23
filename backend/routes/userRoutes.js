const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updateStudentId,
  updateUserStudentId
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route for Google OAuth users to update student ID
router.patch('/:userId/update-student-id', updateUserStudentId);

// Route for users to update their own student ID (protected but not admin-only)
router.patch('/update-student-id', protect, updateStudentId);

// All other routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle-status', toggleUserStatus);

module.exports = router;
