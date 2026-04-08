'use strict';

const cron   = require('node-cron');
const logger = require('./utils/logger');
const { buildWeeklyReport } = require('./reports/reportData');
const { sendWeeklyReport }  = require('./reports/telegramSender');
const { createBackup }      = require('./database/backup');

const REPORT_CRON = process.env.REPORT_CRON || '0 9 * * 0'; // Sunday 09:00 UTC
const BACKUP_CRON = process.env.BACKUP_CRON || '0 2 * * *'; // Daily   02:00 UTC

function startScheduler() {
  // Weekly report
  if (cron.validate(REPORT_CRON)) {
    cron.schedule(REPORT_CRON, async () => {
      logger.info('Scheduler: sending weekly report...');
      try {
        const report = buildWeeklyReport();
        await sendWeeklyReport(report);
      } catch (err) {
        logger.error('Scheduler: report failed:', err.message);
      }
    }, { timezone: 'UTC' });
    logger.info(`Scheduler: report  cron="${REPORT_CRON}"`);
  } else {
    logger.error(`Scheduler: invalid REPORT_CRON="${REPORT_CRON}"`);
  }

  // Daily backup
  if (cron.validate(BACKUP_CRON)) {
    cron.schedule(BACKUP_CRON, async () => {
      logger.info('Scheduler: running backup...');
      try {
        const file = await createBackup();
        logger.info(`Scheduler: backup done — ${file}`);
      } catch (err) {
        logger.error('Scheduler: backup failed:', err.message);
      }
    }, { timezone: 'UTC' });
    logger.info(`Scheduler: backup  cron="${BACKUP_CRON}"`);
  } else {
    logger.error(`Scheduler: invalid BACKUP_CRON="${BACKUP_CRON}"`);
  }
}

module.exports = { startScheduler };
