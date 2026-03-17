const express = require('express');
const multer = require('multer');
const {
  getAllUsers,
  getUserById,
  getMyNotifications,
  updateStudentId,
  updateUserStudentId,
  updateProfile,
  getCurriculumOptions,
  updateUser,
  deleteUser,
  toggleUserStatus,
  assignAdviser,
  completeOnboarding
} = require('../controllers/userController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
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

// Admin-only: update any user's student ID by specifying userId
router.patch('/:userId/update-student-id', protect, requireRole('admin'), updateUserStudentId);

// Route for users to update their own student ID (protected but not admin-only)
router.patch('/update-student-id', protect, updateStudentId);

// Complete student onboarding (set year level)
router.post('/onboard', protect, completeOnboarding);

// Notifications for current authenticated user
router.get('/me/notifications', protect, getMyNotifications);

// Student dashboard for legacy pages (Checklist, ViewGrades, AvailableSubjects, PlanOfStudy)
const { getStudentDashboard } = require('../controllers/dashboardController');
router.get('/me/dashboard', protect, getStudentDashboard);

// Admin-only user listing
router.get('/', protect, requireRole('admin'), getAllUsers);

// Curriculum options for profile forms (all authenticated roles)
router.get('/curriculum-options', protect, getCurriculumOptions);

// Profile update route (protected, user can update self; admin can update any)
router.put('/:id/profile', protect, uploadProfilePicture, updateProfile);

// Admin-only: update a user's core fields (role, active status, etc.)
router.put('/:id', protect, requireRole('admin'), updateUser);

// Admin-only: toggle user active/inactive status
router.patch('/:id/toggle-status', protect, requireRole('admin'), toggleUserStatus);

// Admin-only: assign adviser to a student
router.put('/:id/assign-adviser', protect, requireRole('admin'), assignAdviser);

// Admin-only: delete a user
router.delete('/:id', protect, requireRole('admin'), deleteUser);

// Profile read route (protected, user can view self; admin can view any)
router.get('/:id', protect, getUserById);

module.exports = router;
