'use strict';

/**
 * Sends a standardised success response.
 */
function success(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Sends a standardised error response.
 */
function error(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

/**
 * Sends a paginated response.
 */
function paginated(res, { data, total, page, limit }) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}

module.exports = { success, error, paginated };