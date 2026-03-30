'use strict';

const { getDb } = require('../database/connection');
const logger    = require('./logger');

/**
 * Writes a row to the activity_log table.
 * Non-blocking — errors are logged but not re-thrown.
 *
 * @param {number} userId
 * @param {string} action      - 'CREATE' | 'UPDATE' | 'DELETE'
 * @param {string} entityType  - table name, e.g. 'client'
 * @param {number} entityId
 * @param {object} [details]   - optional JSON payload (before/after values)
 */
function logActivity(userId, action, entityType, entityId, details = null) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId    || null,
      action,
      entityType,
      entityId  || null,
      details ? JSON.stringify(details) : null
    );
  } catch (err) {
    logger.error('Failed to write activity log:', err);
  }
}

module.exports = { logActivity };