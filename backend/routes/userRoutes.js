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
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const profileUploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => {
    const extensionByMimeType = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp'
    };
    const ext = extensionByMimeType[file.mimetype] || path.extname(file.originalname) || '.img';
    cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_PROFILE_IMAGE_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WEBP image files are allowed'));
    }
    cb(null, true);
  }
});

const uploadProfilePicture = (req, res, next) => {
  upload.single('profile_picture')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Profile image must not exceed 5 MB',
        errors: {
          profile_picture: 'Profile image must not exceed 5 MB'
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid profile image upload',
      errors: {
        profile_picture: error.message || 'Invalid profile image upload'
      }
    });
  });
};

// Public route for Google OAuth users to update student ID
router.patch('/:userId/update-student-id', updateUserStudentId);

// Route for users to update their own student ID (protected but not admin-only)
router.patch('/update-student-id', protect, updateStudentId);

// Admin-only user listing
router.get('/', protect, requireRole('admin'), getAllUsers);

// Profile update route (protected, user can update self; admin can update any)
router.put('/:id/profile', protect, uploadProfilePicture, updateProfile);

// Profile read route (protected, user can view self; admin can view any)
router.get('/:id', protect, getUserById);

module.exports = router;
