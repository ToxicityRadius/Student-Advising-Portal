const { Notification, User } = require('../models');
const logger = require('../utils/logger');

const NOTIFICATION_TEMPLATES = {
  study_plan_validated: {
    type: 'success',
    title: 'Study plan approved',
    body: (meta) =>
      `Your study plan (v${meta.versionNumber || '?'}) has been validated by your adviser.`,
  },
  study_plan_regenerated: {
    type: 'info',
    title: 'New study plan draft available',
    body: (meta) =>
      `A new draft study plan (v${meta.versionNumber || '?'}) has been generated based on your latest grades.`,
  },
  grades_entered: {
    type: 'info',
    title: 'Grades updated',
    body: (meta) => `${meta.gradeCount || 0} grade(s) have been entered for your study plan.`,
  },
  sar_created: {
    type: 'success',
    title: 'Academic record created',
    body: () => 'Your student academic record has been created. You can now view your study plan.',
  },
  sar_updated: {
    type: 'info',
    title: 'Academic record updated',
    body: () => 'Your student academic record has been updated by your adviser.',
  },
  elective_track_selected: {
    type: 'info',
    title: 'Elective track selected',
    body: (meta) =>
      `Elective track "${meta.trackName || ''}" has been set for your academic record.`,
  },
};

/**
 * Create a persisted notification for a user.
 */
async function notify({
  recipientId,
  actorId,
  category,
  resourceType,
  resourceId,
  meta = {},
  title,
  body,
  type,
}) {
  const template = NOTIFICATION_TEMPLATES[category];
  const resolvedType = type || template?.type || 'info';
  const resolvedTitle = title || template?.title || 'Notification';
  const resolvedBody = body || (template?.body ? template.body(meta) : '');

  try {
    return await Notification.create({
      recipientId,
      actorId: actorId || null,
      type: resolvedType,
      category,
      title: resolvedTitle,
      body: resolvedBody,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      isRead: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    // Non-blocking: log but don't fail the parent operation
    logger.error({ err }, '[NotificationService] Failed to create notification');
    return null;
  }
}

/**
 * Fetch notifications for a user, newest first.
 */
async function getNotifications(
  userId,
  { page = 1, pageSize = 50, unreadOnly = false, type = null } = {},
) {
  const where = { recipientId: userId };
  if (unreadOnly) where.isRead = false;
  if (type) where.type = type;

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    include: [
      {
        model: User,
        as: 'Actor',
        attributes: ['id', 'firstName', 'lastName', 'role'],
        required: false,
      },
    ],
  });

  return { items: rows, totalItems: count, page, pageSize };
}

/**
 * Mark one notification as read.
 */
async function markAsRead(notificationId, userId) {
  const [count] = await Notification.update(
    { isRead: true },
    { where: { id: notificationId, recipientId: userId } },
  );
  return count > 0;
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllAsRead(userId) {
  const [count] = await Notification.update(
    { isRead: true },
    { where: { recipientId: userId, isRead: false } },
  );
  return count;
}

/**
 * Get unread count for a user.
 */
async function getUnreadCount(userId) {
  return Notification.count({ where: { recipientId: userId, isRead: false } });
}

module.exports = {
  notify,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
