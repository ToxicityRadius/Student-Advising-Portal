const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  getAllUsers,
  getUserById,
  updateStudentId,
  updateUserStudentId,
  updateProfile
} = require('../controllers/userController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

const profileUploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({ storage });

// Public route for Google OAuth users to update student ID
router.patch('/:userId/update-student-id', updateUserStudentId);

// Route for users to update their own student ID (protected but not admin-only)
router.patch('/update-student-id', protect, updateStudentId);

// Admin-only user listing
router.get('/', protect, requireRole('admin'), getAllUsers);

// Profile update route (protected, user can update self; admin can update any)
router.put('/:id/profile', protect, upload.single('profile_picture'), updateProfile);

// Profile read route (protected, user can view self; admin can view any)
router.get('/:id', protect, getUserById);

module.exports = router;
