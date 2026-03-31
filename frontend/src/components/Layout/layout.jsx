import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar  from './Topbar.jsx';

const TITLES = {
  '/dashboard':     'Dashboard',
  '/clients':       'Clients',
  '/services':      'Services',
  '/orders':        'Orders',
  '/tasks':         'Tasks',
  '/invoices':      'Invoices',
  '/reports':       'Reports',
  '/profile':       'My Profile',
  '/settings':      'Settings',
  '/notifications': 'Notifications',
};

export default function Layout() {
  const { pathname } = useLocation();

  let title = TITLES[pathname];
  if (!title) {
    if (pathname.startsWith('/clients/')) title = 'Client Profile';
    else title = 'Dashboard';
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar pageTitle={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
