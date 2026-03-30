'use strict';

const { getDb } = require('../database/connection');

/**
 * Collects all data needed for the weekly report.
 * Returns a plain object — no formatting, no dependencies on Telegram.
 */
function buildWeeklyReport() {
  const db = getDb();

  // Date window: last 7 days
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString();

  // ── Clients ───────────────────────────────────────────────
  const totalClients = db.prepare(
    `SELECT COUNT(*) AS n FROM clients WHERE is_active = 1`
  ).get().n;

  const newClients = db.prepare(
    `SELECT COUNT(*) AS n FROM clients WHERE created_at >= ?`
  ).get(sinceISO).n;

  // ── Orders ────────────────────────────────────────────────
  const orderStats = db.prepare(`
    SELECT
      COUNT(*)                                          AS total,
      SUM(CASE WHEN status = 'completed'   THEN 1 END) AS completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress,
      SUM(CASE WHEN status = 'pending'     THEN 1 END) AS pending,
      COALESCE(SUM(CASE WHEN status = 'completed' AND created_at >= ? THEN total_price END), 0) AS week_revenue
    FROM orders
    WHERE status != 'cancelled'
  `).get(sinceISO);

  const newOrders = db.prepare(
    `SELECT COUNT(*) AS n FROM orders WHERE created_at >= ?`
  ).get(sinceISO).n;

  // ── Tasks ─────────────────────────────────────────────────
  const taskStats = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'todo'        THEN 1 END) AS todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress,
      SUM(CASE WHEN status = 'done'        THEN 1 END) AS done,
      SUM(CASE WHEN status = 'done' AND updated_at >= ? THEN 1 END) AS completed_this_week
    FROM tasks
  `).get(sinceISO);

  // Overdue tasks
  const overdueTasks = db.prepare(`
    SELECT COUNT(*) AS n FROM tasks
    WHERE status != 'done' AND deadline IS NOT NULL AND deadline < datetime('now')
  `).get().n;

  // ── Invoices ──────────────────────────────────────────────
  const invoiceStats = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'unpaid'                                  THEN total_amount END) AS unpaid_total,
      COUNT(CASE WHEN status = 'unpaid'                                THEN 1 END)            AS unpaid_count,
      COUNT(CASE WHEN status = 'unpaid' AND due_date < date('now')     THEN 1 END)            AS overdue_count,
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= ?          THEN total_amount END), 0) AS collected_this_week
    FROM invoices
  `).get(sinceISO);

  // ── Top clients by order count ─────────────────────────────
  const topClients = db.prepare(`
    SELECT c.business_name, COUNT(o.id) AS order_count,
           COALESCE(SUM(o.total_price), 0) AS total_value
    FROM clients c
    JOIN orders o ON o.client_id = c.id AND o.status != 'cancelled'
    WHERE c.is_active = 1
    GROUP BY c.id
    ORDER BY order_count DESC
    LIMIT 3
  `).all();

  // ── Recently completed orders ──────────────────────────────
  const recentCompleted = db.prepare(`
    SELECT o.id, c.business_name, s.service_name, o.total_price, o.completed_at
    FROM orders o
    JOIN clients  c ON c.id = o.client_id
    JOIN services s ON s.id = o.service_id
    WHERE o.status = 'completed' AND o.completed_at >= ?
    ORDER BY o.completed_at DESC
    LIMIT 5
  `).all(sinceISO);

  return {
    generatedAt:      new Date().toISOString(),
    period:           { from: sinceISO, to: new Date().toISOString() },
    clients:          { total: totalClients, new: newClients },
    orders:           { ...orderStats, newThisWeek: newOrders },
    tasks:            { ...taskStats, overdue: overdueTasks },
    invoices:         invoiceStats,
    topClients,
    recentCompleted,
  };
}

module.exports = { buildWeeklyReport };