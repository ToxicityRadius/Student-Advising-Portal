const logger = require('./logger');

/**
 * Structured audit logger for security-relevant events.
 * Every call emits a pino log entry at `info` level with a
 * consistent `audit: true` marker so log aggregators can filter
 * audit events independently from general application logs.
 *
 * Usage:
 *   audit.log({ userId: req.user.id, action: 'LOGIN', resource: 'auth' });
 */

const auditLogger = logger.child({ audit: true });

/**
 * Emit a structured audit event.
 *
 * @param {object} event
 * @param {string|number|null} event.userId   - Authenticated user performing the action; null for unauthenticated events
 * @param {string}             event.action   - Verb describing the action (e.g. 'LOGIN', 'SAR_UPDATE', 'GRADE_ENTRY')
 * @param {string}             event.resource - Resource type (e.g. 'auth', 'sar', 'grade', 'user')
 * @param {string|number|null} [event.resourceId] - Primary key of the affected resource when applicable
 * @param {object}             [event.meta]   - Additional non-sensitive context (IP, method, path, etc.)
 */
const log = ({ userId = null, action, resource, resourceId = null, meta = {}, ip = null }) => {
  auditLogger.info({
    userId,
    action,
    resource,
    resourceId,
    timestamp: new Date().toISOString(),
    ...meta,
  });

  // Persist to database asynchronously (fire-and-forget so audit writes never block the request)
  if (process.env.DATABASE_URL) {
    try {
      const AuditLog = require('../models/AuditLog');
      AuditLog.create({
        userId: userId || null,
        action,
        resource,
        resourceId: resourceId != null ? String(resourceId) : null,
        metadata: meta,
        ipAddress: ip || meta.ip || null,
      }).catch((err) => {
        auditLogger.error({ err: err.message }, 'Failed to persist audit log to database');
      });
    } catch (_) {
      // Model not yet loaded — silently skip DB write
    }
  }
};

module.exports = { log };
