import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ExternalLink, Calendar, User2, Pencil, Trash2 } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { tasksApi, clientsApi } from '../api/client.js';
import { useToast } from '../context/toastcontext.jsx';
import { Button, Modal, Input, Select, Textarea, Spinner, Badge } from '../components/ui/index.jsx';
import KanbanBoard from '../components/Kanban/kanbanboard.jsx';

const EMPTY_FORM = { client_id: '', title: '', description: '', status: 'todo', deadline: '' };

export default function Tasks() {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [board,    setBoard]    = useState({ todo: [], in_progress: [], done: [] });
  const [loading,  setLoading]  = useState(true);
  const [clients,  setClients]  = useState([]);
  const [filter,   setFilter]   = useState('');
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);   // task being edited
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  // Load clients once on mount — used by both filter dropdown and modal
  useEffect(() => {
    clientsApi.list({ limit: 200 })
      .then(r => setClients(r.data.data || []))
      .catch(console.error);
  }, []);

  const loadBoard = useCallback(() => {
    setLoading(true);
    tasksApi.board(filter ? { client_id: filter } : {})
      .then(r => setBoard(r.data.data || { todo: [], in_progress: [], done: [] }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // ── Drag-and-drop status change with optimistic update ──
  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistically move the card in UI first
    setBoard(prev => {
      const allTasks = [...prev.todo, ...prev.in_progress, ...prev.done];
      const task     = allTasks.find(t => t.id === taskId);
      if (!task) return prev;
      const updated  = { ...task, status: newStatus };
      return {
        todo:        newStatus === 'todo'        ? [...prev.todo.filter(t => t.id !== taskId),        updated] : prev.todo.filter(t => t.id !== taskId),
        in_progress: newStatus === 'in_progress' ? [...prev.in_progress.filter(t => t.id !== taskId), updated] : prev.in_progress.filter(t => t.id !== taskId),
        done:        newStatus === 'done'        ? [...prev.done.filter(t => t.id !== taskId),        updated] : prev.done.filter(t => t.id !== taskId),
      };
    });

    try {
      await tasksApi.setStatus(taskId, { status: newStatus });
      toast({ type: 'success', message: 'Task moved' });
    } catch {
      toast({ type: 'error', message: 'Failed to update — reloading' });
      loadBoard(); // revert on failure
    }
  };

  // ── Create / Edit ───────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit   = (task) => {
    setEditing(task);
    setForm({
      client_id:   task.client_id,
      title:       task.title,
      description: task.description || '',
      status:      task.status,
      deadline:    task.deadline ? task.deadline.slice(0, 16) : '',
    });
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await tasksApi.update(editing.id, { ...form, client_id: Number(form.client_id) });
        toast({ type: 'success', message: 'Task updated' });
      } else {
        await tasksApi.create({ ...form, client_id: Number(form.client_id) });
        toast({ type: 'success', message: 'Task created!' });
      }
      setModal(false);
      loadBoard();
    } catch { toast({ type: 'error', message: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksApi.remove(taskId);
      toast({ type: 'success', message: 'Task deleted' });
      loadBoard();
    } catch { toast({ type: 'error', message: 'Failed to delete' }); }
  };

  const total = (board.todo?.length || 0) + (board.in_progress?.length || 0) + (board.done?.length || 0);

  return (
    <div className="space-y-5">
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Column counters */}
          <div className="flex items-center gap-1 bg-white border border-border rounded-xl px-3 py-2 shadow-card">
            {[
              { label: 'Todo',        n: board.todo?.length || 0,        dot: 'bg-gray-400' },
              { label: 'In Progress', n: board.in_progress?.length || 0, dot: 'bg-primary' },
              { label: 'Done',        n: board.done?.length || 0,        dot: 'bg-success' },
            ].map((s, i) => (
              <span key={s.label}>
                {i > 0 && <span className="mx-2 text-gray-200">|</span>}
                <span className="text-xs text-gray-600">
                  <span className={`inline-block w-2 h-2 rounded-full ${s.dot} mr-1.5`} />
                  <span className="font-700 text-gray-800">{s.n}</span> {s.label}
                </span>
              </span>
            ))}
          </div>

          {/* Client filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="input w-44 py-2 text-sm"
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.business_name}</option>
            ))}
          </select>
        </div>

        <Button onClick={openCreate} icon={<Plus size={14} />}>New Task</Button>
      </div>

      {/* ── Board ─────────────────────────────────────────── */}
      {loading
        ? <Spinner />
        : (
          <KanbanBoard
            tasks={board}
            onStatusChange={handleStatusChange}
            onTaskEdit={openEdit}
            onTaskDelete={handleDelete}
            onTaskClick={(task) => navigate(`/clients/${task.client_id}/profile?tab=tasks`)}
          />
        )
      }

      {/* ── Create / Edit Modal ───────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Task' : 'New Task'}
      >
        <div className="space-y-4">
          <Select
            label="Client *"
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
          >
            <option value="">Select client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.business_name}</option>
            ))}
          </Select>

          <Input
            label="Title *"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />

          <Textarea
            label="Description"
            placeholder="Additional details…"
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Column"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>

            <Input
              type="datetime-local"
              label="Deadline"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.client_id || !form.title.trim()}
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}