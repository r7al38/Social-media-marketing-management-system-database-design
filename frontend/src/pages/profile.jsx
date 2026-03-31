import { useState } from 'react';
import { User, Shield, Calendar, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input } from '../components/ui/index.jsx';
import { format, parseISO } from 'date-fns';

export default function Profile() {
  const { user }  = useAuth();
  const { toast } = useToast();

  const [pwForm,   setPwForm]   = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw,   setShowPw]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [pwError,  setPwError]  = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');

    if (pwForm.new_password.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      toast({ type: 'success', message: 'Password changed successfully!' });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const joinedAt = user?.created_at
    ? format(parseISO(user.created_at), 'MMMM d, yyyy')
    : '—';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Account Card ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-primary to-purple" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple
                            flex items-center justify-center text-white font-700 text-2xl
                            shadow-lg ring-4 ring-white">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>

          <h2 className="text-xl font-700 text-gray-900">{user?.username}</h2>
          <p className="text-xs text-muted mt-0.5 capitalize">{user?.role || 'admin'}</p>

          {/* Info rows */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
                <User size={14} className="text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted">Username</p>
                <p className="text-sm font-500 text-gray-800">{user?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
              <div className="w-8 h-8 rounded-lg bg-purple-light flex items-center justify-center">
                <Shield size={14} className="text-purple" />
              </div>
              <div>
                <p className="text-[11px] text-muted">Role</p>
                <p className="text-sm font-500 text-gray-800 capitalize">{user?.role || 'admin'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
              <div className="w-8 h-8 rounded-lg bg-success-light flex items-center justify-center">
                <Calendar size={14} className="text-success" />
              </div>
              <div>
                <p className="text-[11px] text-muted">Member Since</p>
                <p className="text-sm font-500 text-gray-800">{joinedAt}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6">
        <h3 className="text-base font-600 text-gray-800 mb-4">Change Password</h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-500 text-gray-600">Current Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Enter current password"
                value={pwForm.current_password}
                onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                           hover:text-gray-600 cursor-pointer"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="password"
              label="New Password"
              placeholder="Min 8 characters"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
            />
            <Input
              type="password"
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            />
          </div>

          {pwError && (
            <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
              <p className="text-xs text-danger font-500">{pwError}</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={saving || !pwForm.current_password || !pwForm.new_password}>
              {saving ? 'Saving…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
