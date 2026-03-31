import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, ShoppingCart, TrendingUp,
  CheckCircle2, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Cell,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard, Badge, Spinner } from '../components/ui/index.jsx';
import { reportsApi } from '../api/client.js';
import { egp } from '../utils/currency.js';

const STATUS_BAR_COLOR = {
  pending:     '#F59E0B',
  in_progress: '#60A5FA',
  completed:   '#22C55E',
  cancelled:   '#EF4444',
};

const STATUS_VARIANT = {
  pending: 'warning', in_progress: 'in_progress',
  completed: 'completed', cancelled: 'cancelled',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    reportsApi.dashboard()
      .then(r => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-600 text-gray-500">Could not load dashboard data.</p>
      <button onClick={() => window.location.reload()}
              className="mt-3 text-xs text-primary hover:underline cursor-pointer">
        Retry
      </button>
    </div>
  );

  const { kpi, revenueChart, ordersByStatus, recentOrders, activeTasks } = data;
  const weekTotal = revenueChart.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={kpi.totalClients}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Active Subscriptions"
          value={kpi.activeServices}
          icon={<Briefcase size={20} />}
          color="purple"
        />
        <StatCard
          title="Orders In Progress"
          value={kpi.ordersInProgress}
          icon={<ShoppingCart size={20} />}
          color="amber"
        />
        <StatCard
          title="Revenue This Week"
          value={egp(kpi.weekRevenue)}
          icon={<TrendingUp size={20} />}
          color="green"
        />
      </div>

      {/* ── Charts ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue area chart — 2 cols */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-600 text-gray-800">Weekly Revenue</h3>
              <p className="text-xs text-muted mt-0.5">Paid invoices — last 7 days</p>
            </div>
            <span className="text-base font-700 text-primary">{egp(weekTotal)}</span>
          </div>

          {weekTotal === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-xs text-muted">
              No paid invoices this week
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueChart} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#60A5FA" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                       tickFormatter={v => v === 0 ? '0' : `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }}
                  formatter={(v) => [egp(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#60A5FA" strokeWidth={2.5}
                      fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#60A5FA' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by status bar chart */}
        <div className="card">
          <h3 className="text-sm font-600 text-gray-800 mb-1">Orders Overview</h3>
          <p className="text-xs text-muted mb-4">Current status breakdown</p>

          {ordersByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-xs text-muted">
              No orders yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersByStatus} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ordersByStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_BAR_COLOR[entry.status] || '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-600 text-gray-800">Recent Orders</h3>
            <button onClick={() => navigate('/orders')}
                    className="text-xs text-primary font-500 hover:underline flex items-center gap-1 cursor-pointer">
              View all <ArrowRight size={12} />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">No orders yet</p>
          ) : (
            <ul className="space-y-1.5">
              {recentOrders.map(order => (
                <li key={order.id}
                    onClick={() => navigate('/orders')}
                    className="flex items-center justify-between p-3 rounded-xl
                               hover:bg-surface transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                      <ShoppingCart size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-500 text-gray-800 truncate max-w-[140px]">
                        {order.service_name}
                      </p>
                      <p className="text-[11px] text-muted">{order.business_name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <Badge variant={STATUS_VARIANT[order.status] || 'default'}>
                      {order.status?.replace('_', ' ')}
                    </Badge>
                    <p className="text-[11px] text-muted mt-1">{egp(order.total_price)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-600 text-gray-800">Active Tasks</h3>
            <button onClick={() => navigate('/tasks')}
                    className="text-xs text-primary font-500 hover:underline flex items-center gap-1 cursor-pointer">
              View board <ArrowRight size={12} />
            </button>
          </div>

          {activeTasks.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">No active tasks</p>
          ) : (
            <ul className="space-y-1.5">
              {activeTasks.map(task => (
                <li key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="flex items-center justify-between p-3 rounded-xl
                               hover:bg-surface transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-light flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} className="text-purple" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-500 text-gray-800 truncate max-w-[160px]">{task.title}</p>
                      <p className="text-[11px] text-muted">{task.business_name}</p>
                    </div>
                  </div>
                  <Badge variant="in_progress">in progress</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
