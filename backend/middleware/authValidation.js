const { body, param } = require('express-validator');

const ALLOWED_REGISTRATION_ROLES = ['student', 'adviser', 'admin'];
const ALLOWED_LOGIN_PORTALS = ['student', 'faculty'];
const ALLOWED_SEX_VALUES = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const SIX_DIGIT_CODE_REGEX = /^\d{6}$/;
const VERIFICATION_SESSION_ID_REGEX = /^[a-f0-9]{64}$/i;
const SEVEN_DIGIT_STUDENT_ID_REGEX = /^\d{7}$/;
const PASSWORD_REQUIREMENTS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const passwordChain = (fieldName, label) => {
  return body(fieldName)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .matches(PASSWORD_REQUIREMENTS_REGEX)
    .withMessage(
      `${label} must be at least 8 characters and include at least one uppercase letter, one lowercase letter, and one number`,
    );
};

const optionalRefreshTokenChain = () => {
  return body('refreshToken')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Refresh token must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Refresh token must not be empty');
};

exports.registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  passwordChain('password', 'Password'),
  body('studentId')
    .optional({ values: 'falsy' })
    .trim()
    .matches(SEVEN_DIGIT_STUDENT_ID_REGEX)
    .withMessage('Student ID must be exactly 7 digits'),
  body('role')
    .optional({ values: 'falsy' })
    .isIn(ALLOWED_REGISTRATION_ROLES)
    .withMessage('Role must be student, adviser, or admin'),
  body('gender')
    .optional({ values: 'falsy' })
    .isIn(ALLOWED_SEX_VALUES)
    .withMessage('Gender selection is invalid'),
];

exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('password').trim().notEmpty().withMessage('Password is required'),
  body('selectedRole')
    .optional({ values: 'falsy' })
    .isIn(ALLOWED_LOGIN_PORTALS)
    .withMessage('Selected role must be student or faculty'),
];

exports.verifyCodeValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt(),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .bail()
    .matches(SIX_DIGIT_CODE_REGEX)
    .withMessage('Verification code must be a 6-digit number'),
  body('verificationSessionId')
    .optional({ values: 'falsy' })
    .trim()
    .matches(VERIFICATION_SESSION_ID_REGEX)
    .withMessage('Verification session is invalid'),
];

exports.resendCodeValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt(),
  body('verificationSessionId')
    .optional({ values: 'falsy' })
    .trim()
    .matches(VERIFICATION_SESSION_ID_REGEX)
    .withMessage('Verification session is invalid'),
];

exports.forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
];

exports.refreshTokenValidation = [
  optionalRefreshTokenChain(),
  body().custom((_, { req }) => {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    return true;
  }),
];

exports.logoutValidation = [optionalRefreshTokenChain()];

exports.resetPasswordValidation = [
  param('token').trim().notEmpty().withMessage('Reset token is required'),
  passwordChain('password', 'Password'),
];

exports.changePasswordValidation = [
  body('oldPassword')
    .optional({ values: 'undefined' })
    .trim()
    .notEmpty()
    .withMessage('Old password must not be empty'),
  passwordChain('newPassword', 'New password'),
];

exports.initiateEmailChangeValidation = [
  body('newEmail')
    .trim()
    .notEmpty()
    .withMessage('New email is required')
    .bail()
    .isEmail()
    .withMessage('New email must be valid')
    .normalizeEmail(),
];

exports.verifyEmailChangeValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .bail()
    .matches(SIX_DIGIT_CODE_REGEX)
    .withMessage('Verification code must be a 6-digit number'),
];

exports.transferOwnershipValidation = [
  body('targetUserId')
    .notEmpty()
    .withMessage('targetUserId is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('targetUserId must be a positive integer')
    .toInt(),
];
