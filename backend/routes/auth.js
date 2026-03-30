'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body } = require('express-validator');

const { getDb }       = require('../database/connection');
const { validate }    = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();
const SECRET  = process.env.JWT_SECRET    || 'dev_secret_change_me';
const EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  (req, res) => {
    const { username, password } = req.body;
    const db   = getDb();
    const user = db.prepare(
      'SELECT * FROM users WHERE username = ? AND is_active = 1'
    ).get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return error(res, 'Invalid credentials', 401);
    }

    const payload = { id: user.id, username: user.username, role: user.role };
    const token   = jwt.sign(payload, SECRET, { expiresIn: EXPIRES });

    return success(res, { token, user: payload }, 'Login successful');
  }
);

// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const db   = getDb();
  const user = db.prepare(
    'SELECT id, username, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) return error(res, 'User not found', 404);
  return success(res, user);
});

// ── PUT /api/auth/change-password ──────────────────────────
router.put('/change-password',
  authenticate,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  (req, res) => {
    const { current_password, new_password } = req.body;
    const db   = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!bcrypt.compareSync(current_password, user.password)) {
      return error(res, 'Current password is incorrect', 400);
    }

    const hashed = bcrypt.hashSync(new_password, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    return success(res, null, 'Password changed successfully');
  }
);

module.exports = router;