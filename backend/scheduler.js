'use strict';

const cron   = require('node-cron');
const logger = require('../utils/logger');
const { buildWeeklyReport } = require('../reports/reportData');
const { sendWeeklyReport }  = require('../reports/telegramSender');
const { createBackup }      = require('../database/backup');

// Cron defaults:
//   Report — every Sunday at 09:00
//   Backup — every day   at 02:00
const REPORT_CRON = process.env.REPORT_CRON || '0 9 * * 0';
const BACKUP_CRON = process.env.BACKUP_CRON || '0 2 * * *';

function startScheduler() {
  // ── Weekly Telegram report ──────────────────────────────
  if (!cron.validate(REPORT_CRON)) {
    logger.error(`Invalid REPORT_CRON expression: "${REPORT_CRON}"`);
  } else {
    cron.schedule(REPORT_CRON, async () => {
      logger.info('Scheduler: Building weekly report…');
      try {
        const report = buildWeeklyReport();
        await sendWeeklyReport(report);
      } catch (err) {
        logger.error('Scheduler: Weekly report failed:', err);
      }
    }, { timezone: 'UTC' });

    logger.info(`Scheduler: Weekly report scheduled — cron "${REPORT_CRON}"`);
  }

  // ── Daily backup ────────────────────────────────────────
  if (!cron.validate(BACKUP_CRON)) {
    logger.error(`Invalid BACKUP_CRON expression: "${BACKUP_CRON}"`);
  } else {
    cron.schedule(BACKUP_CRON, async () => {
      logger.info('Scheduler: Running daily backup…');
      try {
        const file = await createBackup();
        logger.info(`Scheduler: Backup complete — ${file}`);
      } catch (err) {
        logger.error('Scheduler: Backup failed:', err);
      }
    }, { timezone: 'UTC' });

    logger.info(`Scheduler: Daily backup scheduled — cron "${BACKUP_CRON}"`);
  }
}

module.exports = { startScheduler };