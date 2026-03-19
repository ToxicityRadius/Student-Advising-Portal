const { body, param } = require('express-validator');

const positiveIntParam = (paramName) =>
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`)
    .toInt();

const ALLOWED_ROLES = ['student', 'adviser', 'admin'];

// POST /api/users/onboard — complete onboarding with year level
exports.completeOnboardingValidation = [
  body('current_year_level')
    .notEmpty()
    .withMessage('current_year_level is required')
    .isInt({ min: 1, max: 4 })
    .withMessage('current_year_level must be 1, 2, 3, or 4')
    .toInt()
];

// PATCH /api/users/update-student-id — student updates their own student ID
exports.updateStudentIdValidation = [
  body('studentId')
    .notEmpty()
    .withMessage('studentId is required')
    .matches(/^\d{7}$/)
    .withMessage('Student Number must be exactly 7 digits')
];

// PATCH /api/users/:userId/update-student-id — admin or Google OAuth student ID update
exports.updateUserStudentIdValidation = [
  positiveIntParam('userId'),

  body('studentId')
    .notEmpty()
    .withMessage('studentId is required')
    .matches(/^\d{7}$/)
    .withMessage('Student Number must be exactly 7 digits')
];

// PUT /api/users/:id — admin updates a user's core fields
exports.updateUserValidation = [
  positiveIntParam('id'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('email must be a valid email address'),

  body('role')
    .optional()
    .isIn(ALLOWED_ROLES)
    .withMessage(`role must be one of: ${ALLOWED_ROLES.join(', ')}`),

  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('firstName cannot be empty'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('lastName cannot be empty'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean()
];

// PUT /api/users/:id/assign-adviser — admin assigns adviser to a student
exports.assignAdviserValidation = [
  positiveIntParam('id'),

  body('adviserId')
    .notEmpty()
    .withMessage('adviserId is required')
    .isInt({ min: 1 })
    .withMessage('adviserId must be a positive integer')
    .toInt()
];

// Generic positive-int id param guard for routes like toggle-status, delete
exports.userIdParamValidation = [positiveIntParam('id')];
