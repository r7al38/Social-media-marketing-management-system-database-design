'use strict';

const jwt    = require('jsonwebtoken');
const { error } = require('../utils/response');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Verifies the Bearer token on every protected route.
 * Attaches the decoded payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return error(res, message, 401);
  }
}

/**
 * Restricts access to specified roles.
 * @param {...string} roles - e.g. authorize('admin')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

module.exports = { authenticate, authorize };