'use strict';

function success(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function error(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function paginated(res, { data, total, page, limit }) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  });
}

module.exports = { success, error, paginated };
