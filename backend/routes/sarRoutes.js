const express = require('express');
const multer = require('multer');
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/sarController');

const router = express.Router();
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_IMAGE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WEBP image files are allowed'));
    }
    cb(null, true);
  },
});

const uploadProfilePicture = (req, res, next) => {
  upload.single('profile_picture')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Profile image must not exceed 2 MB',
        errors: {
          profile_picture: 'Profile image must not exceed 2 MB',
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid profile image upload',
      errors: {
        profile_picture: error.message || 'Invalid profile image upload',
      },
    });
  });
};

const validate = require('../middleware/validate');
const {
  createSARValidation,
  updateSARValidation,
  sarIdParamValidation,
} = require('../middleware/sarValidation');
const { sarMutationLimiter } = require('../middleware/rateLimiter');

const adviserOrAdmin = [protect, requireRole('adviser', 'admin')];
const anyRole = [protect, requireRole('adviser', 'admin', 'student')];

router.post('/', sarMutationLimiter, adviserOrAdmin, validate(createSARValidation), ctrl.createSAR);
router.post('/bulk-create', sarMutationLimiter, adviserOrAdmin, ctrl.bulkCreateSARs);
router.get('/autofill', adviserOrAdmin, ctrl.getSarAutofillByEmail);
router.get('/', anyRole, ctrl.getSARs);
router.post(
  '/:id/study-plan/generate',
  sarMutationLimiter,
  adviserOrAdmin,
  validate(sarIdParamValidation),
  ctrl.generateInitialStudyPlan,
);
router.get(
  '/:id/study-plan/versions',
  anyRole,
  validate(sarIdParamValidation),
  ctrl.getStudyPlanVersions,
);
router.get('/:id', anyRole, validate(sarIdParamValidation), ctrl.getSARById);
router.put(
  '/:id',
  sarMutationLimiter,
  adviserOrAdmin,
  validate(updateSARValidation),
  uploadProfilePicture,
  ctrl.updateSAR,
);

module.exports = router;
