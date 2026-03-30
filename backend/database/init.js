'use strict';

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const { getDb } = require('./connection');
const logger = require('../utils/logger');

function initDatabase() {
  const db         = getDb();
  const schemaPath = path.resolve(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    logger.error(`Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Execute the entire schema as a batch (handles multiple statements)
  db.exec(schema);
  logger.info('Database schema applied successfully.');
}

// Allow running directly: node database/init.js
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };