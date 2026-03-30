'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const { getDb }        = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { validate }     = require('../middleware/validate');
const { success, error, paginated } = require('../utils/response');
const { logActivity }  = require('../utils/activitylog');

const router = express.Router();
router.use(authenticate);

const serviceBody = [
  body('service_name').trim().notEmpty().withMessage('Service name is required'),
  body('category').isIn(['ads','growth','security','management']).withMessage('Invalid category'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('description').optional({ nullable: true }).trim(),
];

// ── GET /api/services ───────────────────────────────────────
router.get('/', (req, res) => {
  const db       = getDb();
  const category = req.query.category || null;
  const activeOnly = req.query.active !== '0'; // default: active only

  let where = activeOnly ? 'WHERE is_active = 1' : '';
  const params = [];

  if (category) {
    where += (where ? ' AND ' : 'WHERE ') + 'category = ?';
    params.push(category);
  }

  const services = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM orders o WHERE o.service_id = s.id) AS total_orders,
      (SELECT COUNT(*) FROM client_services cs WHERE cs.service_id = s.id AND cs.status = 'active') AS active_subscriptions
    FROM services s
    ${where}
    ORDER BY category, service_name
  `).all(...params);

  return success(res, services);
});

// ── GET /api/services/:id ───────────────────────────────────
router.get('/:id', [param('id').isInt()], validate, (req, res) => {
  const db      = getDb();
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!service) return error(res, 'Service not found', 404);
  return success(res, service);
});

// ── POST /api/services ──────────────────────────────────────
router.post('/', authorize('admin'), serviceBody, validate, (req, res) => {
  const { service_name, category, description, price } = req.body;
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO services (service_name, category, description, price)
    VALUES (?, ?, ?, ?)
  `).run(service_name, category, description || null, price);

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
  logActivity(req.user.id, 'CREATE', 'service', result.lastInsertRowid, { service_name });
  return success(res, service, 'Service created', 201);
});

// ── PUT /api/services/:id ───────────────────────────────────
router.put('/:id', authorize('admin'), [param('id').isInt(), ...serviceBody], validate, (req, res) => {
  const db      = getDb();
  const service = db.prepare('SELECT id FROM services WHERE id = ?').get(req.params.id);
  if (!service) return error(res, 'Service not found', 404);

  const { service_name, category, description, price } = req.body;
  db.prepare(`
    UPDATE services SET service_name=?, category=?, description=?, price=? WHERE id=?
  `).run(service_name, category, description || null, price, req.params.id);

  const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  logActivity(req.user.id, 'UPDATE', 'service', req.params.id, { service_name });
  return success(res, updated, 'Service updated');
});

// ── PATCH /api/services/:id/toggle ─────────────────────────
// Activate / deactivate a service
router.patch('/:id/toggle', authorize('admin'), [param('id').isInt()], validate, (req, res) => {
  const db      = getDb();
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!service) return error(res, 'Service not found', 404);

  db.prepare('UPDATE services SET is_active = ? WHERE id = ?').run(service.is_active ? 0 : 1, req.params.id);
  logActivity(req.user.id, 'UPDATE', 'service', req.params.id, { is_active: !service.is_active });
  return success(res, null, `Service ${service.is_active ? 'deactivated' : 'activated'}`);
});

// ── DELETE /api/services/:id ────────────────────────────────
router.delete('/:id', authorize('admin'), [param('id').isInt()], validate, (req, res) => {
  const db      = getDb();
  const service = db.prepare('SELECT id FROM services WHERE id = ?').get(req.params.id);
  if (!service) return error(res, 'Service not found', 404);

  // Check if service is in use
  const inUse = db.prepare(
    'SELECT COUNT(*) AS n FROM orders WHERE service_id = ? AND status != ?'
  ).get(req.params.id, 'cancelled').n;

  if (inUse > 0) {
    return error(res, 'Cannot delete a service that has active orders. Deactivate it instead.', 409);
  }

  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE', 'service', req.params.id);
  return success(res, null, 'Service deleted');
});

module.exports = router;