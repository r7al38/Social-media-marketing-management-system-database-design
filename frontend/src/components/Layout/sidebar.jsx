import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, ShoppingCart,
  CheckSquare, FileText, BarChart3, Zap,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients',   icon: Users,           label: 'Clients' },
  { to: '/services',  icon: Briefcase,       label: 'Services' },
  { to: '/orders',    icon: ShoppingCart,    label: 'Orders' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { to: '/invoices',  icon: FileText,        label: 'Invoices' },
  { to: '/reports',   icon: BarChart3,       label: 'Reports' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border shadow-sidebar
                      flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
          <Zap size={18} className="text-white" fill="white" />
        </div>
        <div>
          <p className="text-sm font-700 text-gray-900 leading-none">SMM Panel</p>
          <p className="text-[10px] text-muted mt-0.5">Social Media Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-600 text-gray-400 uppercase tracking-widest px-3 mb-2">
          Main Menu
        </p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="bg-primary-light rounded-xl p-3">
          <p className="text-xs font-600 text-primary">Pro Tip</p>
          <p className="text-[11px] text-blue-600 mt-1 leading-relaxed">
            Click any client's name to open their full control panel.
          </p>
        </div>
      </div>
    </aside>
  );
}