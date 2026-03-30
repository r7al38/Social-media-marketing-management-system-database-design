import { useState, useEffect } from 'react';
import { Plus, ToggleLeft, ToggleRight, Trash2, Edit2 } from 'lucide-react';
import { servicesApi } from '../api/client.js';
import { useToast }    from '../context/toastcontext.jsx';
import { Badge, Button, Modal, Input, Select, Textarea, EmptyState, Spinner } from '../components/ui/index.jsx';

const CATEGORIES = ['ads', 'growth', 'security', 'management'];
const CATEGORY_COLOR = { ads: 'purple', growth: 'success', security: 'danger', management: 'primary' };

const EMPTY_FORM = { service_name: '', category: 'management', description: '', price: '' };

export default function Services() {
  const { toast }  = useToast();
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    servicesApi.list({ active: '0' })
      .then(r => setServices(r.data.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit   = (s)  => { setEditing(s); setForm({ service_name: s.service_name, category: s.category, description: s.description || '', price: s.price }); setModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      editing
        ? await servicesApi.update(editing.id, form)
        : await servicesApi.create(form);
      toast({ type: 'success', message: editing ? 'Service updated' : 'Service created' });
      setModal(false);
      load();
    } catch { toast({ type: 'error', message: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s) => {
    await servicesApi.toggle(s.id);
    toast({ type: 'info', message: `Service ${s.is_active ? 'deactivated' : 'activated'}` });
    load();
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete "${s.service_name}"?`)) return;
    try {
      await servicesApi.remove(s.id);
      toast({ type: 'success', message: 'Service deleted' });
      load();
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.message || 'Cannot delete' });
    }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = services.filter(s => s.category === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate} icon={<Plus size={14} />}>New Service</Button>
      </div>

      {loading ? <Spinner /> : services.length === 0 ? (
        <EmptyState icon="📦" title="No services yet" action={<Button onClick={openCreate} icon={<Plus size={14} />}>Add Service</Button>} />
      ) : (
        CATEGORIES.map(cat => grouped[cat].length > 0 && (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={CATEGORY_COLOR[cat]}>{cat}</Badge>
              <span className="text-xs text-muted">{grouped[cat].length} services</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {grouped[cat].map(s => (
                <div key={s.id}
                     className={`card group hover:shadow-card-hover transition-all
                                 ${!s.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-600 text-gray-800">{s.service_name}</p>
                      <p className="text-xs text-muted mt-1 line-clamp-2">{s.description || 'No description'}</p>
                    </div>
                    <p className="text-lg font-700 text-primary ml-3">${s.price}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{s.active_subscriptions || 0} active clients</span>
                      <span>{s.total_orders || 0} orders</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(s)}   className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary-light text-gray-400 hover:text-primary transition-colors"><Edit2  size={12} /></button>
                      <button onClick={() => handleToggle(s)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface text-gray-400 hover:text-gray-600 transition-colors">
                        {s.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} />}
                      </button>
                      <button onClick={() => handleDelete(s)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-danger-light text-gray-400 hover:text-danger transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Service' : 'New Service'}>
        <div className="space-y-4">
          <Input label="Service Name *" value={form.service_name} placeholder="e.g. Instagram Growth Package"
                 onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </Select>
            <Input type="number" label="Price ($)" min="0" step="0.01" value={form.price}
                   onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <Textarea label="Description" value={form.description} placeholder="What does this service include?"
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.service_name || !form.price}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Service'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}