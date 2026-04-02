import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, Edit2, Plus, MoreVertical,
  Facebook, Instagram, Globe, Eye, EyeOff, Trash2,
  ShoppingCart, CheckSquare, FileText,
  ChevronDown, ChevronRight,
  DollarSign, Activity, Clock, Zap,
} from 'lucide-react';
import { format, parseISO, isPast, formatDistanceToNow } from 'date-fns';

import { clientsApi, subscriptionsApi, socialApi, ordersApi, tasksApi, servicesApi } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { egp }      from '../../utils/currency.js';
import { Badge, Button, ProgressBar, Modal, Input, Select, Textarea, EmptyState, Spinner } from '../../components/ui/index.jsx';
import KanbanBoard from '../../components/Kanban/KanbanBoard.jsx';

const fmt     = (d) => d ? format(parseISO(d), 'MMM d, yyyy') : '—';
const fromNow = (d) => d ? formatDistanceToNow(parseISO(d), { addSuffix: true }) : null;

const PLATFORM_META = {
  Facebook:  { icon: <Facebook  size={15} />, color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
  Instagram: { icon: <Instagram size={15} />, color: 'text-pink-500',   bg: 'bg-pink-50',   border: 'border-pink-100' },
  TikTok:    { icon: <span className="font-black text-[11px]">TK</span>, color: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-200' },
  Twitter:   { icon: <Globe size={15} />,     color: 'text-sky-500',    bg: 'bg-sky-50',    border: 'border-sky-100' },
  YouTube:   { icon: <Globe size={15} />,     color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' },
  Snapchat:  { icon: <Globe size={15} />,     color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-100' },
};

const CATEGORY_META = {
  ads:        { label: 'Ads',        bar: 'bg-purple',  pill: 'bg-purple-light text-purple-dark' },
  growth:     { label: 'Growth',     bar: 'bg-success', pill: 'bg-success-light text-green-700' },
  security:   { label: 'Security',   bar: 'bg-danger',  pill: 'bg-danger-light text-red-700' },
  management: { label: 'Management', bar: 'bg-primary', pill: 'bg-primary-light text-primary' },
};

const TABS = [
  { key: 'overview',  label: 'Overview',        icon: <Activity    size={14} /> },
  { key: 'services',  label: 'Services',         icon: <Zap         size={14} /> },
  { key: 'accounts',  label: 'Social Accounts',  icon: <Globe       size={14} /> },
  { key: 'orders',    label: 'Orders',           icon: <ShoppingCart size={14} /> },
  { key: 'tasks',     label: 'Tasks',            icon: <CheckSquare size={14} /> },
  { key: 'invoices',  label: 'Invoices',         icon: <FileText    size={14} /> },
];

// ─────────────────────────────────────────────────────────────
export default function ClientProfile() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState(null);
  const [tab,     setTab]     = useState('overview');
  const [loading, setLoading] = useState(true);

  const loadProfile = () => {
    setLoading(true);
    clientsApi.profile(id)
      .then(res => setProfile(res.data.data))
      .catch(() => toast({ type: 'error', message: 'Failed to load client profile' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProfile(); }, [id]);

  if (loading) return <Spinner />;
  if (!profile) return <EmptyState title="Client not found" icon="🔍" />;

  const { client, summary, services, social_accounts, orders, invoices, tasks } = profile;

  const kanban = {
    todo:        tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done:        tasks.filter(t => t.status === 'done'),
  };

  const handleTaskStatus = async (taskId, newStatus) => {
    try {
      await tasksApi.setStatus(taskId, { status: newStatus });
      toast({ type: 'success', message: 'Task moved' });
      loadProfile();
    } catch { toast({ type: 'error', message: 'Failed to update task' }); }
  };

  const typeGradient = {
    cafe:       'from-amber-400 to-orange-500',
    restaurant: 'from-orange-400 to-red-500',
    bakery:     'from-yellow-400 to-amber-500',
    cake_shop:  'from-pink-400 to-rose-500',
    store:      'from-teal-400 to-cyan-500',
    company:    'from-[#60A5FA] to-[#A78BFA]',
    other:      'from-gray-400 to-gray-600',
  }[client.type] || 'from-[#60A5FA] to-[#A78BFA]';

  return (
    <div className="max-w-6xl mx-auto space-y-5 page-enter">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors font-500"
        >
          <ArrowLeft size={13} /> Clients
        </button>
        <ChevronRight size={12} className="text-gray-300" />
        <span className="text-xs font-600 text-gray-700">{client.business_name}</span>
      </div>

      {/* ── Hero Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Banner */}
        <div className={`h-28 bg-gradient-to-r ${typeGradient} relative`}>
          <div className="absolute inset-0"
               style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-9 mb-5">
            <div className={`w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${typeGradient}
                            flex items-center justify-center text-white font-700 text-3xl
                            shadow-lg ring-[3px] ring-white shrink-0`}>
              {client.business_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Button variant="secondary" size="sm" icon={<Edit2 size={12} />}>Edit</Button>
              <button className="w-8 h-8 flex items-center justify-center rounded-xl border border-border
                                 hover:bg-surface text-gray-400 transition-colors">
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          {/* Name + status */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <h1 className="text-[22px] font-700 text-gray-900 leading-tight">{client.business_name}</h1>
            <span className={`text-[11px] font-600 px-2.5 py-0.5 rounded-full uppercase tracking-wide
              ${client.type === 'cafe' ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : client.type === 'restaurant' ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-primary-light text-primary border border-primary/20'}`}>
              {client.type}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-600 px-2.5 py-0.5 rounded-full
                             bg-success-light text-green-700 border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Active
            </span>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap gap-4 mb-6">
            {client.phone && (
              <a href={`tel:${client.phone}`}
                 className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center
                                group-hover:bg-primary-light group-hover:border-primary/20 transition-colors">
                  <Phone size={12} className="group-hover:text-primary transition-colors" />
                </div>
                {client.phone}
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`}
                 className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center
                                group-hover:bg-primary-light group-hover:border-primary/20 transition-colors">
                  <Mail size={12} className="group-hover:text-primary transition-colors" />
                </div>
                {client.email}
              </a>
            )}
            {client.address && (
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center">
                  <MapPin size={12} />
                </div>
                {client.address}
              </span>
            )}
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border border-border rounded-xl overflow-hidden">
            {[
              { label: 'Total Orders',   value: summary.total_orders || 0,         color: 'text-primary',  sub: `${summary.completed_orders || 0} completed` },
              { label: 'Active Orders',  value: summary.active_orders || 0,        color: 'text-purple',   sub: 'in progress' },
              { label: 'Open Tasks',     value: summary.open_tasks || 0,           color: 'text-warning',  sub: 'need attention' },
              { label: 'Outstanding',    value: currency(summary.unpaid_amount),   color: 'text-danger',   sub: `${summary.unpaid_invoices || 0} unpaid` },
            ].map(k => (
              <div key={k.label} className="px-5 py-4 text-center bg-surface/60 hover:bg-white transition-colors">
                <p className={`text-xl font-700 ${k.color}`}>{k.value}</p>
                <p className="text-xs font-500 text-gray-600 mt-0.5">{k.label}</p>
                <p className="text-[10px] text-muted mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Panel ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-500 whitespace-nowrap
                          transition-all border-b-2 -mb-px
                          ${tab === t.key
                            ? 'border-primary text-primary bg-primary-light/30'
                            : 'border-transparent text-muted hover:text-gray-700 hover:bg-surface'}`}
            >
              <span className={tab === t.key ? 'text-primary' : 'text-gray-300'}>{t.icon}</span>
              {t.label}
              {t.key === 'tasks'    && summary.open_tasks     > 0 && <Pill n={summary.open_tasks} />}
              {t.key === 'invoices' && summary.unpaid_invoices > 0 && <Pill n={summary.unpaid_invoices} danger />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[440px]">
          {tab === 'overview'  && <OverviewTab  summary={summary} client={client} orders={orders} />}
          {tab === 'services'  && <ServicesTab  services={services} clientId={id} onRefresh={loadProfile} />}
          {tab === 'accounts'  && <AccountsTab  accounts={social_accounts} clientId={id} onRefresh={loadProfile} />}
          {tab === 'orders'    && <OrdersTab    orders={orders} clientId={id} onRefresh={loadProfile} />}
          {tab === 'tasks'     && <TasksTab     kanban={kanban} clientId={id} onStatusChange={handleTaskStatus} onRefresh={loadProfile} />}
          {tab === 'invoices'  && <InvoicesTab  invoices={invoices} summary={summary} />}
        </div>
      </div>
    </div>
  );
}

function Pill({ n, danger }) {
  return (
    <span className={`text-[10px] font-700 min-w-[18px] h-[18px] px-1 rounded-full
                      inline-flex items-center justify-center
                      ${danger ? 'bg-danger text-white' : 'bg-primary text-white'}`}>{n}</span>
  );
}

function SectionHead({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-700 text-gray-400 uppercase tracking-widest">{title}</p>
      {action}
    </div>
  );
}

function BlankSlate({ icon, text, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center
                      justify-center text-gray-300 mb-3">
        {icon}
      </div>
      <p className="text-sm font-600 text-gray-500">{text}</p>
      {sub && <p className="text-xs text-muted mt-1 max-w-xs text-center">{sub}</p>}
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, saving, disabled, label }) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-border mt-1">
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button onClick={onConfirm} disabled={saving || disabled}>
        {saving ? 'Saving…' : label}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────
function OverviewTab({ summary, client, orders }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Recent orders — 2 cols */}
      <div className="lg:col-span-2">
        <SectionHead title="Recent Orders" />
        {orders.length === 0
          ? <BlankSlate icon={<ShoppingCart size={20} />} text="No orders yet" />
          : (
            <div className="space-y-2.5">
              {orders.slice(0, 5).map(o => {
                const pct = o.progress_percentage || 0;
                return (
                  <div key={o.id}
                       className="flex items-center gap-4 p-4 rounded-xl border border-border
                                  hover:border-primary/30 hover:bg-primary-light/10 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center
                                    justify-center shrink-0">
                      <ShoppingCart size={15} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-600 text-gray-800 truncate">{o.service_name}</p>
                        <span className={`text-[11px] font-600 px-2.5 py-0.5 rounded-full shrink-0
                          ${o.status === 'completed' ? 'bg-success-light text-green-700'
                          : o.status === 'in_progress' ? 'bg-primary-light text-primary'
                          : o.status === 'cancelled' ? 'bg-gray-100 text-gray-500'
                          : 'bg-warning-light text-amber-700'}`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </div>
                      <ProgressBar value={pct} size="sm" color={pct >= 100 ? 'success' : 'primary'} showLabel={false} />
                    </div>
                    <p className="text-sm font-700 text-gray-700 shrink-0">{currency(o.total_price)}</p>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      {/* Right column */}
      <div className="space-y-5">
        {/* Notes */}
        <div>
          <SectionHead title="Notes" />
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm text-amber-800 leading-relaxed">
              {client.notes || 'No notes for this client.'}
            </p>
          </div>
        </div>

        {/* Revenue */}
        <div>
          <SectionHead title="Revenue" />
          <div className="space-y-2">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-success-light border border-success/20">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                  <DollarSign size={12} className="text-success" />
                </div>
                <p className="text-xs font-500 text-gray-600">Paid</p>
              </div>
              <p className="text-sm font-700 text-success">{currency(summary.paid_amount)}</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-danger-light border border-danger/20">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                  <Clock size={12} className="text-danger" />
                </div>
                <p className="text-xs font-500 text-gray-600">Outstanding</p>
              </div>
              <p className="text-sm font-700 text-danger">{currency(summary.unpaid_amount)}</p>
            </div>
          </div>
        </div>

        {/* Client since */}
        <div>
          <SectionHead title="Member Since" />
          <p className="text-sm font-600 text-gray-700">{fmt(client.created_at)}</p>
          <p className="text-xs text-muted mt-0.5">{fromNow(client.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────
function ServicesTab({ services, clientId, onRefresh }) {
  const { toast } = useToast();
  const [modal,   setModal]   = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [form,    setForm]    = useState({ service_id: '', start_date: '', end_date: '' });
  const [saving,  setSaving]  = useState(false);

  const openModal = async () => {
    const res = await servicesApi.list();
    setCatalog(res.data.data || []);
    setModal(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await subscriptionsApi.create({ client_id: clientId, ...form });
      toast({ type: 'success', message: 'Service subscribed!' });
      setModal(false);
      onRefresh();
    } catch { toast({ type: 'error', message: 'Failed to add service' }); }
    finally { setSaving(false); }
  };

  const handleRemove = async (subId) => {
    if (!confirm('Remove this subscription?')) return;
    try {
      await subscriptionsApi.remove(subId);
      toast({ type: 'success', message: 'Subscription removed' });
      onRefresh();
    } catch { toast({ type: 'error', message: 'Failed to remove' }); }
  };

  const handleStatusChange = async (subId, status) => {
    try { await subscriptionsApi.update(subId, { status }); onRefresh(); }
    catch { toast({ type: 'error', message: 'Update failed' }); }
  };

  return (
    <div className="space-y-4">
      <SectionHead title={`${services.length} Subscriptions`}
        action={<Button onClick={openModal} icon={<Plus size={13} />} size="sm">Subscribe</Button>} />

      {services.length === 0
        ? <BlankSlate icon={<Zap size={20} />} text="No services subscribed" sub="Subscribe this client to services to start tracking." />
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map(s => {
              const cat = CATEGORY_META[s.category] || CATEGORY_META.management;
              return (
                <div key={s.id}
                     className="border border-border rounded-xl overflow-hidden
                                hover:border-primary/30 hover:shadow-card transition-all group">
                  {/* Top accent bar */}
                  <div className={`h-1 ${cat.bar}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-600 text-gray-900">{s.service_name}</p>
                        <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full mt-1.5 inline-block ${cat.pill}`}>
                          {cat.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-700 text-gray-800">
                          ${s.price}<span className="text-xs text-muted font-400">/mo</span>
                        </p>
                        <button onClick={() => handleRemove(s.id)}
                                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center
                                           justify-center rounded-lg text-gray-300 hover:text-danger
                                           hover:bg-danger-light transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t border-border/60">
                      <div className="text-[11px] text-muted leading-relaxed">
                        <p>Start: <span className="text-gray-600 font-500">{s.start_date ? fmt(s.start_date) : 'Not set'}</span></p>
                        <p>End: <span className="text-gray-600 font-500">{s.end_date ? fmt(s.end_date) : 'Ongoing'}</span></p>
                      </div>
                      <select
                        value={s.status}
                        onChange={e => handleStatusChange(s.id, e.target.value)}
                        className={`text-[11px] font-600 px-3 py-1.5 rounded-lg border-0 cursor-pointer
                                    focus:outline-none focus:ring-1 focus:ring-primary
                                    ${s.status === 'active' ? 'bg-success-light text-green-700'
                                    : s.status === 'paused' ? 'bg-warning-light text-amber-700'
                                    : 'bg-gray-100 text-gray-500'}`}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="Subscribe to Service">
        <div className="space-y-4">
          <Select label="Service" value={form.service_id} onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}>
            <option value="">Select a service…</option>
            {catalog.map(s => <option key={s.id} value={s.id}>{s.service_name} — ${s.price}/mo</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" label="Start Date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input type="date" label="End Date"   value={form.end_date}   onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <ModalFooter onCancel={() => setModal(false)} onConfirm={handleAdd} saving={saving} disabled={!form.service_id} label="Subscribe" />
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SOCIAL ACCOUNTS
// ─────────────────────────────────────────────────────────────
const PLATFORMS = ['Facebook','Instagram','TikTok','Twitter','YouTube','Snapchat'];

function AccountsTab({ accounts, clientId, onRefresh }) {
  const { toast }  = useToast();
  const [modal,    setModal]    = useState(false);
  const [revealed, setRevealed] = useState({});
  const [form,     setForm]     = useState({ platform: 'Instagram', username: '', password: '', recovery_email: '', notes: '' });
  const [saving,   setSaving]   = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    try {
      await socialApi.create({ client_id: clientId, ...form });
      toast({ type: 'success', message: 'Account added!' });
      setModal(false);
      setForm({ platform: 'Instagram', username: '', password: '', recovery_email: '', notes: '' });
      onRefresh();
    } catch { toast({ type: 'error', message: 'Failed to add account' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try { await socialApi.remove(id); toast({ type: 'success', message: 'Account removed' }); onRefresh(); }
    catch { toast({ type: 'error', message: 'Failed to remove' }); }
  };

  const toggleReveal = async (id) => {
    if (revealed[id]) { setRevealed(r => { const n = { ...r }; delete n[id]; return n; }); return; }
    try {
      const res = await socialApi.password(id);
      setRevealed(r => ({ ...r, [id]: res.data.data.password }));
    } catch { toast({ type: 'error', message: 'Cannot reveal password' }); }
  };

  return (
    <div className="space-y-4">
      <SectionHead title={`${accounts.length} Accounts`}
        action={<Button onClick={() => setModal(true)} icon={<Plus size={13} />} size="sm">Add Account</Button>} />

      {accounts.length === 0
        ? <BlankSlate icon={<Globe size={20} />} text="No social accounts" sub="Securely store login credentials for each platform." />
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(acc => {
              const meta = PLATFORM_META[acc.platform] || PLATFORM_META.Twitter;
              return (
                <div key={acc.id}
                     className={`rounded-xl border p-4 group transition-all hover:shadow-card
                                 ${meta.bg} ${meta.border}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center
                                       justify-center ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className={`text-[11px] font-700 uppercase tracking-wide ${meta.color}`}>{acc.platform}</p>
                        <p className="text-sm font-700 text-gray-900 mt-0.5">@{acc.username}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(acc.id)}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center
                                       justify-center rounded-lg text-gray-400 hover:text-danger
                                       hover:bg-white/80 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="bg-white/60 rounded-lg px-3 py-2.5 space-y-2">
                    {acc.recovery_email && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail size={11} className="text-gray-400 shrink-0" />
                        {acc.recovery_email}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-gray-500 tracking-widest">
                        {revealed[acc.id] ? revealed[acc.id] : '● ● ● ● ● ●'}
                      </span>
                      <button onClick={() => toggleReveal(acc.id)}
                              className="text-gray-400 hover:text-gray-700 transition-colors p-0.5">
                        {revealed[acc.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {acc.notes && (
                      <p className="text-[11px] text-gray-500 italic border-t border-white/80 pt-2">{acc.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="Add Social Account">
        <div className="space-y-4">
          <Select label="Platform" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="Username" placeholder="@username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          <Input type="password" label="Password" placeholder="Account password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <Input type="email" label="Recovery Email" placeholder="backup@email.com" value={form.recovery_email} onChange={e => setForm(f => ({ ...f, recovery_email: e.target.value }))} />
          <Textarea label="Notes" placeholder="Any notes…" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <ModalFooter onCancel={() => setModal(false)} onConfirm={handleAdd} saving={saving} disabled={!form.username} label="Add Account" />
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────
function OrdersTab({ orders, clientId, onRefresh }) {
  const { toast } = useToast();
  const [modal,   setModal]   = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [form,    setForm]    = useState({ service_id: '', quantity: 1, unit_price: '' });
  const [saving,  setSaving]  = useState(false);

  const openModal = async () => {
    const res = await servicesApi.list();
    setCatalog(res.data.data || []);
    setModal(true);
  };

  const onServicePick = (e) => {
    const svc = catalog.find(s => String(s.id) === e.target.value);
    setForm(f => ({ ...f, service_id: e.target.value, unit_price: svc?.price || '' }));
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await ordersApi.create({ client_id: clientId, ...form, quantity: Number(form.quantity), unit_price: Number(form.unit_price) });
      toast({ type: 'success', message: 'Order created!' });
      setModal(false);
      onRefresh();
    } catch { toast({ type: 'error', message: 'Failed to create order' }); }
    finally { setSaving(false); }
  };

  const updateProgress = async (orderId, val) => {
    try { await ordersApi.setStatus(orderId, { progress_percentage: Number(val) }); onRefresh(); }
    catch { toast({ type: 'error', message: 'Update failed' }); }
  };

  const cycleStatus = async (order) => {
    const next = { pending: 'in_progress', in_progress: 'completed', completed: 'pending', cancelled: 'pending' };
    try { await ordersApi.setStatus(order.id, { status: next[order.status] }); toast({ type: 'success', message: 'Status updated' }); onRefresh(); }
    catch { toast({ type: 'error', message: 'Update failed' }); }
  };

  const STATUS_STYLE = {
    pending:     'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-primary-light text-primary border-primary/30',
    completed:   'bg-success-light text-green-700 border-success/30',
    cancelled:   'bg-gray-100 text-gray-500 border-gray-200',
  };

  return (
    <div className="space-y-4">
      <SectionHead title={`${orders.length} Orders`}
        action={<Button onClick={openModal} icon={<Plus size={13} />} size="sm">New Order</Button>} />

      {orders.length === 0
        ? <BlankSlate icon={<ShoppingCart size={20} />} text="No orders yet" sub="Create the first order for this client." />
        : (
          <div className="space-y-3">
            {orders.map(order => {
              const pct = order.progress_percentage || 0;
              const pctColor = pct >= 100 ? 'success' : pct >= 60 ? 'primary' : pct >= 30 ? 'warning' : 'danger';
              return (
                <div key={order.id}
                     className="border border-border rounded-xl p-4 hover:border-primary/30
                                hover:shadow-card transition-all">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center
                                      justify-center shrink-0">
                        <ShoppingCart size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-600 text-gray-900">{order.service_name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {order.category} · Qty {order.quantity} · {fmt(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <p className="text-base font-700 text-gray-800">{currency(order.total_price)}</p>
                      <button
                        onClick={() => cycleStatus(order)}
                        title="Click to advance status"
                        className={`text-[11px] font-600 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer
                                    ${STATUS_STYLE[order.status] || STATUS_STYLE.pending}`}
                      >
                        {order.status.replace('_', ' ')}
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="bg-surface rounded-xl px-4 py-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-500 text-muted">Completion</span>
                      <span className={`text-[11px] font-700
                        ${pct >= 100 ? 'text-success' : pct >= 60 ? 'text-primary' : 'text-warning'}`}>
                        {pct}%
                      </span>
                    </div>
                    <ProgressBar value={pct} color={pctColor} showLabel={false} />
                    <input
                      type="range" min="0" max="100" value={pct}
                      onChange={e => updateProgress(order.id, e.target.value)}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="New Order">
        <div className="space-y-4">
          <Select label="Service *" value={form.service_id} onChange={onServicePick}>
            <option value="">Select a service…</option>
            {catalog.map(s => <option key={s.id} value={s.id}>{s.service_name} (${s.price})</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" label="Quantity" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input type="number" label="Unit Price ($)" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
          </div>
          {form.unit_price && form.quantity && (
            <div className="flex items-center justify-between bg-primary-light rounded-xl px-4 py-3 border border-primary/20">
              <span className="text-xs font-500 text-primary">Order Total</span>
              <span className="text-sm font-700 text-primary">{currency(form.quantity * form.unit_price)}</span>
            </div>
          )}
          <ModalFooter onCancel={() => setModal(false)} onConfirm={handleCreate} saving={saving} disabled={!form.service_id || !form.unit_price} label="Create Order" />
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────
function TasksTab({ kanban, clientId, onStatusChange, onRefresh }) {
  const { toast } = useToast();
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({ title: '', description: '', status: 'todo', deadline: '' });
  const [saving, setSaving] = useState(false);
  const total = Object.values(kanban).reduce((s, a) => s + a.length, 0);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await tasksApi.create({ client_id: clientId, ...form });
      toast({ type: 'success', message: 'Task created!' });
      setModal(false);
      setForm({ title: '', description: '', status: 'todo', deadline: '' });
      onRefresh();
    } catch { toast({ type: 'error', message: 'Failed to create task' }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {[
            { label: 'Todo',        n: kanban.todo?.length || 0,        dot: 'bg-gray-400' },
            { label: 'In Progress', n: kanban.in_progress?.length || 0, dot: 'bg-primary' },
            { label: 'Done',        n: kanban.done?.length || 0,        dot: 'bg-success' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-muted">
                <span className="font-700 text-gray-700">{s.n}</span> {s.label}
              </span>
            </div>
          ))}
        </div>
        <Button onClick={() => setModal(true)} icon={<Plus size={13} />} size="sm">New Task</Button>
      </div>

      {total === 0
        ? <BlankSlate icon={<CheckSquare size={20} />} text="No tasks yet" sub="Create tasks to track work for this client." />
        : <KanbanBoard tasks={kanban} onStatusChange={onStatusChange} />
      }

      <Modal open={modal} onClose={() => setModal(false)} title="New Task">
        <div className="space-y-4">
          <Input label="Title *" placeholder="What needs to be done?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" placeholder="Additional details…" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Start in column" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>
            <Input type="datetime-local" label="Deadline" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <ModalFooter onCancel={() => setModal(false)} onConfirm={handleCreate} saving={saving} disabled={!form.title.trim()} label="Create Task" />
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────
function InvoicesTab({ invoices, summary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Invoices', value: invoices.length,                bg: 'bg-surface',       border: 'border-border',       text: 'text-gray-900' },
          { label: 'Total Paid',     value: currency(summary.paid_amount),   bg: 'bg-success-light', border: 'border-success/20',   text: 'text-success' },
          { label: 'Outstanding',    value: currency(summary.unpaid_amount), bg: 'bg-danger-light',  border: 'border-danger/20',    text: 'text-danger' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 border ${k.bg} ${k.border}`}>
            <p className="text-[11px] font-500 text-muted">{k.label}</p>
            <p className={`text-lg font-700 mt-1 ${k.text}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {invoices.length === 0
        ? <BlankSlate icon={<FileText size={20} />} text="No invoices yet" sub="Invoices billed to this client will appear here." />
        : (
          <div className="space-y-2">
            {invoices.map(inv => <InvoiceRow key={inv.id} invoice={inv} />)}
          </div>
        )
      }
    </div>
  );
}

function InvoiceRow({ invoice }) {
  const [open, setOpen] = useState(false);
  const isOverdue = invoice.status === 'unpaid' && invoice.due_date && isPast(parseISO(invoice.due_date));
  const statusKey = isOverdue ? 'overdue' : invoice.status;

  const S = {
    paid:      { bar: 'bg-success', pill: 'bg-success-light text-green-700 border-success/20' },
    unpaid:    { bar: 'bg-warning', pill: 'bg-warning-light text-amber-700 border-warning/20' },
    overdue:   { bar: 'bg-danger',  pill: 'bg-danger-light text-red-700 border-danger/20' },
    cancelled: { bar: 'bg-gray-200',pill: 'bg-gray-100 text-gray-500 border-gray-200' },
  }[statusKey] || { bar: 'bg-warning', pill: 'bg-warning-light text-amber-700' };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all
                     ${open ? 'border-primary/30 shadow-card' : 'border-border hover:border-gray-300'}`}>
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-surface/60 transition-colors"
           onClick={() => setOpen(o => !o)}>
        <div className={`w-1 h-9 rounded-full shrink-0 ${S.bar}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-600 text-gray-800">{invoice.invoice_number}</p>
          <p className="text-xs text-muted mt-0.5">
            Created {fmt(invoice.created_at)}
            {invoice.due_date && ` · Due ${fmt(invoice.due_date)}`}
          </p>
        </div>
        <p className="text-base font-700 text-gray-900 shrink-0">{currency(invoice.total_amount)}</p>
        <span className={`text-[11px] font-600 px-2.5 py-1 rounded-full border ${S.pill}`}>{statusKey}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-5 py-4">
          {!invoice.items?.length
            ? <p className="text-xs text-muted">No line items</p>
            : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-600 text-muted">Description</th>
                    <th className="text-right pb-2 font-600 text-muted">Qty</th>
                    <th className="text-right pb-2 font-600 text-muted">Unit</th>
                    <th className="text-right pb-2 font-600 text-muted">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map(item => (
                    <tr key={item.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5 text-gray-700">{item.description}</td>
                      <td className="text-right text-gray-600 py-2.5">{item.quantity}</td>
                      <td className="text-right text-gray-600 py-2.5">{currency(item.unit_price)}</td>
                      <td className="text-right font-600 text-gray-800 py-2.5">{currency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right pt-3 text-xs font-600 text-muted uppercase tracking-wide">Total</td>
                    <td className="text-right pt-3 font-700 text-gray-900">{currency(invoice.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            )
          }
        </div>
      )}
    </div>
  );
}
