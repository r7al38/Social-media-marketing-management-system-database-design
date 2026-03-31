'use strict';

const express = require('express');
const { getDb }        = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { success }      = require('../utils/response');

const router = express.Router();
router.use(authenticate);

// ── GET /api/reports/dashboard ──────────────────────────────
router.get('/dashboard', (req, res) => {
  const db = getDb();

  // KPI cards
  const totalClients  = db.prepare(`SELECT COUNT(*) AS n FROM clients WHERE is_active = 1`).get().n;
  const activeServices = db.prepare(`SELECT COUNT(*) AS n FROM client_services WHERE status = 'active'`).get().n;
  const ordersInProgress = db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE status = 'in_progress'`).get().n;

  // Revenue this week (paid invoices)
  const weekRevenue = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) AS n FROM invoices
    WHERE status = 'paid' AND paid_at >= date('now', '-7 days')
  `).get().n;

  // Orders by status (bar chart)
  const ordersByStatus = db.prepare(`
    SELECT status, COUNT(*) AS value FROM orders
    WHERE status != 'cancelled'
    GROUP BY status
  `).all().map(r => ({
    name:  r.status === 'in_progress' ? 'In Progress' : r.status.charAt(0).toUpperCase() + r.status.slice(1),
    value: r.value,
    status: r.status,
  }));

  // Daily revenue last 7 days (area chart)
  const dailyRevenue = db.prepare(`
    SELECT
      strftime('%w', paid_at) AS dow,
      date(paid_at)           AS day_date,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM invoices
    WHERE status = 'paid' AND paid_at >= date('now', '-7 days')
    GROUP BY date(paid_at)
    ORDER BY day_date ASC
  `).all();

  // Build a full 7-day array (fill gaps with 0)
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const revenueChart = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found   = dailyRevenue.find(r => r.day_date === dateStr);
    revenueChart.push({ day: DAY_NAMES[d.getDay()], revenue: found ? found.revenue : 0 });
  }

  // Recent orders (last 6)
  const recentOrders = db.prepare(`
    SELECT o.id, o.status, o.total_price, o.created_at,
           c.business_name, s.service_name
    FROM orders o
    JOIN clients  c ON c.id = o.client_id
    JOIN services s ON s.id = o.service_id
    ORDER BY o.created_at DESC LIMIT 6
  `).all();

  // Active tasks (in_progress)
  const activeTasks = db.prepare(`
    SELECT t.id, t.title, t.status, c.business_name
    FROM tasks t
    JOIN clients c ON c.id = t.client_id
    WHERE t.status = 'in_progress'
    ORDER BY t.deadline ASC NULLS LAST
    LIMIT 5
  `).all();

  return success(res, {
    kpi: {
      totalClients,
      activeServices,
      ordersInProgress,
      weekRevenue,
    },
    revenueChart,
    ordersByStatus,
    recentOrders,
    activeTasks,
  });
});

module.exports = router;