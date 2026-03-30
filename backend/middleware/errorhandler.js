'use strict';

const logger = require('../utils/logger');

/**
 * 404 handler — mount AFTER all routes.
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global error handler — must have 4 parameters (err, req, res, next).
 * Mount LAST in server.js.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error(err);

  // express-validator wraps errors differently
  if (err.type === 'validation') {
    return res.status(422).json({ success: false, message: 'Validation error', errors: err.errors });
  }

  // SQLite constraint violations
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ success: false, message: 'A record with this value already exists.' });
  }
  if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(400).json({ success: false, message: 'Database constraint violation.' });
  }

  const statusCode = err.statusCode || 500;
  const message    = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({ success: false, message });
}

module.exports = { notFound, errorHandler };