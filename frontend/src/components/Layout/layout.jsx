import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './sidebar.jsx';
import Topbar  from './topbar.jsx';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/clients':   'Clients',
  '/services':  'Services',
  '/orders':    'Orders',
  '/tasks':     'Tasks',
  '/invoices':  'Invoices',
  '/reports':   'Reports',
};

export default function Layout() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || (pathname.includes('/profile') ? 'Client Profile' : 'Dashboard');

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