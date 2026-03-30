'use strict';

require('dotenv').config();
const path   = require('path');
const fs     = require('fs');
const { getDb } = require('./connection');
const logger = require('../utils/logger');

const BACKUP_DIR      = process.env.BACKUP_DIR      || './database/backups';
const BACKUP_MAX_FILES = Number(process.env.BACKUP_MAX_FILES) || 30;

/**
 * Creates a timestamped SQLite backup using the SQLite Online Backup API.
 * This is safe to call while the database is in use.
 */
async function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.resolve(BACKUP_DIR, `smm-backup-${timestamp}.db`);

  const db = getDb();
  await db.backup(backupFile);
  logger.info(`Backup created: ${backupFile}`);

  // Prune old backups — keep only the most recent N
  pruneBackups();

  return backupFile;
}

function pruneBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('smm-backup-') && f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (files.length > BACKUP_MAX_FILES) {
    files.slice(BACKUP_MAX_FILES).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      logger.info(`Old backup pruned: ${f.name}`);
    });
  }
}

// Allow running directly: node database/backup.js
if (require.main === module) {
  createBackup()
    .then(f => { console.log(`Backup OK: ${f}`); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = { createBackup };