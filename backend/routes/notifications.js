'use strict';

const express = require('express');
const { getDb }        = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { success }      = require('../utils/response');

const router = express.Router();
router.use(authenticate);

// Ensure table exists on first use
function ensureTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      message    TEXT     NOT NULL,
      type       TEXT     NOT NULL DEFAULT 'info',  -- info | success | warning | order
      is_read    INTEGER  NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
  `);
}

// ── GET /api/notifications ──────────────────────────────────
router.get('/', (req, res) => {
  ensureTable();
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ? OR user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 30
  `).all(req.user.id);

  const unread = rows.filter(r => !r.is_read).length;
  return success(res, { notifications: rows, unread });
});

// ── POST /api/notifications/read-all ───────────────────────
router.post('/read-all', (req, res) => {
  ensureTable();
  getDb().prepare(`
    UPDATE notifications SET is_read = 1
    WHERE user_id = ? OR user_id IS NULL
  `).run(req.user.id);
  return success(res, null, 'All marked as read');
});

// Internal helper used by other routes to push notifications
function pushNotification(message, type = 'info', userId = null) {
  try {
    ensureTable();
    getDb().prepare(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)'
    ).run(userId, message, type);
  } catch (_) {}
}

module.exports = router;
module.exports.pushNotification = pushNotification;