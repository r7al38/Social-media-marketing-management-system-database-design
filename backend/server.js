'use strict';

require('dotenv').config();

const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const fs          = require('fs');

const logger             = require('./utils/logger');
const { initDatabase }   = require('./database/init');
const { startScheduler } = require('./scheduler');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ── Route modules ─────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const clientRoutes       = require('./routes/clients');
const serviceRoutes      = require('./routes/services');
const subscriptionRoutes = require('./routes/subscriptions');
const socialRoutes       = require('./routes/socialAccounts');
const orderRoutes        = require('./routes/orders');
const taskRoutes         = require('./routes/tasks');
const invoiceRoutes      = require('./routes/invoices');
const adminRoutes        = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const reportsRoutes      = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 5000;
const PROD = process.env.NODE_ENV === 'production';

// ── Security ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled so React SPA assets load
}));

// CORS: in production the frontend is served from the same origin,
// so we only need CORS for local dev (React dev server on :3000)
app.use(cors({
  origin: PROD ? false : 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Compact request logging
if (!PROD) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (m) => logger.info(m.trim()) },
    skip: (req) => req.url.startsWith('/api/health'),
  }));
}

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
}));

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/clients',         clientRoutes);
app.use('/api/services',        serviceRoutes);
app.use('/api/subscriptions',   subscriptionRoutes);
app.use('/api/social-accounts', socialRoutes);
app.use('/api/orders',          orderRoutes);
app.use('/api/tasks',           taskRoutes);
app.use('/api/invoices',        invoiceRoutes);
app.use('/api/admin',           adminRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/reports',         reportsRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ── Serve React static build ──────────────────────────────────
// The React app is built to frontend/dist/
// Express serves it as static files and handles client-side routing
const DIST = path.resolve(__dirname, '../frontend/dist');

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: PROD ? '1d' : 0 }));

  // Any non-API route → return index.html (React Router handles it)
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });

  logger.info(`Serving React build from: ${DIST}`);
} else {
  // Frontend not built yet — show a helpful message
  app.get('/', (req, res) => {
    res.send(`
      <h2>SMM Dashboard — Backend Running ✓</h2>
      <p>Frontend not built yet.</p>
      <p>Run: <code>cd frontend && npm install && npm run build</code></p>
      <p>API health: <a href="/api/health">/api/health</a></p>
    `);
  });
  logger.warn(`Frontend dist not found at ${DIST}. Run: npm run build`);
}

// ── Error handlers ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────
function start() {
  try {
    initDatabase();
    startScheduler();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`──────────────────────────────────────`);
      logger.info(`  SMM Dashboard running`);
      logger.info(`  URL : http://localhost:${PORT}`);
      logger.info(`  ENV : ${process.env.NODE_ENV || 'development'}`);
      logger.info(`  DB  : ${process.env.DB_PATH || './database/smm.db'}`);
      logger.info(`──────────────────────────────────────`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
