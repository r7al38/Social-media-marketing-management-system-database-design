'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');

const { getDb }        = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { validate }     = require('../middleware/validate');
const { success, error, paginated } = require('../utils/response');
const { logActivity }  = require('../utils/activitylog');

const router = express.Router();
router.use(authenticate);

const STATUSES = ['pending','in_progress','completed','cancelled'];

const orderBody = [
  body('client_id').isInt().withMessage('Client ID required'),
  body('service_id').isInt().withMessage('Service ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be ≥ 1'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be ≥ 0'),
  body('notes').optional({ nullable: true }).trim(),
];

// ── GET /api/orders ─────────────────────────────────────────
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('client_id').optional().isInt().toInt(),
  query('status').optional().isIn(STATUSES),
], validate, (req, res) => {
  const page   = req.query.page   || 1;
  const limit  = req.query.limit  || 20;
  const offset = (page - 1) * limit;

  let where  = 'WHERE 1=1';
  const params = [];

  if (req.query.client_id) { where += ' AND o.client_id = ?'; params.push(req.query.client_id); }
  if (req.query.status)    { where += ' AND o.status = ?';    params.push(req.query.status); }

  const db    = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM orders o ${where}`).get(...params).n;

  const orders = db.prepare(`
    SELECT o.*,
           c.business_name, c.type AS client_type,
           s.service_name, s.category
    FROM orders o
    JOIN clients  c ON c.id = o.client_id
    JOIN services s ON s.id = o.service_id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return paginated(res, { data: orders, total, page, limit });
});

// ── GET /api/orders/:id ─────────────────────────────────────
router.get('/:id', [param('id').isInt()], validate, (req, res) => {
  const db    = getDb();
  const order = db.prepare(`
    SELECT o.*,
           c.business_name, c.email AS client_email,
           s.service_name, s.category, s.description AS service_description
    FROM orders o
    JOIN clients  c ON c.id = o.client_id
    JOIN services s ON s.id = o.service_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return error(res, 'Order not found', 404);
  return success(res, order);
});

// ── POST /api/orders ────────────────────────────────────────
router.post('/', orderBody, validate, (req, res) => {
  const { client_id, service_id, quantity, unit_price, notes } = req.body;
  const db = getDb();

  const client  = db.prepare('SELECT id FROM clients  WHERE id = ? AND is_active = 1').get(client_id);
  const service = db.prepare('SELECT id FROM services WHERE id = ?').get(service_id);
  if (!client)  return error(res, 'Client not found', 404);
  if (!service) return error(res, 'Service not found', 404);

  const total_price = parseFloat((quantity * unit_price).toFixed(2));

  const result = db.prepare(`
    INSERT INTO orders (client_id, service_id, quantity, unit_price, total_price, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(client_id, service_id, quantity, unit_price, total_price, notes || null);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  logActivity(req.user.id, 'CREATE', 'order', result.lastInsertRowid, { client_id, service_id, total_price });
  return success(res, order, 'Order created', 201);
});

// ── PUT /api/orders/:id ─────────────────────────────────────
router.put('/:id', [param('id').isInt(), ...orderBody], validate, (req, res) => {
  const db    = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return error(res, 'Order not found', 404);

  if (['completed','cancelled'].includes(order.status)) {
    return error(res, `Cannot edit a ${order.status} order`, 400);
  }

  const { client_id, service_id, quantity, unit_price, notes } = req.body;
  const total_price = parseFloat((quantity * unit_price).toFixed(2));

  db.prepare(`
    UPDATE orders SET client_id=?, service_id=?, quantity=?, unit_price=?, total_price=?, notes=?
    WHERE id=?
  `).run(client_id, service_id, quantity, unit_price, total_price, notes || null, req.params.id);

  logActivity(req.user.id, 'UPDATE', 'order', req.params.id, { total_price });
  return success(res, db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id), 'Order updated');
});

// ── PATCH /api/orders/:id/status ───────────────────────────
// Update status and/or progress percentage
router.patch('/:id/status',
  [
    param('id').isInt(),
    body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
    body('progress_percentage').optional().isInt({ min: 0, max: 100 }),
  ],
  validate,
  (req, res) => {
    const db    = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return error(res, 'Order not found', 404);

    const status  = req.body.status  ?? order.status;
    const progress = req.body.progress_percentage ?? order.progress_percentage;
    const completed_at = status === 'completed' ? new Date().toISOString() : order.completed_at;

    db.prepare(`
      UPDATE orders SET status=?, progress_percentage=?, completed_at=? WHERE id=?
    `).run(status, progress, completed_at, req.params.id);

    logActivity(req.user.id, 'UPDATE', 'order', req.params.id, { status, progress_percentage: progress });
    return success(res, db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id), 'Order updated');
  }
);

// ── DELETE /api/orders/:id ──────────────────────────────────
router.delete('/:id', [param('id').isInt()], validate, (req, res) => {
  const db    = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return error(res, 'Order not found', 404);

  if (order.status !== 'pending') {
    return error(res, 'Only pending orders can be deleted. Cancel it first.', 400);
  }

  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE', 'order', req.params.id);
  return success(res, null, 'Order deleted');
});

module.exports = router;