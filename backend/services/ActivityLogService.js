const { ActivityLog } = require('../models');
const logger = require('../utils/logger');

const normalizeInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeResourceId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const logSafe = async ({
  programId = null,
  actorId = null,
  action,
  resourceType,
  resourceId = null,
  resourceLabel = null,
  targetUserId = null,
  metadata = null,
}) => {
  const payload = {
    programId: normalizeInteger(programId),
    actorId: normalizeInteger(actorId),
    action: String(action || '').trim(),
    resourceType: String(resourceType || '').trim(),
    resourceId: normalizeResourceId(resourceId),
    resourceLabel: resourceLabel ? String(resourceLabel).slice(0, 255) : null,
    targetUserId: normalizeInteger(targetUserId),
    metadata: metadata && typeof metadata === 'object' ? metadata : null,
    createdAt: Date.now(),
  };

  if (!payload.action || !payload.resourceType) {
    return;
  }

  try {
    await ActivityLog.create(payload);
  } catch (err) {
    logger.warn(
      {
        err,
        action: payload.action,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
      },
      'Activity log write failed',
    );
  }
};

module.exports = {
  logSafe,
};
