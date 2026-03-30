'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const { authenticate, authorize } = require('../middleware/auth');
const { success, error }          = require('../utils/response');
const { buildWeeklyReport }       = require('../reports/reportdata');
const { sendWeeklyReport, formatReport } = require('../reports/telegramsender');
const { createBackup }            = require('../database/backup');
const logger                      = require('../utils/logger');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// ── GET /api/admin/report/preview ───────────────────────────
// Returns the formatted report text without sending it
router.get('/report/preview', (req, res) => {
  try {
    const report = buildWeeklyReport();
    const text   = formatReport(report);
    return success(res, { report, text });
  } catch (err) {
    logger.error(err);
    return error(res, 'Failed to build report', 500);
  }
});

// ── POST /api/admin/report/send ─────────────────────────────
// Builds and sends the report to Telegram immediately
router.post('/report/send', async (req, res) => {
  try {
    const report = buildWeeklyReport();
    const sent   = await sendWeeklyReport(report);
    if (!sent) {
      return error(res, 'Telegram not configured or send failed. Check BOT_TOKEN and CHAT_ID in .env', 400);
    }
    return success(res, null, 'Report sent to Telegram successfully');
  } catch (err) {
    logger.error(err);
    return error(res, 'Failed to send report', 500);
  }
});

// ── POST /api/admin/backup ──────────────────────────────────
// Triggers a manual backup immediately
router.post('/backup', async (req, res) => {
  try {
    const file = await createBackup();
    return success(res, { file: path.basename(file) }, 'Backup created successfully');
  } catch (err) {
    logger.error(err);
    return error(res, 'Backup failed', 500);
  }
});

// ── GET /api/admin/backups ──────────────────────────────────
// Lists all backup files with metadata
router.get('/backups', (req, res) => {
  const backupDir = process.env.BACKUP_DIR || './database/backups';
  const absDir    = path.resolve(backupDir);

  if (!fs.existsSync(absDir)) {
    return success(res, []);
  }

  const files = fs.readdirSync(absDir)
    .filter(f => f.startsWith('smm-backup-') && f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(absDir, f));
      return {
        name:      f,
        size_kb:   Math.round(stat.size / 1024),
        created_at: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return success(res, files);
});

// ── DELETE /api/admin/backups/:name ────────────────────────
// Deletes a specific backup file
router.delete('/backups/:name', (req, res) => {
  const backupDir = process.env.BACKUP_DIR || './database/backups';
  const fileName  = path.basename(req.params.name); // strip any path traversal
  const filePath  = path.resolve(backupDir, fileName);

  if (!fileName.startsWith('smm-backup-') || !fileName.endsWith('.db')) {
    return error(res, 'Invalid backup filename', 400);
  }
  if (!fs.existsSync(filePath)) {
    return error(res, 'Backup file not found', 404);
  }

  fs.unlinkSync(filePath);
  return success(res, null, 'Backup deleted');
});

module.exports = router;