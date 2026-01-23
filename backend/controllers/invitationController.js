const Invitation = require('../models/Invitation');
const User = require('../models/User');
const crypto = require('crypto');
const { sendFacultyInvitation } = require('../utils/email');

// @desc    Invite faculty member
// @route   POST /api/admin/invite-faculty
// @access  Admin only
exports.inviteFaculty = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    // Validate input
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Validate role
    if (!['adviser', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either adviser or admin'
      });
    }

    // Check if email ends with @tip.edu.ph
    if (!email.toLowerCase().endsWith('@tip.edu.ph')) {
      return res.status(400).json({
        success: false,
        message: 'Only T.I.P. email addresses (@tip.edu.ph) are allowed.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await Invitation.findByEmail(email);
    if (existingInvitation && !existingInvitation.isUsed && existingInvitation.invitationExpires > Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'An invitation has already been sent to this email'
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpires = Date.now() + 48 * 60 * 60 * 1000; // 48 hours

    // Create invitation
    const invitation = await Invitation.create({
      email,
      role,
      invitationToken,
      invitationExpires,
      invitedBy: req.user.id
    });

    // Send invitation email
    await sendFacultyInvitation(email, invitationToken, role);

    res.status(201).json({
      success: true,
      message: `Invitation sent successfully to ${email}`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: new Date(invitationExpires)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invitations
// @route   GET /api/admin/invitations
// @access  Admin only
exports.getInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.findAll();

    res.status(200).json({
      success: true,
      count: invitations.length,
      invitations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending invitations
// @route   GET /api/admin/invitations/pending
// @access  Admin only
exports.getPendingInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.findPending();

    res.status(200).json({
      success: true,
      count: invitations.length,
      invitations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invitation
// @route   DELETE /api/admin/invitations/:id
// @access  Admin only
exports.deleteInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Invitation.delete(id);

    res.status(200).json({
      success: true,
      message: 'Invitation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend invitation
// @route   POST /api/admin/invitations/:id/resend
// @access  Admin only
exports.resendInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get the invitation to get email and role
    const invitation = await Invitation.findById(id);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    const { email, role } = invitation;

    // Delete old invitation
    await Invitation.delete(id);

    // Generate new token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpires = Date.now() + 48 * 60 * 60 * 1000;

    // Create new invitation
    const newInvitation = await Invitation.create({
      email,
      role,
      invitationToken,
      invitationExpires,
      invitedBy: req.user.id
    });

    // Resend email
    await sendFacultyInvitation(email, invitationToken, role);

    res.status(200).json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        id: newInvitation.id,
        email: newInvitation.email,
        role: newInvitation.role,
        expiresAt: new Date(invitationExpires)
      }
    });
  } catch (error) {
    next(error);
  }
};
