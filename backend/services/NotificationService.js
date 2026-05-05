const { Notification, User } = require('../models');
const logger = require('../utils/logger');

const FALLBACK_TARGET_BY_CATEGORY = {
  study_plan_validated: '/plan-of-study',
  study_plan_regenerated: '/plan-of-study',
  grades_entered: '/grades',
  sar_created: '/plan-of-study',
  sar_updated: '/plan-of-study',
  elective_track_selected: '/plan-of-study',
  prerequisite_override_requested: '/admin/prerequisite-overrides?status=pending',
  inactive_curriculum_regeneration_requested:
    '/admin/prerequisite-overrides?queue=inactive&status=pending',
  prerequisite_override_approved: '/notifications',
  prerequisite_override_rejected: '/notifications',
  inactive_curriculum_regeneration_approved: '/notifications',
  inactive_curriculum_regeneration_rejected: '/notifications',
};

function normalizeTargetPath(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 512 || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  return trimmed;
}

function buildNotificationTargetPath({
  category,
  resourceType,
  resourceId,
  meta = {},
  targetPath,
}) {
  const explicitTarget = normalizeTargetPath(targetPath) || normalizeTargetPath(meta.targetPath);
  if (explicitTarget) {
    return explicitTarget;
  }

  const sarId = meta.sarId || meta.studentAcademicRecordId;
  const versionId =
    meta.versionId ||
    meta.studyPlanVersionId ||
    (resourceType === 'study_plan_version' ? resourceId : null);

  if (category === 'grades_entered' && meta.staffView === true && sarId) {
    return `/adviser/students/${encodeURIComponent(String(sarId))}/grades`;
  }

  if (
    ['study_plan_validated', 'study_plan_regenerated'].includes(category) &&
    meta.staffView === true &&
    sarId &&
    versionId
  ) {
    return `/adviser/students/${encodeURIComponent(String(sarId))}/plan/${encodeURIComponent(String(versionId))}/review`;
  }

  if (
    [
      'prerequisite_override_approved',
      'prerequisite_override_rejected',
      'inactive_curriculum_regeneration_approved',
      'inactive_curriculum_regeneration_rejected',
    ].includes(category) &&
    sarId &&
    versionId
  ) {
    return `/adviser/students/${encodeURIComponent(String(sarId))}/plan/${encodeURIComponent(String(versionId))}/review`;
  }

  if (category === 'inactive_curriculum_regeneration_requested') {
    return FALLBACK_TARGET_BY_CATEGORY.inactive_curriculum_regeneration_requested;
  }

  if (category === 'prerequisite_override_requested') {
    return FALLBACK_TARGET_BY_CATEGORY.prerequisite_override_requested;
  }

  if (resourceType === 'sar' && resourceId && meta.staffView === true) {
    return `/adviser/students/${encodeURIComponent(String(resourceId))}`;
  }

  return FALLBACK_TARGET_BY_CATEGORY[category] || '/notifications';
}

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
  prerequisite_override_requested: {
    type: 'warning',
    title: 'Prerequisite override request',
    body: (meta) =>
      `${meta.adviserName || 'An adviser'} requested concurrent enrollment approval for ${meta.overridePairSummary || `${meta.prerequisiteCode || 'a prerequisite'} and ${meta.dependentCode || 'a dependent course'}`}.`,
  },
  prerequisite_override_approved: {
    type: 'success',
    title: 'Prerequisite override approved',
    body: (meta) =>
      `Concurrent enrollment was approved for ${meta.prerequisiteCode || 'the prerequisite'} and ${meta.dependentCode || 'the dependent course'}.`,
  },
  prerequisite_override_rejected: {
    type: 'warning',
    title: 'Prerequisite override rejected',
    body: (meta) =>
      `Concurrent enrollment was rejected for ${meta.prerequisiteCode || 'the prerequisite'} and ${meta.dependentCode || 'the dependent course'}.`,
  },
  inactive_curriculum_regeneration_requested: {
    type: 'warning',
    title: 'Inactive curriculum regeneration request',
    body: (meta) =>
      `${meta.adviserName || 'An adviser'} requested approval to regenerate ${meta.studentName || 'a student'} from inactive ${meta.curriculumName || 'curriculum'}.`,
  },
  inactive_curriculum_regeneration_approved: {
    type: 'success',
    title: 'Inactive curriculum regeneration approved',
    body: (meta) =>
      `Regeneration was approved for ${meta.studentName || 'the student'} using ${meta.curriculumName || 'the inactive curriculum'}.`,
  },
  inactive_curriculum_regeneration_rejected: {
    type: 'warning',
    title: 'Inactive curriculum regeneration rejected',
    body: (meta) =>
      `Regeneration was rejected for ${meta.studentName || 'the student'} using ${meta.curriculumName || 'the inactive curriculum'}.`,
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
  targetPath,
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
      targetPath: buildNotificationTargetPath({
        category,
        resourceType,
        resourceId,
        meta,
        targetPath,
      }),
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
  buildNotificationTargetPath,
};
