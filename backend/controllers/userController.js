const User = require('../models/User');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: User.toJSON(user)
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

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    const updatedUser = await User.update(req.params.id, {
      firstName,
      lastName,
      email,
      role,
      isActive
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: User.toJSON(updatedUser)
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
    const user = await User.findById(req.params.id);

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

    await User.delete(req.params.id);

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
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = await User.update(req.params.id, {
      isActive: !user.isActive
    });

    res.status(200).json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: User.toJSON(updatedUser)
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
    const existingUser = await User.findByStudentId(studentId);
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
    const updatedUser = await User.update(req.user.id, { studentId });

    res.status(200).json({
      success: true,
      message: 'Student Number updated successfully',
      user: {
        ...User.toJSON(updatedUser),
        studentId
      }
    });
  } catch (error) {
    next(error);
  }
};
