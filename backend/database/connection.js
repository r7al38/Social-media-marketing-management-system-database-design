'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const logger   = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || './database/smm.db';

// Ensure the database directory exists
const dbDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let _db;

/**
 * Returns the singleton SQLite database instance.
 * Opens and configures the connection on first call.
 */
function getDb() {
  if (_db) return _db;

  _db = new Database(path.resolve(DB_PATH), {
    verbose: process.env.NODE_ENV === 'development' ? (sql) => logger.debug(sql) : null,
  });

  // Performance & integrity PRAGMAs
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -32000'); // 32 MB cache
  _db.pragma('temp_store = MEMORY');

  logger.info(`Database connected: ${path.resolve(DB_PATH)}`);
  return _db;
}

/**
 * Runs a function inside a transaction.
 * Automatically commits on success, rolls back on error.
 *
 * @param {Function} fn  - function(db) that performs DB operations
 * @returns {*} Return value of fn
 */
function withTransaction(fn) {
  const db = getDb();
  const run = db.transaction(fn);
  return run(db);
}

module.exports = { getDb, withTransaction };