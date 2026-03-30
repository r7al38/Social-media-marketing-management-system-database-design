import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../context/authcontext.jsx';

export default function Topbar({ pageTitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen,  setDropOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropRef  = useRef();
  const notifRef = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  setDropOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const NOTIFS = [
    { id: 1, msg: 'New order from Café Latte',  time: '2m ago',  type: 'order' },
    { id: 2, msg: 'Invoice #INV-0042 is overdue', time: '1h ago', type: 'warning' },
    { id: 3, msg: 'Task completed by staff',     time: '3h ago',  type: 'success' },
  ];
  const dotColor = { order: 'bg-primary', warning: 'bg-warning', success: 'bg-success' };

  return (
    <header className="h-16 bg-white border-b border-border flex items-center
                       justify-between px-6 sticky top-0 z-30">
      {/* Left: page title */}
      <h1 className="text-lg font-600 text-gray-800">{pageTitle}</h1>

      {/* Right: search + actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search clients, orders…"
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-xl
                       bg-surface w-52 focus:w-64 transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl
                       hover:bg-surface text-gray-500 transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-card-hover
                            border border-border z-50 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-600 text-gray-800">Notifications</p>
                <span className="badge bg-primary-light text-primary">{NOTIFS.length} new</span>
              </div>
              <ul>
                {NOTIFS.map(n => (
                  <li key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-surface
                                 cursor-pointer transition-colors border-b border-border/60 last:border-0">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotColor[n.type]}`} />
                    <div>
                      <p className="text-xs font-500 text-gray-700">{n.msg}</p>
                      <p className="text-[10px] text-muted mt-0.5">{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2.5 text-center">
                <button className="text-xs font-500 text-primary hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setDropOpen(o => !o)}
            className="flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-xl
                       hover:bg-surface transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple
                            flex items-center justify-center">
              <span className="text-white text-xs font-700">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <span className="text-sm font-500 text-gray-700 hidden sm:block">
              {user?.username || 'Admin'}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-11 w-44 bg-white rounded-xl shadow-card-hover
                            border border-border z-50 overflow-hidden animate-fade-in">
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                                 text-gray-700 hover:bg-surface transition-colors">
                <User size={14} /> Profile
              </button>
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                                 text-gray-700 hover:bg-surface transition-colors">
                <Settings size={14} /> Settings
              </button>
              <div className="border-t border-border" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                           text-danger hover:bg-danger-light transition-colors"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}