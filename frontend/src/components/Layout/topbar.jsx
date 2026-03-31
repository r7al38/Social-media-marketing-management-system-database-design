import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationsApi } from '../../api/client.js';

const DOT = { order: 'bg-primary', warning: 'bg-warning', success: 'bg-success', info: 'bg-gray-400' };

const timeAgo = (dt) => {
  const m = Math.floor((Date.now() - new Date(dt).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Topbar({ pageTitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen,  setDropOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [loadingN,  setLoadingN]  = useState(false);
  const dropRef  = useRef();
  const notifRef = useRef();

  const fetchNotifs = useCallback(() => {
    setLoadingN(true);
    notificationsApi.list()
      .then(r => {
        setNotifs(r.data.data?.notifications || []);
        setUnread(r.data.data?.unread        || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingN(false));
  }, []);

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  const openNotifs = () => { setNotifOpen(o => !o); if (!notifOpen) fetchNotifs(); };

  const markAllRead = async () => {
    await notificationsApi.readAll().catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, is_read: 1 })));
    setUnread(0);
  };

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  setDropOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-border flex items-center
                       justify-between px-6 sticky top-0 z-30">
      <h1 className="text-lg font-600 text-gray-800">{pageTitle}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search clients, orders…"
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-surface w-52
                       focus:w-64 transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* ── Bell ─────────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button onClick={openNotifs}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl
                             hover:bg-surface text-gray-500 transition-colors cursor-pointer">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-danger text-white
                               text-[9px] font-700 rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-card-hover
                            border border-border z-50 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-600 text-gray-800">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAllRead}
                          className="text-[11px] font-500 text-primary hover:underline cursor-pointer">
                    Mark all read
                  </button>
                )}
              </div>

              {loadingN ? (
                <div className="py-8 text-center text-xs text-muted">Loading…</div>
              ) : notifs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">No notifications yet</div>
              ) : (
                <ul className="max-h-64 overflow-y-auto">
                  {notifs.map(n => (
                    <li key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                                    border-b border-border/60 last:border-0
                                    ${n.is_read ? 'hover:bg-surface' : 'bg-primary-light/20 hover:bg-primary-light/40'}`}>
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${DOT[n.type] || DOT.info}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-500 text-gray-700">{n.message}</p>
                        <p className="text-[10px] text-muted mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />}
                    </li>
                  ))}
                </ul>
              )}

              <div className="px-4 py-2.5 border-t border-border text-center">
                <button onClick={() => setNotifOpen(false)}
                        className="text-xs font-500 text-primary hover:underline cursor-pointer">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User menu ────────────────────────────────────── */}
        <div className="relative" ref={dropRef}>
          <button onClick={() => setDropOpen(o => !o)}
                  className="flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-xl
                             hover:bg-surface transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple
                            flex items-center justify-center">
              <span className="text-white text-xs font-700">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <span className="text-sm font-500 text-gray-700 hidden sm:block">{user?.username || 'Admin'}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-11 w-44 bg-white rounded-xl shadow-card-hover
                            border border-border z-50 overflow-hidden animate-fade-in">
              <button onClick={() => { setDropOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                                 text-gray-700 hover:bg-surface transition-colors cursor-pointer">
                <User size={14} /> Profile
              </button>
              <button onClick={() => { setDropOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                                 text-gray-700 hover:bg-surface transition-colors cursor-pointer">
                <Settings size={14} /> Settings
              </button>
              <div className="border-t border-border" />
              <button onClick={() => { logout(); navigate('/login'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                                 text-danger hover:bg-danger-light transition-colors cursor-pointer">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
