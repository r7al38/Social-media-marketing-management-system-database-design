import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout          from './components/Layout/Layout.jsx';
import Login           from './pages/Login.jsx';
import Dashboard       from './pages/Dashboard.jsx';
import ClientsList     from './pages/Clients/ClientsList.jsx';
import ClientProfile   from './pages/Clients/ClientProfile.jsx';
import Services        from './pages/Services.jsx';
import Orders          from './pages/Orders.jsx';
import Tasks           from './pages/Tasks.jsx';
import Invoices        from './pages/Invoices.jsx';
import Profile         from './pages/Profile.jsx';
import SettingsPage    from './pages/Settings.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
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
        <Route index                       element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"            element={<Dashboard />} />
        <Route path="clients"              element={<ClientsList />} />
        <Route path="clients/:id/profile"  element={<ClientProfile />} />
        <Route path="services"             element={<Services />} />
        <Route path="orders"               element={<Orders />} />
        <Route path="tasks"                element={<Tasks />} />
        <Route path="invoices"             element={<Invoices />} />
        <Route path="profile"              element={<Profile />} />
        <Route path="settings"             element={<SettingsPage />} />
        <Route path="*"                    element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
