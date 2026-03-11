const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { linkStudentAccountToSar } = require('../utils/sarLinking');

// Helper: strip sensitive fields from a user plain object
function sanitizeUser(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : { ...user };
  delete plain.password;
  delete plain.activationToken;
  delete plain.activationTokenExpires;
  delete plain.resetPasswordToken;
  delete plain.resetPasswordExpires;
  delete plain.verificationCode;
  delete plain.verificationCodeExpires;
  return plain;
}

// @desc    Complete student onboarding (set year level)
// @route   POST /api/users/onboard
// @access  Private
exports.completeOnboarding = async (req, res, next) => {
  try {
    const { current_year_level } = req.body;

    if (!current_year_level || ![1, 2, 3, 4].includes(Number(current_year_level))) {
      return res.status(400).json({
        success: false,
        message: 'current_year_level must be 1, 2, 3, or 4'
      });
    }

    await User.update(
      { current_year_level: Number(current_year_level), is_onboarded: true, updatedAt: Date.now() },
      { where: { id: req.user.id } }
    );

    const updatedUser = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      user: sanitizeUser(updatedUser)
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
    const users = await User.findAll({ order: [['createdAt', 'DESC']] });

    const sanitized = users.map(u => sanitizeUser(u));

    res.status(200).json({
      success: true,
      count: sanitized.length,
      users: sanitized
    });
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
        message: 'You are not authorized to view this profile'
      });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
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
        message: 'User not found'
      });
    }

    // Update user
    await User.update({
      firstName,
      lastName,
      email,
      role,
      isActive,
      updatedAt: Date.now()
    }, { where: { id: req.params.id } });

    const updatedUser = await User.findByPk(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: sanitizeUser(updatedUser)
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
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user.id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await User.destroy({ where: { id: req.params.id } });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
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
        message: 'User not found'
      });
    }

    await User.update({
      isActive: !user.isActive,
      updatedAt: Date.now()
    }, { where: { id: req.params.id } });

    const updatedUser = await User.findByPk(req.params.id);

    res.status(200).json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: sanitizeUser(updatedUser)
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
        message: 'Student Number must be exactly 7 digits'
      });
    }

    // Check if studentId already exists
    const existingUser = await User.findOne({ where: { studentId } });
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'This Student Number is already registered to another account'
      });
    }

    // Only students can update their student ID
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only student accounts can have a Student Number'
      });
    }

    // Update user's studentId
    await User.update({ studentId, updatedAt: Date.now() }, { where: { id: req.user.id } });
    const updatedUser = await User.findByPk(req.user.id);

    await linkStudentAccountToSar({
      userId: updatedUser.id,
      email: updatedUser.email,
      studentId: updatedUser.studentId
    });

    res.status(200).json({
      success: true,
      message: 'Student Number updated successfully',
      user: {
        ...sanitizeUser(updatedUser),
        studentId
      }
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
        message: 'Student Number must be exactly 7 digits'
      });
    }

    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if studentId already exists (but different user)
    const existingUser = await User.findOne({ where: { studentId } });
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({
        success: false,
        message: 'This Student Number is already registered to another account'
      });
    }

    // Update user's studentId
    await User.update({ studentId, updatedAt: Date.now() }, { where: { id: userId } });
    const finalUser = await User.findByPk(userId);

    await linkStudentAccountToSar({
      userId: finalUser.id,
      email: finalUser.email,
      studentId: finalUser.studentId
    });

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
        studentId: finalUser.studentId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile fields and profile picture
// @route   PUT /api/users/:id/profile
// @access  Private (self or admin)
exports.updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const requestingOwnProfile = req.user && req.user.id.toString() === id.toString();
    if (!requestingOwnProfile && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this profile'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const allowedFields = [
      'first_name',
      'middle_name',
      'last_name',
      'program',
      'contact_number',
      'year_level',
      'adviserId'
    ];

    const updatePayload = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updatePayload[field] = req.body[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'adviserId')) {
      updatePayload.adviserId = updatePayload.adviserId === '' ? null : Number(updatePayload.adviserId);
      if (updatePayload.adviserId !== null && Number.isNaN(updatePayload.adviserId)) {
        return res.status(400).json({
          success: false,
          message: 'adviserId must be a valid number or empty'
        });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'year_level')) {
      const normalized = updatePayload.year_level === '' || updatePayload.year_level === null
        ? null
        : Number(updatePayload.year_level);

      if (normalized !== null && (Number.isNaN(normalized) || normalized < 1 || normalized > 5)) {
        return res.status(400).json({
          success: false,
          message: 'year_level must be a number from 1 to 5'
        });
      }

      updatePayload.current_year_level = normalized;
      delete updatePayload.year_level;

      if (user.role === 'student' && normalized !== null) {
        updatePayload.is_onboarded = true;
      }
    }

    if (req.file) {
      updatePayload.profile_picture = `/uploads/profiles/${req.file.filename}`;
    }

    updatePayload.updatedAt = Date.now();

    Object.assign(user, updatePayload);
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
      token
    });
  } catch (error) {
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
      return res.status(400).json({ success: false, message: 'Adviser can only be assigned to student users' });
    }

    let normalizedAdviserId = null;
    if (adviserId !== null && adviserId !== undefined && adviserId !== '') {
      normalizedAdviserId = Number(adviserId);
      if (Number.isNaN(normalizedAdviserId)) {
        return res.status(400).json({ success: false, message: 'adviserId must be a valid number' });
      }

      const adviser = await User.findByPk(normalizedAdviserId);
      if (!adviser || adviser.role !== 'adviser') {
        return res.status(400).json({ success: false, message: 'Selected adviser does not exist or is not an adviser' });
      }
    }

    await User.update({ adviserId: normalizedAdviserId, updatedAt: Date.now() }, { where: { id } });
    const updated = await User.findByPk(id);

    res.status(200).json({
      success: true,
      message: 'Adviser assigned successfully',
      user: sanitizeUser(updated)
    });
  } catch (error) {
    next(error);
  }
};
