const { body, param } = require('express-validator');

const positiveIntParam = (paramName) =>
  param(paramName).isInt({ min: 1 }).withMessage(`${paramName} must be a positive integer`).toInt();

const ALLOWED_ROLES = ['student', 'adviser', 'admin'];

const ALLOWED_PROGRAMS = ['BSCpE', 'BSCS', 'BSIT', 'BSCE', 'BSEE', 'BSME'];
const ALLOWED_STUDENT_TYPES = ['regular', 'irregular', 'transferee', 'ladderized'];

// POST /api/users/onboard — complete onboarding with year level and academic info
exports.completeOnboardingValidation = [
  body('current_year_level')
    .notEmpty()
    .withMessage('current_year_level is required')
    .isInt({ min: 1, max: 4 })
    .withMessage('current_year_level must be 1, 2, 3, or 4')
    .toInt(),
  body('program')
    .optional()
    .isIn(ALLOWED_PROGRAMS)
    .withMessage(`program must be one of: ${ALLOWED_PROGRAMS.join(', ')}`),
  body('curriculum_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('curriculum_id must be a positive integer')
    .toInt(),
  body('student_type')
    .optional()
    .isIn(ALLOWED_STUDENT_TYPES)
    .withMessage(`student_type must be one of: ${ALLOWED_STUDENT_TYPES.join(', ')}`),
];

// PATCH /api/users/update-student-id — student updates their own student ID
exports.updateStudentIdValidation = [
  body('studentId')
    .notEmpty()
    .withMessage('studentId is required')
    .matches(/^\d{7}$/)
    .withMessage('Student Number must be exactly 7 digits'),
];

// PATCH /api/users/:userId/update-student-id — admin or Google OAuth student ID update
exports.updateUserStudentIdValidation = [
  positiveIntParam('userId'),

  body('studentId')
    .notEmpty()
    .withMessage('studentId is required')
    .matches(/^\d{7}$/)
    .withMessage('Student Number must be exactly 7 digits'),
];

// PUT /api/users/:id — admin updates a user's core fields
exports.updateUserValidation = [
  positiveIntParam('id'),

  body('email').optional().trim().isEmail().withMessage('email must be a valid email address'),

  body('role')
    .optional()
    .isIn(ALLOWED_ROLES)
    .withMessage(`role must be one of: ${ALLOWED_ROLES.join(', ')}`),

  body('firstName').optional().trim().notEmpty().withMessage('firstName cannot be empty'),

  body('lastName').optional().trim().notEmpty().withMessage('lastName cannot be empty'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),
];

// PUT /api/users/:id/assign-adviser — admin assigns adviser to a student
exports.assignAdviserValidation = [
  positiveIntParam('id'),

  body('adviserId')
    .notEmpty()
    .withMessage('adviserId is required')
    .isInt({ min: 1 })
    .withMessage('adviserId must be a positive integer')
    .toInt(),
];

// Generic positive-int id param guard for routes like toggle-status, delete
exports.userIdParamValidation = [positiveIntParam('id')];
