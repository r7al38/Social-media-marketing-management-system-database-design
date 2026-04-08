'use strict';

const jwt    = require('jsonwebtoken');
const { error } = require('../utils/response');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Verifies Bearer JWT. Attaches decoded payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication required', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return error(res, msg, 401);
  }
}

/**
 * Role-based access control.
 * Usage: authorize('admin') or authorize('admin','staff')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }
    return next();
  };
}

/**
 * Convenience: require admin role.
 */
const requireAdmin = authorize('admin');

/**
 * Convenience: require admin or staff role.
 */
const requireStaff = authorize('admin', 'staff');

module.exports = { authenticate, authorize, requireAdmin, requireStaff };
