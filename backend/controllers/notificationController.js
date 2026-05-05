const NotificationService = require('../services/NotificationService');

// @desc   Get notifications for the authenticated user
// @route  GET /api/notifications
// @access Private
exports.getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    const unreadOnly = req.query.unreadOnly === 'true';
    const type = ['info', 'success', 'error', 'warning'].includes(req.query.type)
      ? req.query.type
      : null;

    const result = await NotificationService.getNotifications(req.user.id, {
      page,
      pageSize,
      unreadOnly,
      type,
    });

    const notifications = result.items.map((n) => ({
      id: n.id,
      type: n.type,
      category: n.category,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      resourceType: n.resourceType,
      resourceId: n.resourceId,
      targetPath: n.targetPath || null,
      actor: n.Actor
        ? {
            id: n.Actor.id,
            firstName: n.Actor.firstName,
            lastName: n.Actor.lastName,
            role: n.Actor.role,
          }
        : null,
      createdAt: n.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: notifications,
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / result.pageSize),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get unread notification count
// @route  GET /api/notifications/unread-count
// @access Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark a single notification as read
// @route  PATCH /api/notifications/:id/read
// @access Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const updated = await NotificationService.markAsRead(notificationId, req.user.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark all notifications as read
// @route  PATCH /api/notifications/read-all
// @access Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const count = await NotificationService.markAllAsRead(req.user.id);
    return res
      .status(200)
      .json({ success: true, message: `${count} notification(s) marked as read` });
  } catch (error) {
    next(error);
  }
};
