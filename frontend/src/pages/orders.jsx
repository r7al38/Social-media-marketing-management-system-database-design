import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ExternalLink } from 'lucide-react';
import { ordersApi, clientsApi, servicesApi } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { egp }     from '../utils/currency.js';
import { Badge, Button, Modal, Input, Select, ProgressBar, Spinner, EmptyState } from '../components/ui/index.jsx';
import { format, parseISO } from 'date-fns';

const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const fmt = (d) => d ? format(parseISO(d), 'MMM d, yyyy') : '—';

const STATUS_STYLE = {
  completed:   'bg-success-light text-green-700',
  in_progress: 'bg-primary-light text-primary',
  cancelled:   'bg-gray-100 text-gray-500',
  pending:     'bg-warning-light text-amber-700',
};

export default function Orders() {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [meta,     setMeta]     = useState({ total: 0 });
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [status,   setStatus]   = useState('');
  const [modal,    setModal]    = useState(false);
  const [clients,  setClients]  = useState([]);
  const [catalog,  setCatalog]  = useState([]);
  const [form,     setForm]     = useState({ client_id: '', service_id: '', quantity: 1, unit_price: '' });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    ordersApi.list({ page, limit: 15, status: status || undefined })
      .then(r => { setOrders(r.data.data || []); setMeta(r.data.meta || {}); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(load, [load]);

  const openModal = async () => {
    const [c, s] = await Promise.all([clientsApi.list({ limit: 100 }), servicesApi.list()]);
    setClients(c.data.data || []);
    setCatalog(s.data.data || []);
    setModal(true);
  };

  const onServicePick = (e) => {
    const svc = catalog.find(s => String(s.id) === e.target.value);
    setForm(f => ({ ...f, service_id: e.target.value, unit_price: svc?.price || '' }));
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await ordersApi.create({
        ...form,
        client_id:  Number(form.client_id),
        service_id: Number(form.service_id),
        quantity:   Number(form.quantity),
        unit_price: Number(form.unit_price),
      });
      toast({ type: 'success', message: 'Order created!' });
      setModal(false);
      load();
    } catch { toast({ type: 'error', message: 'Failed to create order' }); }
    finally { setSaving(false); }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await ordersApi.setStatus(orderId, { status: newStatus });
      load();
    } catch { toast({ type: 'error', message: 'Failed to update status' }); }
  };

  const progressColor = (pct) => pct >= 100 ? 'success' : pct >= 50 ? 'primary' : 'warning';

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-500 rounded-lg transition-colors cursor-pointer
                          ${status === s
                            ? 'bg-primary text-white'
                            : 'bg-white border border-border text-gray-600 hover:bg-surface'}`}
            >
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
        <Button onClick={openModal} icon={<Plus size={14} />}>New Order</Button>
      </div>

      {loading ? <Spinner /> : orders.length === 0 ? (
        <EmptyState icon="🛒" title="No orders found" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="min-w-[140px]">Progress</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <button
                        onClick={() => navigate(`/clients/${order.client_id}/profile`)}
                        className="text-primary font-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {order.business_name} <ExternalLink size={10} />
                      </button>
                    </td>
                    <td>
                      <p className="font-500 text-gray-800 truncate max-w-[140px]">{order.service_name}</p>
                      <p className="text-[11px] text-muted">{order.category}</p>
                    </td>
                    <td>{order.quantity}</td>
                    <td className="font-600 whitespace-nowrap">{egp(order.total_price)}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        className={`text-xs font-600 px-2 py-1 rounded-lg border-0 cursor-pointer
                                    focus:outline-none focus:ring-1 focus:ring-primary
                                    ${STATUS_STYLE[order.status] || STATUS_STYLE.pending}`}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <ProgressBar
                        value={order.progress_percentage || 0}
                        color={progressColor(order.progress_percentage)}
                        size="sm"
                      />
                    </td>
                    <td className="text-xs text-muted whitespace-nowrap">{fmt(order.created_at)}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/clients/${order.client_id}/profile`)}
                        className="text-gray-400 hover:text-primary transition-colors cursor-pointer"
                        title="View client"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: meta.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 text-xs font-600 rounded-lg transition-colors cursor-pointer
                          ${p === page
                            ? 'bg-primary text-white'
                            : 'bg-white border border-border text-gray-600 hover:bg-surface'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* New Order Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Order">
        <div className="space-y-4">
          <Select label="Client *" value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>

          <Select label="Service *" value={form.service_id} onChange={onServicePick}>
            <option value="">Select service…</option>
            {catalog.map(s => (
              <option key={s.id} value={s.id}>{s.service_name} ({egp(s.price)})</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input type="number" label="Quantity" min="1"
                   value={form.quantity}
                   onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input type="number" label="Unit Price (EGP)" min="0" step="0.01"
                   value={form.unit_price}
                   onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
          </div>

          {form.unit_price && form.quantity && (
            <div className="flex items-center justify-between bg-primary-light rounded-xl px-4 py-3">
              <span className="text-xs font-500 text-primary">Order Total</span>
              <span className="text-sm font-700 text-primary">
                {egp(Number(form.quantity) * Number(form.unit_price))}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.client_id || !form.service_id || !form.unit_price}
            >
              {saving ? 'Creating…' : 'Create Order'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
