'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const { getDb }                   = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { validate }                = require('../middleware/validate');
const { success, error }          = require('../utils/response');
const { encrypt, decrypt }        = require('../utils/crypto');
const { logActivity }             = require('../utils/activityLog');

const router = express.Router();
router.use(authenticate);

const PLATFORMS = ['Facebook','Instagram','TikTok','Twitter','YouTube','Snapchat'];

const accountBody = [
  body('client_id').isInt().withMessage('Client ID is required'),
  body('platform').isIn(PLATFORMS).withMessage(`Platform must be one of: ${PLATFORMS.join(', ')}`),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').optional({ nullable: true, checkFalsy: true }).trim(),
  body('recovery_email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid recovery email'),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim(),
];

function handleDbError(res, err) {
  if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) return error(res, err.message, 400);
  return error(res, 'Internal server error', 500);
}

// ── GET /api/social-accounts ────────────────────────────────
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { client_id, platform } = req.query;
    let where  = 'WHERE 1=1';
    const params = [];
    if (client_id) { where += ' AND sa.client_id = ?'; params.push(client_id); }
    if (platform)  { where += ' AND sa.platform = ?';  params.push(platform); }

    const rows = db.prepare(`
      SELECT sa.id, sa.client_id, sa.platform, sa.username,
             sa.recovery_email, sa.notes, sa.created_at, c.business_name
      FROM social_accounts sa
      JOIN clients c ON c.id = sa.client_id
      ${where}
      ORDER BY sa.platform, sa.username
    `).all(...params);

    return success(res, rows);
  } catch (err) { return handleDbError(res, err); }
});

// ── GET /api/social-accounts/:id ───────────────────────────
router.get('/:id', [param('id').isInt()], validate, (req, res) => {
  try {
    const db  = getDb();
    const row = db.prepare(`
      SELECT sa.*, c.business_name FROM social_accounts sa
      JOIN clients c ON c.id = sa.client_id WHERE sa.id = ?
    `).get(req.params.id);

    if (!row) return error(res, 'Account not found', 404);
    const { password_encrypted, ...account } = row;
    return success(res, account);
  } catch (err) { return handleDbError(res, err); }
});

// ── GET /api/social-accounts/:id/password ──────────────────
// Admin only — logged every time
router.get('/:id/password', authorize('admin'), [param('id').isInt()], validate, (req, res) => {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(req.params.id);
    if (!row) return error(res, 'Account not found', 404);

    const plainPassword = decrypt(row.password_encrypted);
    logActivity(req.user.id, 'VIEW_PASSWORD', 'social_account', req.params.id, {
      platform: row.platform,
      username: row.username,
    });
    return success(res, { password: plainPassword });
  } catch (err) { return handleDbError(res, err); }
});

// ── POST /api/social-accounts ───────────────────────────────
router.post('/', accountBody, validate, (req, res) => {
  try {
    const { client_id, platform, username, password, recovery_email, notes } = req.body;
    const db = getDb();

    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND is_active = 1').get(client_id);
    if (!client) return error(res, 'Client not found', 404);

    const encrypted = password ? encrypt(password) : null;
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
  } catch (err) { return handleDbError(res, err); }
});

// ── PUT /api/social-accounts/:id ───────────────────────────
router.put('/:id', [param('id').isInt(), ...accountBody], validate, (req, res) => {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(req.params.id);
    if (!row) return error(res, 'Account not found', 404);

    const { client_id, platform, username, password, recovery_email, notes } = req.body;
    const encrypted = password ? encrypt(password) : row.password_encrypted;

    db.prepare(`
      UPDATE social_accounts
      SET client_id=?, platform=?, username=?, password_encrypted=?, recovery_email=?, notes=?
      WHERE id=?
    `).run(client_id, platform, username, encrypted, recovery_email || null, notes || null, req.params.id);

    logActivity(req.user.id, 'UPDATE', 'social_account', req.params.id, { platform, username });
    return success(res, null, 'Social account updated');
  } catch (err) { return handleDbError(res, err); }
});

// ── DELETE /api/social-accounts/:id ────────────────────────
router.delete('/:id', [param('id').isInt()], validate, (req, res) => {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT id FROM social_accounts WHERE id = ?').get(req.params.id);
    if (!row) return error(res, 'Account not found', 404);
    db.prepare('DELETE FROM social_accounts WHERE id = ?').run(req.params.id);
    logActivity(req.user.id, 'DELETE', 'social_account', req.params.id);
    return success(res, null, 'Social account deleted');
  } catch (err) { return handleDbError(res, err); }
});

module.exports = router;
