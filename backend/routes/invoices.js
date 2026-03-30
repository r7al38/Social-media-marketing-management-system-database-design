'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');

const { getDb }          = require('../database/connection');
const { withTransaction } = require('../database/connection');
const { authenticate }   = require('../middleware/auth');
const { validate }       = require('../middleware/validate');
const { success, error, paginated } = require('../utils/response');
const { logActivity }    = require('../utils/activitylog');

const router = express.Router();
router.use(authenticate);

const STATUSES = ['paid','unpaid','overdue','cancelled'];

// ── GET /api/invoices ───────────────────────────────────────
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('client_id').optional().isInt().toInt(),
  query('status').optional().isIn(STATUSES),
], validate, (req, res) => {
  const page   = req.query.page  || 1;
  const limit  = req.query.limit || 20;
  const offset = (page - 1) * limit;

  let where  = 'WHERE 1=1';
  const params = [];
  if (req.query.client_id) { where += ' AND i.client_id = ?'; params.push(req.query.client_id); }
  if (req.query.status)    { where += ' AND i.status = ?';    params.push(req.query.status); }

  const db    = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM invoices i ${where}`).get(...params).n;

  const invoices = db.prepare(`
    SELECT i.*, c.business_name
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    ${where}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // Attach items to each invoice
  const withItems = invoices.map(inv => ({
    ...inv,
    items: db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id),
  }));

  return paginated(res, { data: withItems, total, page, limit });
});

// ── GET /api/invoices/:id ───────────────────────────────────
router.get('/:id', [param('id').isInt()], validate, (req, res) => {
  const db  = getDb();
  const inv = db.prepare(`
    SELECT i.*, c.business_name, c.email AS client_email
    FROM invoices i JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!inv) return error(res, 'Invoice not found', 404);

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  return success(res, { ...inv, items });
});

// ── POST /api/invoices ──────────────────────────────────────
router.post('/',
  [
    body('client_id').isInt().withMessage('Client ID required'),
    body('invoice_number').trim().notEmpty().withMessage('Invoice number required'),
    body('due_date').optional({ nullable: true }).isISO8601(),
    body('notes').optional({ nullable: true }).trim(),
  ],
  validate,
  (req, res) => {
    const { client_id, invoice_number, due_date, notes } = req.body;
    const db = getDb();

    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND is_active = 1').get(client_id);
    if (!client) return error(res, 'Client not found', 404);

    const result = db.prepare(`
      INSERT INTO invoices (client_id, invoice_number, due_date, notes)
      VALUES (?, ?, ?, ?)
    `).run(client_id, invoice_number, due_date || null, notes || null);

    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid);
    logActivity(req.user.id, 'CREATE', 'invoice', result.lastInsertRowid, { invoice_number });
    return success(res, { ...inv, items: [] }, 'Invoice created', 201);
  }
);

// ── PUT /api/invoices/:id ───────────────────────────────────
router.put('/:id',
  [
    param('id').isInt(),
    body('status').optional().isIn(STATUSES),
    body('due_date').optional({ nullable: true }).isISO8601(),
    body('notes').optional({ nullable: true }).trim(),
  ],
  validate,
  (req, res) => {
    const db  = getDb();
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!inv) return error(res, 'Invoice not found', 404);

    const status   = req.body.status   ?? inv.status;
    const due_date = req.body.due_date ?? inv.due_date;
    const notes    = req.body.notes    ?? inv.notes;
    const paid_at  = status === 'paid' && inv.status !== 'paid' ? new Date().toISOString() : inv.paid_at;

    db.prepare(`
      UPDATE invoices SET status=?, due_date=?, notes=?, paid_at=? WHERE id=?
    `).run(status, due_date, notes, paid_at, req.params.id);

    logActivity(req.user.id, 'UPDATE', 'invoice', req.params.id, { status });
    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    return success(res, updated, 'Invoice updated');
  }
);

// ── POST /api/invoices/:id/items ────────────────────────────
router.post('/:id/items',
  [
    param('id').isInt(),
    body('description').trim().notEmpty(),
    body('quantity').isInt({ min: 1 }),
    body('unit_price').isFloat({ min: 0 }),
    body('order_id').optional({ nullable: true }).isInt(),
  ],
  validate,
  (req, res) => {
    const db  = getDb();
    const inv = db.prepare('SELECT id FROM invoices WHERE id = ?').get(req.params.id);
    if (!inv) return error(res, 'Invoice not found', 404);

    const { description, quantity, unit_price, order_id } = req.body;
    const subtotal = parseFloat((quantity * unit_price).toFixed(2));

    db.prepare(`
      INSERT INTO invoice_items (invoice_id, order_id, description, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, order_id || null, description, quantity, unit_price, subtotal);

    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    const items   = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
    return success(res, { ...updated, items }, 'Item added', 201);
  }
);

// ── DELETE /api/invoices/:id ────────────────────────────────
router.delete('/:id', [param('id').isInt()], validate, (req, res) => {
  const db  = getDb();
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return error(res, 'Invoice not found', 404);
  if (inv.status === 'paid') return error(res, 'Cannot delete a paid invoice', 400);

  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE', 'invoice', req.params.id);
  return success(res, null, 'Invoice deleted');
});

module.exports = router;