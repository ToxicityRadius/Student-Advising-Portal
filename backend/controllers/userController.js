const { Op } = require('sequelize');
const { User, AcademicTerm, Curriculum } = require('../models');
const { generateToken } = require('../utils/jwt');
const { linkStudentAccountToSar, syncProfileToSar } = require('../utils/sarLinking');
const { parsePaginationParams, buildPaginatedPayload } = require('../utils/pagination');
const { imageSize } = require('image-size');
const { uploadProfilePicture, deleteProfilePictureAsset } = require('../utils/profileStorage');
const { validateUploadedImageFile } = require('../utils/imageValidation');
const { sanitizeUserWithProfile, computeProfileCompletionScore } = require('../utils/sanitize');
const UserService = require('../services/UserService');

// Allowed enum values for validated fields
const ALLOWED_SEX = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const ALLOWED_STUDENT_TYPES = ['regular', 'irregular', 'transferee', 'ladderized'];
const MAX_PROFILE_IMAGE_WIDTH = 2000;
const MAX_PROFILE_IMAGE_HEIGHT = 2000;

const NO_ACTIVE_TERM_KEY = UserService.NO_ACTIVE_TERM_KEY;

const getTermKey = UserService.getTermKey;

const getStudentProfileLockMeta = UserService.getStudentProfileLockMeta;

const REQUIRED_PROFILE_FIELDS_COMMON = [
  'first_name',
  'last_name',
  'contact_number',
  'sex',
  'citizenship',
  'address',
  'emergency_contact_name',
  'emergency_contact_number',
  'profile_picture',
];

const REQUIRED_PROFILE_FIELDS_STUDENT = [
  'program',
  'curriculum_id',
  'student_type',
  'current_year_level',
];

// Alias for backward-compat inside this controller — delegates to shared utility
const sanitizeUser = sanitizeUserWithProfile;

