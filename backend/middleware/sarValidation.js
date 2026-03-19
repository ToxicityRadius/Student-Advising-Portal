const { body, param } = require('express-validator');

const positiveIntParam = (paramName) =>
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`)
    .toInt();

// POST /api/sars — create a student academic record
exports.createSARValidation = [
  body('studentName')
    .trim()
    .notEmpty()
    .withMessage('studentName is required'),

  body('studentNumber')
    .trim()
    .notEmpty()
    .withMessage('studentNumber is required'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('email must be a valid email address')
    .matches(/@tip\.edu\.ph$/i)
    .withMessage('Student email must end in @tip.edu.ph'),

  body('yearLevel')
    .notEmpty()
    .withMessage('yearLevel is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('yearLevel must be an integer from 1 to 5')
    .toInt(),

  body('curriculumId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('curriculumId must be a positive integer')
    .toInt()
];

// PUT /api/sars/:id — update a student academic record
exports.updateSARValidation = [
  positiveIntParam('id'),

  body('studentName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('studentName cannot be empty'),

  body('studentNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('studentNumber cannot be empty'),

  body('yearLevel')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('yearLevel must be an integer from 1 to 5')
    .toInt(),

  body('curriculumId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('curriculumId must be a positive integer')
    .toInt()
];

// PATCH /api/sars/:id/elective-track — set SAR elective track
exports.updateSARElectiveTrackValidation = [
  positiveIntParam('id'),

  body('electiveTrackId')
    .notEmpty()
    .withMessage('electiveTrackId is required')
    .isInt({ min: 1 })
    .withMessage('electiveTrackId must be a positive integer')
    .toInt()
];

// POST /api/sars/:id/study-plan/generate
exports.sarIdParamValidation = [positiveIntParam('id')];
