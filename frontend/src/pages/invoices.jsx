import { useState, useEffect, useCallback } from 'react';
import { useNavigate }   from 'react-router-dom';
import { Plus, ExternalLink, ChevronDown } from 'lucide-react';
import { DollarSign, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { invoicesApi, clientsApi } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { egp }     from '../utils/currency.js';
import { Badge, Button, Modal, Input, Select, Spinner, EmptyState, StatCard } from '../components/ui/index.jsx';

const fmt = (d) => d ? format(parseISO(d), 'MMM d, yyyy') : '—';

const STATUS_STRIPE = {
  paid:      'bg-success',
  unpaid:    'bg-warning',
  overdue:   'bg-danger',
  cancelled: 'bg-gray-300',
};

export default function Invoices() {
  const { toast }      = useToast();
  const navigate       = useNavigate();
  const [invoices,     setInvoices]     = useState([]);
  const [meta,         setMeta]         = useState({ total: 0 });
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(false);
  const [clients,      setClients]      = useState([]);
  const [form,         setForm]         = useState({ client_id: '', invoice_number: '', due_date: '', notes: '' });
  const [saving,       setSaving]       = useState(false);
  const [expanded,     setExpanded]     = useState({});

  const load = useCallback(() => {
    setLoading(true);
    invoicesApi.list({ page, limit: 15, status: statusFilter || undefined })
      .then(r => { setInvoices(r.data.data || []); setMeta(r.data.meta || {}); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(load, [load]);

  const openModal = async () => {
    const res = await clientsApi.list({ limit: 100 });
    setClients(res.data.data || []);
    const num = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    setForm({ client_id: '', invoice_number: num, due_date: '', notes: '' });
    setModal(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await invoicesApi.create({ ...form, client_id: Number(form.client_id) });
      toast({ type: 'success', message: 'Invoice created!' });
      setModal(false);
      load();
    } catch { toast({ type: 'error', message: 'Failed to create invoice' }); }
    finally { setSaving(false); }
  };

  const markPaid = async (inv) => {
    try {
      await invoicesApi.update(inv.id, { ...inv, status: 'paid' });
      toast({ type: 'success', message: 'Invoice marked as paid' });
      load();
    } catch { toast({ type: 'error', message: 'Update failed' }); }
  };

  // Local totals from current page
  const totalPaid    = invoices.filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalUnpaid  = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalOverdue = invoices.filter(i =>
    i.status === 'unpaid' && i.due_date && isPast(parseISO(i.due_date))
  ).length;

  const FILTER_STATUSES = ['', 'paid', 'unpaid', 'overdue', 'cancelled'];

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Invoices"  value={meta.total || 0}   icon={<DollarSign   size={18} />} color="blue" />
        <StatCard title="Collected"       value={egp(totalPaid)}    icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard title="Outstanding"     value={egp(totalUnpaid)}  icon={<Clock        size={18} />} color="amber" />
        <StatCard title="Overdue"         value={totalOverdue}      icon={<AlertCircle  size={18} />} color="red" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-500 rounded-lg transition-colors cursor-pointer
                          ${statusFilter === s
                            ? 'bg-primary text-white'
                            : 'bg-white border border-border text-gray-600 hover:bg-surface'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <Button onClick={openModal} icon={<Plus size={14} />}>New Invoice</Button>
      </div>

      {loading ? <Spinner /> : invoices.length === 0 ? (
        <EmptyState icon="🧾" title="No invoices found" />
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const isOverdue    = inv.status === 'unpaid' && inv.due_date && isPast(parseISO(inv.due_date));
            const displayStatus = isOverdue ? 'overdue' : inv.status;
            const isOpen       = expanded[inv.id];

            return (
              <div key={inv.id}
                   className="card p-0 overflow-hidden hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3 p-4">
                  {/* Status stripe */}
                  <div className={`w-1 h-10 rounded-full shrink-0 ${STATUS_STRIPE[displayStatus] || STATUS_STRIPE.unpaid}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-600 text-gray-800">{inv.invoice_number}</p>
                      <button
                        onClick={() => navigate(`/clients/${inv.client_id}/profile`)}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        {inv.business_name} <ExternalLink size={9} />
                      </button>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      Created {fmt(inv.created_at)}
                      {inv.due_date ? ` · Due ${fmt(inv.due_date)}` : ''}
                    </p>
                  </div>

                  {/* Amount */}
                  <p className="text-base font-700 text-gray-900 whitespace-nowrap shrink-0">
                    {egp(inv.total_amount)}
                  </p>

                  <Badge variant={displayStatus}>{displayStatus}</Badge>

                  {inv.status === 'unpaid' && (
                    <button
                      onClick={() => markPaid(inv)}
                      className="text-xs font-500 text-success border border-success/30 bg-success-light
                                 px-2.5 py-1 rounded-lg hover:bg-success hover:text-white
                                 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Mark Paid
                    </button>
                  )}

                  {/* Expand */}
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [inv.id]: !e[inv.id] }))}
                    className={`text-gray-400 hover:text-gray-600 transition-transform cursor-pointer shrink-0
                                ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Line items */}
                {isOpen && (
                  <div className="border-t border-border bg-surface px-6 py-4">
                    {!inv.items?.length ? (
                      <p className="text-xs text-muted">No line items</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted border-b border-border">
                            <th className="text-left py-1.5 font-600">Description</th>
                            <th className="text-right py-1.5 font-600">Qty</th>
                            <th className="text-right py-1.5 font-600">Unit Price</th>
                            <th className="text-right py-1.5 font-600">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.items.map(item => (
                            <tr key={item.id} className="border-b border-border/40">
                              <td className="py-2 text-gray-700">{item.description}</td>
                              <td className="text-right text-gray-600 py-2">{item.quantity}</td>
                              <td className="text-right text-gray-600 py-2 whitespace-nowrap">{egp(item.unit_price)}</td>
                              <td className="text-right font-600 text-gray-800 py-2 whitespace-nowrap">{egp(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="text-right pt-3 font-600 text-muted">Total</td>
                            <td className="text-right pt-3 font-700 text-gray-900 whitespace-nowrap">
                              {egp(inv.total_amount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Invoice">
        <div className="space-y-4">
          <Select label="Client *" value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <Input label="Invoice Number"
                 value={form.invoice_number}
                 onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
          <Input type="date" label="Due Date"
                 value={form.due_date}
                 onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          <div className="bg-primary-light rounded-xl p-3 text-xs text-blue-700">
            💡 Add line items from the client's profile after creating the invoice.
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.client_id}>
              {saving ? 'Creating…' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