// @desc    Complete student onboarding (set year level, program, curriculum, student type)
// @route   POST /api/users/onboard
// @access  Private
exports.completeOnboarding = async (req, res, next) => {
  try {
    const { current_year_level, program, curriculum_id, student_type } = req.body;

    if (!current_year_level || ![1, 2, 3, 4].includes(Number(current_year_level))) {
      return res.status(400).json({
        success: false,
        message: 'current_year_level must be 1, 2, 3, or 4',
      });
    }

    const updatePayload = {
      current_year_level: Number(current_year_level),
      is_onboarded: true,
      updatedAt: Date.now(),
    };

    if (program !== undefined) updatePayload.program = program;
    if (curriculum_id !== undefined) updatePayload.curriculum_id = Number(curriculum_id);
    if (student_type !== undefined) updatePayload.student_type = student_type;

    await User.update(updatePayload, { where: { id: req.user.id } });

    const updatedUser = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user's settings preferences
// @route   PATCH /api/users/settings
// @access  Private
exports.updateSettings = async (req, res, next) => {
  try {
    const { notifInapp, notifEmail, notifReminders, compactMode } = req.body;
    const updatePayload = { updatedAt: Date.now() };

    if (notifInapp !== undefined) {
      if (typeof notifInapp !== 'boolean') {
        return res.status(400).json({ success: false, message: 'notifInapp must be a boolean' });
      }
      updatePayload.notifInapp = notifInapp;
    }
    if (notifEmail !== undefined) {
      if (typeof notifEmail !== 'boolean') {
        return res.status(400).json({ success: false, message: 'notifEmail must be a boolean' });
      }
      updatePayload.notifEmail = notifEmail;
    }
    if (notifReminders !== undefined) {
      if (typeof notifReminders !== 'boolean') {
        return res
          .status(400)
          .json({ success: false, message: 'notifReminders must be a boolean' });
      }
      updatePayload.notifReminders = notifReminders;
    }
    if (compactMode !== undefined) {
      if (typeof compactMode !== 'boolean') {
        return res.status(400).json({ success: false, message: 'compactMode must be a boolean' });
      }
      updatePayload.compactMode = compactMode;
    }

    await User.update(updatePayload, { where: { id: req.user.id } });
    const updatedUser = await User.findByPk(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        notifInapp: updatedUser.notifInapp,
        notifEmail: updatedUser.notifEmail,
        notifReminders: updatedUser.notifReminders,
        compactMode: updatedUser.compactMode,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const paginationParams = parsePaginationParams(req.query, {
      defaultSortBy: 'createdAt',
      allowedSortBy: ['createdAt', 'firstName', 'lastName', 'email', 'role'],
    });
    const roleFilter = String(req.query.role || '').trim();
    const { items, count, page, pageSize } = await UserService.listUsers({
      paginationParams,
      roleFilter,
    });
    const payload = buildPaginatedPayload({ items, page, pageSize, totalItems: count });
    res.status(200).json({ success: true, count: items.length, users: items, ...payload });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (self or admin)
exports.getUserById = async (req, res, next) => {
  try {
    const requestingOwnProfile = req.user && req.user.id.toString() === req.params.id.toString();
    if (!requestingOwnProfile && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this profile',
      });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const sanitizedUser = sanitizeUser(user);
    const lockMeta = await getStudentProfileLockMeta(user);

    res.status(200).json({
      success: true,
      user: {
        ...sanitizedUser,
        ...lockMeta,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get curriculum options for profile forms
// @route   GET /api/users/curriculum-options
// @access  Private
exports.getCurriculumOptions = async (req, res, next) => {
  try {
    const items = await UserService.getCurriculumOptions();
    res.set('Cache-Control', 'private, max-age=120');
    return res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, isActive } = req.body;

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user
    await User.update(
      {
        firstName,
        lastName,
        email,
        role,
        isActive,
        updatedAt: Date.now(),
      },
      { where: { id: req.params.id } },
    );

    const updatedUser = await User.findByPk(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent admin from deleting themselves
    if (user.id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    await User.destroy({ where: { id: req.params.id } });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await User.update(
      {
        isActive: !user.isActive,
        updatedAt: Date.now(),
      },
      { where: { id: req.params.id } },
    );

    const updatedUser = await User.findByPk(req.params.id);

    res.status(200).json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user's student ID
// @route   PATCH /api/users/update-student-id
// @access  Private
exports.updateStudentId = async (req, res, next) => {
  try {
    const { studentId } = req.body;

    // Validate studentId format (7 digits)
    if (!studentId || !/^\d{7}$/.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student Number must be exactly 7 digits',
      });
    }

    // Check if studentId already exists
    const existingUser = await User.findOne({ where: { studentId } });
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'This Student Number is already registered to another account',
      });
    }

    // Only students can update their student ID
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only student accounts can have a Student Number',
      });
    }

    // Update user's studentId
    await User.update({ studentId, updatedAt: Date.now() }, { where: { id: req.user.id } });
    const updatedUser = await User.findByPk(req.user.id);

    await linkStudentAccountToSar({
      userId: updatedUser.id,
      email: updatedUser.email,
      studentId: updatedUser.studentId,
    });

    // Profile → SAR sync: mirror studentId change to linked SAR studentNumber
    try {
      await syncProfileToSar({
        userId: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name || updatedUser.firstName,
        lastName: updatedUser.last_name || updatedUser.lastName,
        studentId: updatedUser.studentId,
      });
    } catch (syncError) {
      console.error('[sarSync] updateStudentId sync error:', syncError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Student Number updated successfully',
      user: {
        ...sanitizeUser(updatedUser),
        studentId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user's student ID during Google OAuth registration
// @route   PATCH /api/users/:userId/update-student-id
// @access  Public (for Google OAuth users)
exports.updateUserStudentId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { studentId } = req.body;

    // Validate studentId format (7 digits)
    if (!studentId || !/^\d{7}$/.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student Number must be exactly 7 digits',
      });
    }

    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if studentId already exists (but different user)
    const existingUser = await User.findOne({ where: { studentId } });
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({
        success: false,
        message: 'This Student Number is already registered to another account',
      });
    }

    // Update user's studentId
    await User.update({ studentId, updatedAt: Date.now() }, { where: { id: userId } });
    const finalUser = await User.findByPk(userId);

    await linkStudentAccountToSar({
      userId: finalUser.id,
      email: finalUser.email,
      studentId: finalUser.studentId,
    });

    // Profile → SAR sync: mirror studentId change to linked SAR studentNumber
    try {
      await syncProfileToSar({
        userId: finalUser.id,
        email: finalUser.email,
        firstName: finalUser.first_name || finalUser.firstName,
        lastName: finalUser.last_name || finalUser.lastName,
        studentId: finalUser.studentId,
      });
    } catch (syncError) {
      console.error('[sarSync] updateUserStudentId sync error:', syncError.message);
    }

    // Generate token
    const token = generateToken(finalUser);

    res.status(200).json({
      success: true,
      message: 'Student Number updated successfully',
      token,
      user: {
        id: finalUser.id,
        firstName: finalUser.firstName,
        lastName: finalUser.lastName,
        email: finalUser.email,
        role: finalUser.role,
        studentId: finalUser.studentId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile fields and profile picture
// @route   PUT /api/users/:id/profile
// @access  Private (self or admin)
exports.updateProfile = async (req, res, next) => {
  let uploadedProfilePictureUrl = null;

  try {
    const { id } = req.params;

    const requestingOwnProfile = req.user && req.user.id.toString() === id.toString();
    if (!requestingOwnProfile && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this profile',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let currentTermKey = null;
    const isStudentSelfEdit = requestingOwnProfile && user.role === 'student';
    if (isStudentSelfEdit) {
      const currentTerm = await AcademicTerm.findOne({
        where: { isCurrent: true },
        attributes: ['schoolYear', 'semester'],
      });

      currentTermKey = getTermKey(currentTerm);
    }

    const allowedFields = [
      // Identity
      'first_name',
      'middle_name',
      'last_name',
      'suffix',
      'preferred_name',
      // Academic identity (student-relevant)
      'program',
      'curriculum_id',
      'student_type',
      // Contact
      'contact_number',
      'alternate_email',
      // Demographics
      'sex',
      'citizenship',
      // Location
      'address',
      // Emergency contact
      'emergency_contact_name',
      'emergency_contact_relationship',
      'emergency_contact_number',
      // User-adjustable during onboarding
      'year_level',
    ];

    const updatePayload = {};
    const validationErrors = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updatePayload[field] = req.body[field];
      }
    }

    // adviserId may only be changed by an admin; ignore it from non-admin requests
    if (req.user.role === 'admin' && Object.prototype.hasOwnProperty.call(req.body, 'adviserId')) {
      updatePayload.adviserId = req.body.adviserId;
    }

    // Accept 'gender' as alias for 'sex' for frontend compatibility
    if (
      !Object.prototype.hasOwnProperty.call(req.body, 'sex') &&
      Object.prototype.hasOwnProperty.call(req.body, 'gender')
    ) {
      updatePayload.sex = req.body.gender;
    }

    // Validate: sex enum
    if (
      Object.prototype.hasOwnProperty.call(updatePayload, 'sex') &&
      updatePayload.sex !== '' &&
      updatePayload.sex !== null
    ) {
      if (!ALLOWED_SEX.includes(updatePayload.sex)) {
        validationErrors.sex = `sex must be one of: ${ALLOWED_SEX.join(', ')}`;
      }
    }

    // Validate: student_type enum
    if (
      Object.prototype.hasOwnProperty.call(updatePayload, 'student_type') &&
      updatePayload.student_type !== '' &&
      updatePayload.student_type !== null
    ) {
      if (!ALLOWED_STUDENT_TYPES.includes(updatePayload.student_type)) {
        validationErrors.student_type = `student_type must be one of: ${ALLOWED_STUDENT_TYPES.join(', ')}`;
      }
    }

    // Validate: alternate_email format
    if (
      Object.prototype.hasOwnProperty.call(updatePayload, 'alternate_email') &&
      updatePayload.alternate_email !== '' &&
      updatePayload.alternate_email !== null
    ) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updatePayload.alternate_email)) {
        validationErrors.alternate_email = 'alternate_email must be a valid email address';
      }
    }

    // Validate: curriculum_id must be a positive integer if provided
    if (
      Object.prototype.hasOwnProperty.call(updatePayload, 'curriculum_id') &&
      updatePayload.curriculum_id !== '' &&
      updatePayload.curriculum_id !== null
    ) {
      const cid = Number(updatePayload.curriculum_id);
      if (Number.isNaN(cid) || !Number.isInteger(cid) || cid < 1) {
        validationErrors.curriculum_id = 'curriculum_id must be a valid positive integer';
      } else {
        updatePayload.curriculum_id = cid;
      }
    } else if (
      Object.prototype.hasOwnProperty.call(updatePayload, 'curriculum_id') &&
      (updatePayload.curriculum_id === '' || updatePayload.curriculum_id === null)
    ) {
      updatePayload.curriculum_id = null;
    }

    // Return all field-level validation errors at once (form-friendly)
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }
    if (Object.prototype.hasOwnProperty.call(updatePayload, 'adviserId')) {
      updatePayload.adviserId =
        updatePayload.adviserId === '' ? null : Number(updatePayload.adviserId);
      if (updatePayload.adviserId !== null && Number.isNaN(updatePayload.adviserId)) {
        validationErrors.adviserId = 'adviserId must be a valid number or empty';
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'year_level')) {
      const normalized =
        updatePayload.year_level === '' || updatePayload.year_level === null
          ? null
          : Number(updatePayload.year_level);

      if (normalized !== null && (Number.isNaN(normalized) || normalized < 1 || normalized > 5)) {
        validationErrors.year_level = 'year_level must be a number from 1 to 5';
      } else {
        updatePayload.current_year_level = normalized;
        delete updatePayload.year_level;

        if (user.role === 'student' && normalized !== null) {
          updatePayload.is_onboarded = true;
        }
      }
    }

    // Final check after all field-level validations (adviserId / year_level may have added errors)
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    const removeProfilePicture =
      String(req.body.remove_profile_picture || '').toLowerCase() === 'true';
    const existingProfilePicturePath = user.profile_picture;

    if (req.file) {
      const imageValidationError = validateUploadedImageFile(req.file);
      if (imageValidationError) {
        return res.status(400).json({
          success: false,
          message: imageValidationError,
          errors: {
            profile_picture: imageValidationError,
          },
        });
      }

      let dimensions;
      try {
        dimensions = imageSize(req.file.buffer);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Profile image dimensions are invalid. Max dimensions are 2000x2000.',
          errors: {
            profile_picture: 'Profile image dimensions are invalid. Max dimensions are 2000x2000.',
          },
        });
      }

      const width = Number(dimensions?.width || 0);
      const height = Number(dimensions?.height || 0);

      if (
        !width ||
        !height ||
        width > MAX_PROFILE_IMAGE_WIDTH ||
        height > MAX_PROFILE_IMAGE_HEIGHT
      ) {
        return res.status(400).json({
          success: false,
          message: 'Profile image dimensions are invalid. Max dimensions are 2000x2000.',
          errors: {
            profile_picture: 'Profile image dimensions are invalid. Max dimensions are 2000x2000.',
          },
        });
      }

      uploadedProfilePictureUrl = await uploadProfilePicture(req.file, id);
      updatePayload.profile_picture = uploadedProfilePictureUrl;
    } else if (removeProfilePicture) {
      updatePayload.profile_picture = null;
    }

    const nonPictureFieldKeys = Object.keys(updatePayload).filter(
      (field) => field !== 'profile_picture',
    );
    const hasNonPictureUpdates = nonPictureFieldKeys.length > 0;

    if (
      isStudentSelfEdit &&
      user.profile_last_submitted_term_key &&
      user.profile_last_submitted_term_key === currentTermKey &&
      hasNonPictureUpdates
    ) {
      if (uploadedProfilePictureUrl) {
        await deleteProfilePictureAsset(uploadedProfilePictureUrl);
      }
      return res.status(403).json({
        success: false,
        message:
          'Profile details are already submitted for the current term. Only profile picture can be updated until next term.',
      });
    }

    const now = Date.now();
    updatePayload.updatedAt = now;
    updatePayload.profile_updated_at = now;

    if (isStudentSelfEdit && hasNonPictureUpdates) {
      updatePayload.profile_last_submitted_term_key = currentTermKey || NO_ACTIVE_TERM_KEY;
      updatePayload.profile_submission_locked_at = now;
    }

    // Keep camelCase columns in sync with snake_case columns
    if (Object.prototype.hasOwnProperty.call(updatePayload, 'first_name')) {
      updatePayload.firstName = updatePayload.first_name;
    }
    if (Object.prototype.hasOwnProperty.call(updatePayload, 'last_name')) {
      updatePayload.lastName = updatePayload.last_name;
    }

    Object.assign(user, updatePayload);
    await user.save();

    if (
      Object.prototype.hasOwnProperty.call(updatePayload, 'profile_picture') &&
      existingProfilePicturePath &&
      existingProfilePicturePath !== updatePayload.profile_picture
    ) {
      await deleteProfilePictureAsset(existingProfilePicturePath);
    }

    const token = generateToken(user);

    // Profile → SAR sync: if name fields changed, mirror to linked SAR
    const nameChanged =
      Object.prototype.hasOwnProperty.call(updatePayload, 'first_name') ||
      Object.prototype.hasOwnProperty.call(updatePayload, 'last_name');
    if (nameChanged && user.role === 'student') {
      try {
        await syncProfileToSar({
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          studentId: user.studentId,
        });
      } catch (syncError) {
        console.error('[sarSync] updateProfile sync error:', syncError.message);
      }
    }

    const lockMeta = await getStudentProfileLockMeta(user);

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        ...sanitizeUser(user),
        ...lockMeta,
      },
      token,
    });
  } catch (error) {
    if (uploadedProfilePictureUrl) {
      await deleteProfilePictureAsset(uploadedProfilePictureUrl);
    }
    next(error);
  }
};

