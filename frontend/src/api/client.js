'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');

const { getDb }          = require('../database/connection');
const { authenticate }   = require('../middleware/auth');
const { validate }       = require('../middleware/validate');
const { success, error, paginated } = require('../utils/response');
const { logActivity }    = require('../utils/activityLog');

const router = express.Router();
router.use(authenticate);

// All valid client types (extend here as business grows)
const CLIENT_TYPES = ['cafe','restaurant','bakery','cake_shop','store','company','other'];

// ── Validators ─────────────────────────────────────────────
const clientBody = [
  body('business_name').trim().notEmpty().withMessage('Business name is required'),
  body('type').isIn(CLIENT_TYPES).withMessage('Invalid client type'),
  // checkFalsy: true treats empty string "" the same as not provided
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim(),
  body('address').optional({ nullable: true, checkFalsy: true }).trim(),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim(),
];

// ── GET /api/clients ────────────────────────────────────────
// List all clients with optional search and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('type').optional().isIn(CLIENT_TYPES),
], validate, (req, res) => {
  const page   = req.query.page  || 1;
  const limit  = req.query.limit || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;
  const type   = req.query.type   || null;

  const db = getDb();

  let where = 'WHERE c.is_active = 1';
  const params = [];

  if (search) {
    where += ' AND (c.business_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
    params.push(search, search, search);
  }
  if (type) {
    where += ' AND c.type = ?';
    params.push(type);
  }

  const total = db.prepare(`SELECT COUNT(*) AS n FROM clients c ${where}`).get(...params).n;

  const clients = db.prepare(`
    SELECT
      c.id, c.business_name, c.type, c.phone, c.email, c.address, c.created_at,
      COUNT(DISTINCT o.id)  AS total_orders,
      COUNT(DISTINCT t.id)  AS open_tasks,
      COALESCE(SUM(CASE WHEN i.status = 'unpaid' THEN i.total_amount END), 0) AS unpaid_amount
    FROM clients c
    LEFT JOIN orders   o ON o.client_id = c.id AND o.status != 'cancelled'
    LEFT JOIN tasks    t ON t.client_id = c.id AND t.status != 'done'
    LEFT JOIN invoices i ON i.client_id = c.id
    ${where}
    GROUP BY c.id
    ORDER BY c.business_name
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return paginated(res, { data: clients, total, page, limit });
});

// ── GET /api/clients/:id ────────────────────────────────────
// Single client (basic info only)
router.get('/:id', [param('id').isInt()], validate, (req, res) => {
  const db     = getDb();
  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND is_active = 1'
  ).get(req.params.id);

  if (!client) return error(res, 'Client not found', 404);
  return success(res, client);
});

// ── GET /api/clients/:id/profile ───────────────────────────
// FULL client profile — all related data in one response
router.get('/:id/profile', [param('id').isInt()], validate, (req, res) => {
  const db  = getDb();
  const id  = Number(req.params.id);

  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND is_active = 1'
  ).get(id);
  if (!client) return error(res, 'Client not found', 404);

  // Subscribed services
  const services = db.prepare(`
    SELECT cs.id, cs.status, cs.start_date, cs.end_date,
           s.id AS service_id, s.service_name, s.category, s.description, s.price
    FROM client_services cs
    JOIN services s ON s.id = cs.service_id
    WHERE cs.client_id = ?
    ORDER BY cs.created_at DESC
  `).all(id);

  // Social media accounts (never expose raw encrypted password)
  const social_accounts = db.prepare(`
    SELECT id, platform, username, recovery_email, notes, created_at
    FROM social_accounts
    WHERE client_id = ?
    ORDER BY platform
  `).all(id);

  // Orders with service name
  const orders = db.prepare(`
    SELECT o.*, s.service_name, s.category
    FROM orders o
    JOIN services s ON s.id = o.service_id
    WHERE o.client_id = ?
    ORDER BY o.created_at DESC
  `).all(id);

  // Invoices with line items
  const invoiceRows = db.prepare(`
    SELECT i.*
    FROM invoices i
    WHERE i.client_id = ?
    ORDER BY i.created_at DESC
  `).all(id);

  const invoices = invoiceRows.map(inv => ({
    ...inv,
    items: db.prepare(`
      SELECT ii.*, o.status AS order_status
      FROM invoice_items ii
      LEFT JOIN orders o ON o.id = ii.order_id
      WHERE ii.invoice_id = ?
    `).all(inv.id),
  }));

  // Tasks with assignee name
  const tasks = db.prepare(`
    SELECT t.*, u.username AS assigned_to_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.client_id = ?
    ORDER BY
      CASE t.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
      t.deadline ASC NULLS LAST
  `).all(id);

  // Summary KPIs
  const summary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM orders    WHERE client_id = ? AND status != 'cancelled') AS total_orders,
      (SELECT COUNT(*) FROM orders    WHERE client_id = ? AND status = 'completed')  AS completed_orders,
      (SELECT COUNT(*) FROM orders    WHERE client_id = ? AND status = 'in_progress') AS active_orders,
      (SELECT COUNT(*) FROM tasks     WHERE client_id = ? AND status != 'done')       AS open_tasks,
      (SELECT COUNT(*) FROM invoices  WHERE client_id = ? AND status = 'unpaid')      AS unpaid_invoices,
      (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE client_id = ? AND status = 'unpaid') AS unpaid_amount,
      (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE client_id = ? AND status = 'paid')   AS paid_amount
  `).get(id, id, id, id, id, id, id);

  return success(res, {
    client,
    summary,
    services,
    social_accounts,
    orders,
    invoices,
    tasks,
  });
});

// ── POST /api/clients ───────────────────────────────────────
router.post('/', clientBody, validate, (req, res) => {
  const { business_name, type, phone, email, address, notes } = req.body;
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO clients (business_name, type, phone, email, address, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(business_name, type, phone || null, email || null, address || null, notes || null);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  logActivity(req.user.id, 'CREATE', 'client', result.lastInsertRowid, { business_name });
  return success(res, client, 'Client created', 201);
});

// ── PUT /api/clients/:id ────────────────────────────────────
router.put('/:id', [param('id').isInt(), ...clientBody], validate, (req, res) => {
  const db     = getDb();
  const exists = db.prepare('SELECT id FROM clients WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!exists) return error(res, 'Client not found', 404);

  const { business_name, type, phone, email, address, notes } = req.body;
  db.prepare(`
    UPDATE clients SET business_name=?, type=?, phone=?, email=?, address=?, notes=?
    WHERE id=?
  `).run(business_name, type, phone || null, email || null, address || null, notes || null, req.params.id);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  logActivity(req.user.id, 'UPDATE', 'client', req.params.id, { business_name });
  return success(res, client, 'Client updated');
});

// ── DELETE /api/clients/:id ─────────────────────────────────
// Soft delete — sets is_active = 0
router.delete('/:id', [param('id').isInt()], validate, (req, res) => {
  const db     = getDb();
  const exists = db.prepare('SELECT id FROM clients WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!exists) return error(res, 'Client not found', 404);

  db.prepare('UPDATE clients SET is_active = 0 WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE', 'client', req.params.id);
  return success(res, null, 'Client deactivated');
});

module.exports = router;
