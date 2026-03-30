'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

const LOG_DIR = path.resolve('./logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // Console output — human-readable in dev
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, stack }) =>
          `${timestamp} [${level}]: ${stack || message}`
        )
      ),
    }),
    // Persisted log files
    new transports.File({ filename: path.join(LOG_DIR, 'error.log'),  level: 'error' }),
    new transports.File({ filename: path.join(LOG_DIR, 'combined.log') }),
  ],
});

module.exports = logger;