'use strict';

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');
const { getDb } = require('./connection');
const logger = require('../utils/logger');

const ADMIN_PASSWORD = 'Admin@1234';

function initDatabase() {
  const db         = getDb();
  const schemaPath = path.resolve(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    logger.error(`Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  logger.info('Database schema applied successfully.');

  // ── Ensure admin password is always correct ─────────────────
  // This runs every boot. If the hash in schema.sql was wrong or the
  // user row already existed with a bad hash, this fixes it.
  ensureAdminPassword(db);

  // ── Schema migrations ────────────────────────────────────────
  runMigrations(db);
}

function ensureAdminPassword(db) {
  try {
    const admin = db.prepare("SELECT id, password FROM users WHERE username = 'admin'").get();

    if (!admin) {
      // No admin at all — create one
      const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      db.prepare(
        "INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')"
      ).run(hash);
      logger.info('Admin user created with default password.');
      return;
    }

    // Verify the stored hash is correct
    const isValid = bcrypt.compareSync(ADMIN_PASSWORD, admin.password);
    if (!isValid) {
      // Hash is wrong (placeholder or corrupted) — regenerate
      const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      db.prepare("UPDATE users SET password = ? WHERE username = 'admin'").run(hash);
      logger.info('Admin password hash corrected on startup.');
    } else {
      logger.info('Admin password verified OK.');
    }
  } catch (err) {
    logger.error('ensureAdminPassword failed:', err.message);
  }
}

function runMigrations(db) {
  // Migration: extend clients.type CHECK constraint to include new business types.
  try {
    const row = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='clients'"
    ).get();

    const needsMigration = row && row.sql && (
      (!row.sql.includes('bakery') || !row.sql.includes('cake_shop') || !row.sql.includes('store'))
    );

    if (needsMigration) {
      logger.info('Migration: extending clients.type — recreating table...');
      db.exec(`
        PRAGMA foreign_keys = OFF;

        ALTER TABLE clients RENAME TO _clients_old;

        CREATE TABLE clients (
          id            INTEGER  PRIMARY KEY AUTOINCREMENT,
          business_name TEXT     NOT NULL,
          type          TEXT     NOT NULL
                                 CHECK(type IN ('cafe','restaurant','bakery','cake_shop','store','company','other')),
          phone         TEXT,
          email         TEXT     UNIQUE COLLATE NOCASE,
          address       TEXT,
          notes         TEXT,
          is_active     INTEGER  NOT NULL DEFAULT 1
                                 CHECK(is_active IN (0, 1)),
          created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO clients SELECT * FROM _clients_old;

        DROP TABLE _clients_old;

        PRAGMA foreign_keys = ON;
      `);
      logger.info('Migration: clients.type extended successfully.');
    }
  } catch (err) {
    logger.error('Migration failed (non-fatal):', err.message);
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
