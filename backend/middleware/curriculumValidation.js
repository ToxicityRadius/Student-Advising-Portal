const { body, param } = require('express-validator');

const positiveIntParam = (paramName) =>
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`)
    .toInt();

const positiveIntBody = (fieldName, options = {}) => {
  const chain = body(fieldName)
    .isInt({ min: 1 })
    .withMessage(`${fieldName} must be a positive integer`)
    .toInt();
  return options.required ? chain : chain.optional();
};

// POST /api/curriculums — create a curriculum
exports.createCurriculumValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Curriculum name is required')
];

// PUT /api/curriculums/:id — update a curriculum
exports.updateCurriculumValidation = [
  positiveIntParam('id'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Curriculum name cannot be empty')
];

// POST /api/courses — create a course
exports.createCourseValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Course code is required'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Course name is required'),

  body('units')
    .notEmpty()
    .withMessage('units is required')
    .isInt({ min: 1, max: 9 })
    .withMessage('units must be an integer between 1 and 9')
    .toInt()
];

// PUT /api/courses/:id — update a course
exports.updateCourseValidation = [
  positiveIntParam('id'),

  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course code cannot be empty'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course name cannot be empty'),

  body('units')
    .optional()
    .isInt({ min: 1, max: 9 })
    .withMessage('units must be an integer between 1 and 9')
    .toInt()
];

// POST /api/curriculums/:id/courses — add course to curriculum
exports.addCourseToCurriculumValidation = [
  positiveIntParam('id'),

  positiveIntBody('courseId', { required: true })
    .withMessage('courseId must be a positive integer'),

  body('yearLevel')
    .notEmpty()
    .withMessage('yearLevel is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('yearLevel must be an integer from 1 to 5')
    .toInt(),

  body('semester')
    .notEmpty()
    .withMessage('semester is required')
    .isInt({ min: 1, max: 3 })
    .withMessage('semester must be 1, 2, or 3')
    .toInt()
];

// POST /api/curriculums/:id/prerequisites
exports.addPrerequisiteValidation = [
  positiveIntParam('id'),

  body('courseId')
    .notEmpty()
    .withMessage('courseId is required')
    .isInt({ min: 1 })
    .withMessage('courseId must be a positive integer')
    .toInt(),

  body('prerequisiteCourseId')
    .notEmpty()
    .withMessage('prerequisiteCourseId is required')
    .isInt({ min: 1 })
    .withMessage('prerequisiteCourseId must be a positive integer')
    .toInt()
];

// POST /api/curriculums/:id/corequisites
exports.addCoRequisiteValidation = [
  positiveIntParam('id'),

  body('courseId')
    .notEmpty()
    .withMessage('courseId is required')
    .isInt({ min: 1 })
    .withMessage('courseId must be a positive integer')
    .toInt(),

  body('coRequisiteCourseId')
    .notEmpty()
    .withMessage('coRequisiteCourseId is required')
    .isInt({ min: 1 })
    .withMessage('coRequisiteCourseId must be a positive integer')
    .toInt()
];

// POST /api/equivalencies
exports.addEquivalencyValidation = [
  body('courseId')
    .notEmpty()
    .withMessage('courseId is required')
    .isInt({ min: 1 })
    .withMessage('courseId must be a positive integer')
    .toInt(),

  body('equivalentCourseId')
    .notEmpty()
    .withMessage('equivalentCourseId is required')
    .isInt({ min: 1 })
    .withMessage('equivalentCourseId must be a positive integer')
    .toInt()
];

// POST /api/curriculums/:id/elective-tracks
exports.createElectiveTrackValidation = [
  positiveIntParam('id'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Track name is required')
];

// Generic id param guard  
exports.curriculumIdParamValidation = [positiveIntParam('id')];
exports.courseIdParamValidation = [positiveIntParam('id')];
exports.electiveTrackIdParamValidation = [positiveIntParam('id')];
