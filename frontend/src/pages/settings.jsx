import { useState } from 'react';
import { Bell, Database, Shield, Info } from 'lucide-react';
import { adminApi } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/ui/index.jsx';

function Section({ icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="text-base font-600 text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-500 text-gray-700">{label}</p>
        {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast }      = useToast();
  const [backingUp,    setBackingUp]    = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  const triggerBackup = async () => {
    setBackingUp(true);
    try {
      const res = await adminApi.backupNow();
      toast({ type: 'success', message: `Backup created: ${res.data.data?.file || 'done'}` });
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.message || 'Backup failed' });
    } finally { setBackingUp(false); }
  };

  const sendReport = async () => {
    setSendingReport(true);
    try {
      await adminApi.reportSend();
      toast({ type: 'success', message: 'Report sent to Telegram!' });
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.message || 'Could not send report. Check Telegram config in .env.' });
    } finally { setSendingReport(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Backup ────────────────────────────────────────── */}
      <Section icon={<Database size={15} />} title="Database & Backup">
        <SettingRow
          label="Manual Backup"
          description="Create a backup of the database right now. Stored in database/backups/"
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={triggerBackup}
            disabled={backingUp}
          >
            {backingUp ? 'Backing up…' : 'Backup Now'}
          </Button>
        </SettingRow>

        <SettingRow
          label="Automatic Backup Schedule"
          description="Runs every day at 02:00 UTC. Change via BACKUP_CRON secret in Replit."
        >
          <span className="text-xs font-600 bg-success-light text-green-700 px-2.5 py-1 rounded-full">
            Active
          </span>
        </SettingRow>

        <SettingRow
          label="Max Backup Files"
          description="Older backups are pruned automatically. Default: 30 files."
        >
          <span className="text-xs text-muted">
            {import.meta.env.VITE_BACKUP_MAX || '30'} files max
          </span>
        </SettingRow>
      </Section>

      {/* ── Telegram ──────────────────────────────────────── */}
      <Section icon={<Bell size={15} />} title="Telegram Reports">
        <SettingRow
          label="Send Weekly Report Now"
          description="Sends the full weekly report to the configured Telegram chat immediately."
        >
          <Button
            size="sm"
            onClick={sendReport}
            disabled={sendingReport}
          >
            {sendingReport ? 'Sending…' : 'Send Report'}
          </Button>
        </SettingRow>

        <SettingRow
          label="Report Schedule"
          description="Sent automatically every Sunday at 09:00 UTC. Change via REPORT_CRON secret."
        >
          <span className="text-xs font-600 bg-primary-light text-primary px-2.5 py-1 rounded-full">
            Every Sunday
          </span>
        </SettingRow>

        <SettingRow
          label="Telegram Configuration"
          description="Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Replit Secrets (padlock icon)."
        >
          <span className="text-xs text-muted">Via Replit Secrets</span>
        </SettingRow>
      </Section>

      {/* ── Security ──────────────────────────────────────── */}
      <Section icon={<Shield size={15} />} title="Security">
        <SettingRow
          label="JWT Session Duration"
          description="Sessions expire automatically after this period. Change via JWT_EXPIRES_IN secret."
        >
          <span className="text-xs font-600 bg-surface text-gray-700 px-2.5 py-1 rounded-full border border-border">
            8 hours
          </span>
        </SettingRow>

        <SettingRow
          label="Social Account Passwords"
          description="Stored with AES-256 encryption. Key set via ENCRYPTION_KEY secret."
        >
          <span className="text-xs font-600 bg-success-light text-green-700 px-2.5 py-1 rounded-full">
            Encrypted
          </span>
        </SettingRow>

        <SettingRow
          label="Change Password"
          description="Update your admin account password from the Profile page."
        >
          <a href="/profile"
             className="text-xs font-500 text-primary hover:underline cursor-pointer">
            Go to Profile →
          </a>
        </SettingRow>
      </Section>

      {/* ── Info ─────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex items-start gap-3">
        <Info size={15} className="text-muted mt-0.5 shrink-0" />
        <p className="text-xs text-muted leading-relaxed">
          All environment variables (JWT_SECRET, ENCRYPTION_KEY, TELEGRAM_BOT_TOKEN, etc.)
          are managed via <strong className="font-600 text-gray-600">Replit Secrets</strong> — the padlock icon
          in the left sidebar. Never commit these to GitHub.
        </p>
      </div>
    </div>
  );
}
