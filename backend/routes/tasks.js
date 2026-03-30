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

const STATUSES = ['todo','in_progress','done'];

const taskBody = [
  body('client_id').isInt().withMessage('Client ID required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional({ nullable: true }).trim(),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('assigned_to').optional({ nullable: true }).isInt(),
  body('deadline').optional({ nullable: true }).isISO8601().withMessage('Invalid deadline date'),
];

// ── GET /api/tasks ──────────────────────────────────────────
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('client_id').optional().isInt().toInt(),
  query('assigned_to').optional().isInt().toInt(),
  query('status').optional().isIn(STATUSES),
], validate, (req, res) => {
  const page   = req.query.page  || 1;
  const limit  = req.query.limit || 20;
  const offset = (page - 1) * limit;

  let where  = 'WHERE 1=1';
  const params = [];

  if (req.query.client_id)  { where += ' AND t.client_id = ?';  params.push(req.query.client_id); }
  if (req.query.assigned_to){ where += ' AND t.assigned_to = ?';params.push(req.query.assigned_to); }
  if (req.query.status)     { where += ' AND t.status = ?';     params.push(req.query.status); }

  const db    = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM tasks t ${where}`).get(...params).n;

  const tasks = db.prepare(`
    SELECT t.*,
           c.business_name,
           u.username AS assigned_to_name
    FROM tasks t
    JOIN clients c  ON c.id = t.client_id
    LEFT JOIN users u ON u.id = t.assigned_to
    ${where}
    ORDER BY
      CASE t.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
      t.deadline ASC NULLS LAST,
      t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return paginated(res, { data: tasks, total, page, limit });
});

// ── GET /api/tasks/board?client_id= ────────────────────────
// Kanban board view — tasks grouped by status
router.get('/board', (req, res) => {
  const db = getDb();
  const { client_id } = req.query;

  const where  = client_id ? 'WHERE t.client_id = ?' : '';
  const params = client_id ? [client_id] : [];

  const tasks = db.prepare(`
    SELECT t.*, c.business_name, u.username AS assigned_to_name
    FROM tasks t
    JOIN clients c  ON c.id = t.client_id
    LEFT JOIN users u ON u.id = t.assigned_to
    ${where}
    ORDER BY t.deadline ASC NULLS LAST
  `).all(...params);

  const board = {
    todo:        tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done:        tasks.filter(t => t.status === 'done'),
  };

  return success(res, board);
});

// ── GET /api/tasks/:id ──────────────────────────────────────
router.get('/:id', [param('id').isInt()], validate, (req, res) => {
  const db   = getDb();
  const task = db.prepare(`
    SELECT t.*, c.business_name, u.username AS assigned_to_name
    FROM tasks t
    JOIN clients c  ON c.id = t.client_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return error(res, 'Task not found', 404);
  return success(res, task);
});

// ── POST /api/tasks ─────────────────────────────────────────
router.post('/', taskBody, validate, (req, res) => {
  const { client_id, title, description, status, assigned_to, deadline } = req.body;
  const db = getDb();

  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND is_active = 1').get(client_id);
  if (!client) return error(res, 'Client not found', 404);

  const result = db.prepare(`
    INSERT INTO tasks (client_id, title, description, status, assigned_to, deadline)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    client_id,
    title,
    description || null,
    status || 'todo',
    assigned_to || null,
    deadline || null
  );

  const task = db.prepare(`
    SELECT t.*, u.username AS assigned_to_name FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = ?
  `).get(result.lastInsertRowid);

  logActivity(req.user.id, 'CREATE', 'task', result.lastInsertRowid, { client_id, title });
  return success(res, task, 'Task created', 201);
});

// ── PUT /api/tasks/:id ──────────────────────────────────────
router.put('/:id', [param('id').isInt(), ...taskBody], validate, (req, res) => {
  const db   = getDb();
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return error(res, 'Task not found', 404);

  const { client_id, title, description, status, assigned_to, deadline } = req.body;
  db.prepare(`
    UPDATE tasks SET client_id=?, title=?, description=?, status=?, assigned_to=?, deadline=?
    WHERE id=?
  `).run(client_id, title, description || null, status || 'todo', assigned_to || null, deadline || null, req.params.id);

  logActivity(req.user.id, 'UPDATE', 'task', req.params.id, { title, status });
  return success(res, db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id), 'Task updated');
});

// ── PATCH /api/tasks/:id/status ─────────────────────────────
router.patch('/:id/status',
  [param('id').isInt(), body('status').isIn(STATUSES).withMessage('Invalid status')],
  validate,
  (req, res) => {
    const db   = getDb();
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return error(res, 'Task not found', 404);

    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    logActivity(req.user.id, 'UPDATE', 'task', req.params.id, { status: req.body.status });
    return success(res, null, 'Status updated');
  }
);

// ── DELETE /api/tasks/:id ───────────────────────────────────
router.delete('/:id', [param('id').isInt()], validate, (req, res) => {
  const db   = getDb();
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return error(res, 'Task not found', 404);

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE', 'task', req.params.id);
  return success(res, null, 'Task deleted');
});

module.exports = router;