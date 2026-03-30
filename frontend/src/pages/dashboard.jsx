import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, ShoppingCart, DollarSign,
  Clock, CheckCircle2, AlertCircle, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard, Badge, Spinner } from '../components/ui/index.jsx';
import { clientsApi, ordersApi, tasksApi } from '../api/client.js';

// ── Mock chart data ─────────────────────────────────────────
const revenueData = [
  { day: 'Mon', revenue: 1200 }, { day: 'Tue', revenue: 1900 },
  { day: 'Wed', revenue: 1500 }, { day: 'Thu', revenue: 2300 },
  { day: 'Fri', revenue: 2100 }, { day: 'Sat', revenue: 2800 },
  { day: 'Sun', revenue: 1700 },
];
const ordersData = [
  { name: 'Pending',     value: 8,  fill: '#F59E0B' },
  { name: 'In Progress', value: 14, fill: '#60A5FA' },
  { name: 'Completed',   value: 31, fill: '#22C55E' },
  { name: 'Cancelled',   value: 3,  fill: '#EF4444' },
];

const STATUS_COLORS = {
  pending: 'warning', in_progress: 'in_progress', completed: 'completed',
  cancelled: 'cancelled', todo: 'todo', done: 'done',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [orders,  setOrders]  = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      clientsApi.list({ limit: 5 }),
      ordersApi.list({ limit: 6 }),
      tasksApi.list({ limit: 5, status: 'in_progress' }),
    ])
      .then(([c, o, t]) => {
        setClients(c.data.data || []);
        setOrders(o.data.data  || []);
        setTasks(t.data.data   || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const activeOrders = orders.filter(o => o.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Clients"      value={clients.length || '0'}   icon={<Users size={20} />}        color="blue"   trend={12} />
        <StatCard title="Active Services"    value="18"                       icon={<Briefcase size={20} />}    color="purple" trend={5} />
        <StatCard title="Orders In Progress" value={activeOrders || '0'}      icon={<ShoppingCart size={20} />} color="amber" />
        <StatCard title="Weekly Revenue"     value="$6,840"                   icon={<DollarSign size={20} />}   color="green"  trend={8} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue chart — takes 2 cols */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-600 text-gray-800">Weekly Revenue</h3>
              <p className="text-xs text-muted mt-0.5">Last 7 days performance</p>
            </div>
            <span className="text-lg font-700 text-primary">$6,840</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#60A5FA" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }}
                formatter={(v) => [`$${v}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#60A5FA" strokeWidth={2.5}
                    fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#60A5FA' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by status */}
        <div className="card">
          <h3 className="text-sm font-600 text-gray-800 mb-1">Orders Overview</h3>
          <p className="text-xs text-muted mb-5">Status breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {ordersData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-600 text-gray-800">Recent Orders</h3>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs text-primary font-500 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          {orders.length === 0
            ? <p className="text-xs text-muted text-center py-8">No orders yet</p>
            : (
              <ul className="space-y-2">
                {orders.slice(0, 5).map(order => (
                  <li key={order.id}
                      className="flex items-center justify-between p-3 rounded-xl
                                 hover:bg-surface transition-colors cursor-pointer"
                      onClick={() => navigate('/orders')}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
                        <ShoppingCart size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-500 text-gray-800 truncate max-w-[140px]">
                          {order.service_name || 'Service'}
                        </p>
                        <p className="text-[11px] text-muted">{order.business_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={STATUS_COLORS[order.status] || 'default'}>
                        {order.status?.replace('_', ' ')}
                      </Badge>
                      <p className="text-[11px] text-muted mt-1">${order.total_price}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        {/* Active Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-600 text-gray-800">Active Tasks</h3>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs text-primary font-500 hover:underline flex items-center gap-1"
            >
              View board <ArrowRight size={12} />
            </button>
          </div>
          {tasks.length === 0
            ? <p className="text-xs text-muted text-center py-8">No active tasks</p>
            : (
              <ul className="space-y-2">
                {tasks.slice(0, 5).map(task => (
                  <li key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl
                                 hover:bg-surface transition-colors cursor-pointer"
                      onClick={() => navigate('/tasks')}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-light flex items-center justify-center">
                        <CheckCircle2 size={14} className="text-purple" />
                      </div>
                      <div>
                        <p className="text-xs font-500 text-gray-800 truncate max-w-[160px]">{task.title}</p>
                        <p className="text-[11px] text-muted">{task.business_name}</p>
                      </div>
                    </div>
                    <Badge variant={task.status === 'done' ? 'done' : 'in_progress'}>
                      {task.status?.replace('_', ' ')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>
    </div>
  );
}