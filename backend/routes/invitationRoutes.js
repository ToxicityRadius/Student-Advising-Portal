const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  inviteFaculty,
  getInvitations,
  getPendingInvitations,
  deleteInvitation,
  resendInvitation
} = require('../controllers/invitationController');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.post('/invite-faculty', inviteFaculty);
router.get('/invitations', getInvitations);
router.get('/invitations/pending', getPendingInvitations);
router.delete('/invitations/:id', deleteInvitation);
router.post('/invitations/:id/resend', resendInvitation);

module.exports = router;
