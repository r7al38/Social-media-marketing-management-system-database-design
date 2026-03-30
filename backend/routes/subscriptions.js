'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const { getDb }       = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { validate }    = require('../middleware/validate');
const { success, error } = require('../utils/response');
const { logActivity } = require('../utils/activitylog');

const router = express.Router();
router.use(authenticate);

// ── GET /api/subscriptions?client_id=&service_id= ──────────
router.get('/', (req, res) => {
  const db  = getDb();
  const { client_id, service_id, status } = req.query;

  let where  = 'WHERE 1=1';
  const params = [];

  if (client_id)  { where += ' AND cs.client_id = ?';  params.push(client_id); }
  if (service_id) { where += ' AND cs.service_id = ?'; params.push(service_id); }
  if (status)     { where += ' AND cs.status = ?';     params.push(status); }

  const rows = db.prepare(`
    SELECT cs.*,
           c.business_name, c.type AS client_type,
           s.service_name, s.category, s.price
    FROM client_services cs
    JOIN clients  c ON c.id = cs.client_id
    JOIN services s ON s.id = cs.service_id
    ${where}
    ORDER BY cs.created_at DESC
  `).all(...params);

  return success(res, rows);
});

// ── POST /api/subscriptions ─────────────────────────────────
// Subscribe a client to a service
router.post('/',
  [
    body('client_id').isInt().withMessage('Client ID is required'),
    body('service_id').isInt().withMessage('Service ID is required'),
    body('start_date').optional({ nullable: true }).isISO8601(),
    body('end_date').optional({ nullable: true }).isISO8601(),
    body('status').optional().isIn(['active','paused','cancelled']),
  ],
  validate,
  (req, res) => {
    const { client_id, service_id, start_date, end_date, status } = req.body;
    const db = getDb();

    // Verify both entities exist
    const client  = db.prepare('SELECT id FROM clients  WHERE id = ?').get(client_id);
    const service = db.prepare('SELECT id FROM services WHERE id = ?').get(service_id);
    if (!client)  return error(res, 'Client not found', 404);
    if (!service) return error(res, 'Service not found', 404);

    const result = db.prepare(`
      INSERT INTO client_services (client_id, service_id, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(client_id, service_id, start_date || null, end_date || null, status || 'active');

    const sub = db.prepare(`
      SELECT cs.*, s.service_name, s.category FROM client_services cs
      JOIN services s ON s.id = cs.service_id WHERE cs.id = ?
    `).get(result.lastInsertRowid);

    logActivity(req.user.id, 'CREATE', 'subscription', result.lastInsertRowid, { client_id, service_id });
    return success(res, sub, 'Subscription created', 201);
  }
);

// ── PATCH /api/subscriptions/:id ───────────────────────────
// Update subscription status or dates
router.patch('/:id',
  [
    param('id').isInt(),
    body('status').optional().isIn(['active','paused','cancelled']),
    body('start_date').optional({ nullable: true }).isISO8601(),
    body('end_date').optional({ nullable: true }).isISO8601(),
  ],
  validate,
  (req, res) => {
    const db  = getDb();
    const sub = db.prepare('SELECT * FROM client_services WHERE id = ?').get(req.params.id);
    if (!sub) return error(res, 'Subscription not found', 404);

    const status     = req.body.status     ?? sub.status;
    const start_date = req.body.start_date ?? sub.start_date;
    const end_date   = req.body.end_date   ?? sub.end_date;

    db.prepare(`
      UPDATE client_services SET status=?, start_date=?, end_date=? WHERE id=?
    `).run(status, start_date, end_date, req.params.id);

    const updated = db.prepare('SELECT * FROM client_services WHERE id = ?').get(req.params.id);
    logActivity(req.user.id, 'UPDATE', 'subscription', req.params.id, { status });
    return success(res, updated, 'Subscription updated');
  }
);

// ── DELETE /api/subscriptions/:id ──────────────────────────
router.delete('/:id', [param('id').isInt()], validate, (req, res) => {
  const db  = getDb();
  const sub = db.prepare('SELECT id FROM client_services WHERE id = ?').get(req.params.id);
  if (!sub) return error(res, 'Subscription not found', 404);

  db.prepare('DELETE FROM client_services WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE', 'subscription', req.params.id);
  return success(res, null, 'Subscription removed');
});

module.exports = router;