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
const log = ({ userId = null, action, resource, resourceId = null, meta = {} }) => {
  auditLogger.info({
    userId,
    action,
    resource,
    resourceId,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

module.exports = { log };
