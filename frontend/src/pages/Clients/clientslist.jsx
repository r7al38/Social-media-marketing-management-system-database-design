import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, ExternalLink, Phone, Mail, Trash2 } from 'lucide-react';
import { clientsApi } from '../../api/client.js';
import { useToast }   from '../../context/ToastContext.jsx';
import { egp }        from '../../utils/currency.js';
import {
  Badge, Button, Modal, Input, Select, Textarea,
  EmptyState, Spinner,
} from '../../components/ui/index.jsx';

const TYPES = ['cafe', 'restaurant', 'company', 'other'];

export default function ClientsList() {
  const navigate   = useNavigate();
  const { toast }  = useToast();
  const [clients,  setClients]  = useState([]);
  const [meta,     setMeta]     = useState({ total: 0, pages: 1 });
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('');
  const [page,     setPage]     = useState(1);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ business_name: '', type: 'cafe', phone: '', email: '', address: '', notes: '' });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    clientsApi.list({ page, limit: 12, search: search || undefined, type: filter || undefined })
      .then(res => {
        setClients(res.data.data || []);
        setMeta(res.data.meta   || { total: 0, pages: 1 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]); // eslint-disable-line

  const handleCreate = async () => {
    if (!form.business_name.trim()) return;
    setSaving(true);
    try {
      await clientsApi.create(form);
      toast({ type: 'success', message: 'Client created!' });
      setModal(false);
      setForm({ business_name: '', type: 'cafe', phone: '', email: '', address: '', notes: '' });
      load();
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.message || 'Failed to create client' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Delete "${client.business_name}"? This cannot be undone.`)) return;
    try {
      await clientsApi.remove(client.id);
      toast({ type: 'success', message: 'Client removed' });
      load();
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.message || 'Failed to delete client' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search clients…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
          </div>
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}
            className="input w-36 cursor-pointer"
          >
            <option value="">All Types</option>
            {TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setModal(true)} icon={<Plus size={15} />}>
          New Client
        </Button>
      </div>

      <p className="text-xs text-muted">
        Showing <span className="font-600 text-gray-700">{clients.length}</span> of{' '}
        <span className="font-600 text-gray-700">{meta.total}</span> clients
      </p>

      {/* Grid */}
      {loading ? <Spinner /> : clients.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No clients found"
          description="Create your first client to get started."
          action={<Button onClick={() => setModal(true)} icon={<Plus size={14} />}>Add Client</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onView={() => navigate(`/clients/${client.id}/profile`)}
              onDelete={() => handleDelete(client)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
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
      <Modal open={modal} onClose={() => setModal(false)} title="New Client">
        <div className="space-y-4">
          <Input label="Business Name *" placeholder="e.g. Café Roma"
                 value={form.business_name}
                 onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
          <Select label="Type *" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" placeholder="+20 100 000 0000"
                   value={form.phone}
                   onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" type="email" placeholder="hello@business.com"
                   value={form.email}
                   onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Input label="Address" placeholder="Street, City"
                 value={form.address}
                 onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Textarea label="Notes" placeholder="Internal notes…"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create Client'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Client Card ──────────────────────────────────────────────
function ClientCard({ client, onView, onDelete }) {
  const typeColors = { cafe: 'cafe', restaurant: 'restaurant', company: 'company', other: 'other' };

  return (
    <div className="card hover:shadow-card-hover transition-all group relative">
      {/* Delete button — top right, visible on hover */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Delete client"
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center
                   rounded-lg text-gray-300 hover:text-danger hover:bg-danger-light
                   opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
      >
        <Trash2 size={13} />
      </button>

      <div className="flex items-start justify-between mb-3 pr-6">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-purple
                        flex items-center justify-center text-white font-700 text-lg shadow-sm">
          {client.business_name?.[0]?.toUpperCase() || '?'}
        </div>
        <Badge variant={typeColors[client.type] || 'default'}>{client.type}</Badge>
      </div>

      <h3 className="text-sm font-600 text-gray-900 truncate">{client.business_name}</h3>

      <div className="mt-2 space-y-1">
        {client.phone && (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Phone size={11} /> {client.phone}
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Mail size={11} />
            <span className="truncate">{client.email}</span>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-sm font-700 text-primary">{client.total_orders ?? 0}</p>
          <p className="text-[10px] text-muted">Orders</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-700 text-warning">{client.open_tasks ?? 0}</p>
          <p className="text-[10px] text-muted">Tasks</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-700 text-danger">{egp(client.unpaid_amount)}</p>
          <p className="text-[10px] text-muted">Unpaid</p>
        </div>
        {/* View profile — always visible */}
        <div className="flex-1 flex justify-end items-end">
          <button
            onClick={onView}
            className="flex items-center gap-1 text-xs text-primary font-500
                       hover:underline cursor-pointer"
          >
            View <ExternalLink size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