// @desc    Assign adviser to a student
// @route   PUT /api/users/:id/assign-adviser
// @access  Private/Admin
exports.assignAdviser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adviserId } = req.body;

    const student = await User.findByPk(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res
        .status(400)
        .json({ success: false, message: 'Adviser can only be assigned to student users' });
    }

    let normalizedAdviserId = null;
    if (adviserId !== null && adviserId !== undefined && adviserId !== '') {
      normalizedAdviserId = Number(adviserId);
      if (Number.isNaN(normalizedAdviserId)) {
        return res
          .status(400)
          .json({ success: false, message: 'adviserId must be a valid number' });
      }

      const adviser = await User.findByPk(normalizedAdviserId);
      if (!adviser || adviser.role !== 'adviser') {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Selected adviser does not exist or is not an adviser',
          });
      }
    }

    await User.update({ adviserId: normalizedAdviserId, updatedAt: Date.now() }, { where: { id } });
    const updated = await User.findByPk(id);

    res.status(200).json({
      success: true,
      message: 'Adviser assigned successfully',
      user: sanitizeUser(updated),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's notification feed
// @route   GET /api/users/me/notifications
// @access  Private
exports.getMyNotifications = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Profile-completion hints (ephemeral — not persisted)
    const hints = [];

    if (!user.profile_picture) {
      hints.push({
        id: 'profile-picture-missing',
        type: 'info',
        category: 'profile_incomplete',
        title: 'Add a profile photo',
        body: 'Upload a profile photo to complete your account identity.',
        isRead: false,
        createdAt: null,
      });
    }

    if (!user.contact_number) {
      hints.push({
        id: 'contact-missing',
        type: 'info',
        category: 'profile_incomplete',
        title: 'Contact number missing',
        body: 'Add your contact number in Profile so advisers can reach you.',
        isRead: false,
        createdAt: null,
      });
    }

    if (user.role === 'student' && !user.program) {
      hints.push({
        id: 'program-missing',
        type: 'error',
        category: 'profile_incomplete',
        title: 'Program not set',
        body: 'Set your program in Profile to unlock complete advising features.',
        isRead: false,
        createdAt: null,
      });
    }

    if (user.role === 'student' && !user.current_year_level && !user.year_level) {
      hints.push({
        id: 'year-level-missing',
        type: 'info',
        category: 'profile_incomplete',
        title: 'Year level missing',
        body: 'Set your year level in Profile for more accurate dashboard tracking.',
        isRead: false,
        createdAt: null,
      });
    }

    // Persisted notifications (newest first)
    const NotificationService = require('../services/NotificationService');
    const { items } = await NotificationService.getNotifications(req.user.id, {
      page: 1,
      pageSize: 20,
      unreadOnly: false,
    });

    const persisted = items.map((n) => ({
      id: n.id,
      type: n.type,
      category: n.category,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      actor: n.Actor
        ? {
            id: n.Actor.id,
            firstName: n.Actor.firstName,
            lastName: n.Actor.lastName,
            role: n.Actor.role,
          }
        : null,
      resourceType: n.resourceType,
      resourceId: n.resourceId,
      createdAt: n.createdAt,
    }));

    // Hints first, then persisted (newest first)
    const notifications = [...hints, ...persisted];

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};
