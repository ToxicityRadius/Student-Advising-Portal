const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, ctrl.getNotifications);
router.get('/unread-count', protect, ctrl.getUnreadCount);
router.patch('/read-all', protect, ctrl.markAllAsRead);
router.patch('/:id/read', protect, ctrl.markAsRead);

module.exports = router;
