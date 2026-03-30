import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/authcontext.jsx';
import Layout       from './components/Layout/layout.jsx';
import Login        from './pages/login.jsx';
import Dashboard    from './pages/dashboard.jsx';
import ClientsList  from './pages/Clients/clientslist.jsx';
import ClientProfile from './pages/Clients/clientProfile.jsx';
import Services     from './pages/services.jsx';
import Orders       from './pages/orders.jsx';
import Tasks        from './pages/tasks.jsx';
import Invoices     from './pages/invoices.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted font-medium">Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index                      element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"           element={<Dashboard />} />
        <Route path="clients"             element={<ClientsList />} />
        <Route path="clients/:id/profile" element={<ClientProfile />} />
        <Route path="services"            element={<Services />} />
        <Route path="orders"              element={<Orders />} />
        <Route path="tasks"               element={<Tasks />} />
        <Route path="invoices"            element={<Invoices />} />
        <Route path="*"                   element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}