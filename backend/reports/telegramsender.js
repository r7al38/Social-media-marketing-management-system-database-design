'use strict';

const TelegramBot = require('node-telegram-bot-api');
const logger      = require('../utils/logger');

let _bot = null;

function getBot() {
  if (_bot) return _bot;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your_bot_token_here') return null;
  try {
    _bot = new TelegramBot(token);
    return _bot;
  } catch {
    return null;
  }
}

async function sendWeeklyReport(report) {
  const bot    = getBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!bot) {
    logger.warn('Telegram: BOT_TOKEN not configured — skipping.');
    return false;
  }
  if (!chatId || chatId === 'your_chat_id_here') {
    logger.warn('Telegram: CHAT_ID not configured — skipping.');
    return false;
  }

  try {
    await bot.sendMessage(chatId, formatReport(report), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    logger.info('Telegram: Report sent.');
    return true;
  } catch (err) {
    logger.error('Telegram send failed:', err.message);
    return false;
  }
}

function formatReport(r) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const egp = (n) => `EGP ${Number(n || 0).toFixed(2)}`;
  const num = (n) => Number(n || 0);

  let msg = '';
  msg += `📊 <b>Weekly SMM Report</b>\n<i>${date}</i>\n${'─'.repeat(25)}\n\n`;

  msg += `👥 <b>Clients</b>\n`;
  msg += `  Total: <b>${num(r.clients.total)}</b>`;
  if (num(r.clients.new) > 0) msg += `  +${r.clients.new} new`;
  msg += `\n\n`;

  msg += `🛒 <b>Orders</b>\n`;
  msg += `  New this week: <b>${num(r.orders.newThisWeek)}</b>\n`;
  msg += `  In progress:   <b>${num(r.orders.in_progress)}</b>\n`;
  msg += `  Completed:     <b>${num(r.orders.completed)}</b>\n\n`;

  msg += `📈 <b>Revenue</b>\n`;
  msg += `  Collected (week): <b>${egp(r.orders.week_revenue)}</b>\n`;
  msg += `  Outstanding:      <b>${egp(r.invoices.unpaid_total)}</b>`;
  if (num(r.invoices.unpaid_count) > 0) msg += ` (${r.invoices.unpaid_count} invoices)`;
  msg += `\n`;
  if (num(r.invoices.overdue_count) > 0) {
    msg += `  ⚠️ Overdue invoices: <b>${r.invoices.overdue_count}</b>\n`;
  }
  msg += `\n`;

  msg += `✅ <b>Tasks</b>\n`;
  msg += `  Done this week: <b>${num(r.tasks.completed_this_week)}</b>\n`;
  msg += `  In progress:    <b>${num(r.tasks.in_progress)}</b>\n`;
  if (num(r.tasks.overdue) > 0) msg += `  ⚠️ Overdue: <b>${r.tasks.overdue}</b>\n`;
  msg += `\n`;

  if (r.recentCompleted?.length > 0) {
    msg += `🎉 <b>Completed This Week</b>\n`;
    r.recentCompleted.forEach(o => {
      msg += `  • ${o.business_name} — ${o.service_name} (${egp(o.total_price)})\n`;
    });
    msg += `\n`;
  }

  if (r.topClients?.length > 0) {
    msg += `🏆 <b>Top Clients</b>\n`;
    r.topClients.forEach((c, i) => {
      msg += `  ${['🥇','🥈','🥉'][i] || '•'} ${c.business_name} — ${c.order_count} orders\n`;
    });
    msg += `\n`;
  }

  msg += `${'─'.repeat(25)}\n<i>SMM Dashboard</i>`;
  return msg;
}

module.exports = { sendWeeklyReport, formatReport };
