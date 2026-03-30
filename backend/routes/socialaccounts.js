'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const { getDb }        = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { validate }     = require('../middleware/validate');
const { success, error } = require('../utils/response');
const { encrypt, decrypt } = require('../utils/crypto');
const { logActivity }  = require('../utils/activitylog');

const router = express.Router();
router.use(authenticate);

const PLATFORMS = ['Facebook','Instagram','TikTok','Twitter','YouTube','Snapchat'];

const accountBody = [
  body('client_id').isInt().withMessage('Client ID is required'),
  body('platform').isIn(PLATFORMS).withMessage(`Platform must be one of: ${PLATFORMS.join(', ')}`),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').optional({ nullable: true }).trim(),
  body('recovery_email').optional({ nullable: true }).isEmail().withMessage('Invalid recovery email'),
  body('notes').optional({ nullable: true }).trim(),
];

// ── GET /api/social-accounts ────────────────────────────────
router.get('/', (req, res) => {
  const db          = getDb();
  const { client_id, platform } = req.query;

  let where  = 'WHERE 1=1';
  const params = [];

  if (client_id) { where += ' AND sa.client_id = ?'; params.push(client_id); }
  if (platform)  { where += ' AND sa.platform = ?';  params.push(platform); }

  const rows = db.prepare(`
    SELECT sa.id, sa.client_id, sa.platform, sa.username,
           sa.recovery_email, sa.notes, sa.created_at,
           c.business_name
    FROM social_accounts sa
    JOIN clients c ON c.id = sa.client_id
    ${where}
    ORDER BY sa.platform, sa.username
  `).all(...params);

  return success(res, rows);
});

// ── GET /api/social-accounts/:id ───────────────────────────
// Returns without decrypted password by default
router.get('/:id', [param('id').isInt()], validate, (req, res) => {
  const db  = getDb();
  const row = db.prepare(`
    SELECT sa.*, c.business_name
    FROM social_accounts sa
    JOIN clients c ON c.id = sa.client_id
    WHERE sa.id = ?
  `).get(req.params.id);

  if (!row) return error(res, 'Account not found', 404);

  // Strip the encrypted password from the response
  const { password_encrypted, ...account } = row;
  return success(res, account);
});

// ── GET /api/social-accounts/:id/password ──────────────────
// Decrypt and return password — admin only, logged always
router.get('/:id/password',
  authorize('admin'),
  [param('id').isInt()],
  validate,
  (req, res) => {
    const db  = getDb();
    const row = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(req.params.id);
    if (!row) return error(res, 'Account not found', 404);

    const plainPassword = decrypt(row.password_encrypted);
    logActivity(req.user.id, 'VIEW_PASSWORD', 'social_account', req.params.id, {
      platform: row.platform,
      username: row.username,
    });
    return success(res, { password: plainPassword });
  }
);

// ── POST /api/social-accounts ───────────────────────────────
router.post('/', accountBody, validate, (req, res) => {
  const { client_id, platform, username, password, recovery_email, notes } = req.body;
  const db = getDb();

  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND is_active = 1').get(client_id);
  if (!client) return error(res, 'Client not found', 404);

  const encrypted = encrypt(password);

  const result = db.prepare(`
    INSERT INTO social_accounts (client_id, platform, username, password_encrypted, recovery_email, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(client_id, platform, username, encrypted, recovery_email || null, notes || null);

  const account = db.prepare(`
    SELECT id, client_id, platform, username, recovery_email, notes, created_at
    FROM social_accounts WHERE id = ?
  `).get(result.lastInsertRowid);

  logActivity(req.user.id, 'CREATE', 'social_account', result.lastInsertRowid, { platform, username });
  return success(res, account, 'Social account added', 201);
});

// ── PUT /api/social-accounts/:id ───────────────────────────
router.put('/:id',
  [param('id').isInt(), ...accountBody],
  validate,
  (req, res) => {
    const db  = getDb();
    const row = db.prepare('SELECT id FROM social_accounts WHERE id = ?').get(req.params.id);
    if (!row) return error(res, 'Account not found', 404);

    const { client_id, platform, username, password, recovery_email, notes } = req.body;
    const encrypted = password ? encrypt(password) : db.prepare(
      'SELECT password_encrypted FROM social_accounts WHERE id = ?'
    ).get(req.params.id).password_encrypted;

    db.prepare(`
      UPDATE social_accounts
      SET client_id=?, platform=?, username=?, password_encrypted=?, recovery_email=?, notes=?
      WHERE id=?
    `).run(client_id, platform, username, encrypted, recovery_email || null, notes || null, req.params.id);

    logActivity(req.user.id, 'UPDATE', 'social_account', req.params.id, { platform, username });
    return success(res, null, 'Social account updated');
  }
);

// ── DELETE /api/social-accounts/:id ────────────────────────
router.delete('/:id', [param('id').isInt()], validate, (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT id FROM social_accounts WHERE id = ?').get(req.params.id);
  if (!row) return error(res, 'Account not found', 404);

  db.prepare('DELETE FROM social_accounts WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE', 'social_account', req.params.id);
  return success(res, null, 'Social account deleted');
});

module.exports = router;