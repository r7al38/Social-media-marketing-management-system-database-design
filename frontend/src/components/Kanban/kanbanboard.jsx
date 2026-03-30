import { useState } from 'react';
import { Calendar, GripVertical, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const COLUMNS = [
  {
    key:         'todo',
    label:       'To Do',
    dot:         'bg-gray-400',
    bg:          'bg-gray-50',
    border:      'border-gray-200',
    dropRing:    'ring-gray-400',
    countBg:     'bg-gray-200 text-gray-600',
  },
  {
    key:         'in_progress',
    label:       'In Progress',
    dot:         'bg-primary',
    bg:          'bg-blue-50/60',
    border:      'border-primary/20',
    dropRing:    'ring-primary',
    countBg:     'bg-primary-light text-primary',
  },
  {
    key:         'done',
    label:       'Done',
    dot:         'bg-success',
    bg:          'bg-green-50/60',
    border:      'border-success/20',
    dropRing:    'ring-success',
    countBg:     'bg-success-light text-green-700',
  },
];

export default function KanbanBoard({
  tasks = {},
  onStatusChange,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
}) {
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);

  const handleDragStart = (e, task) => {
    setDragging(task);
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image opacity via a tiny delay trick
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDragging(null);
    setDragOver(null);
  };

  const handleDrop = (e, colKey) => {
    e.preventDefault();
    if (dragging && dragging.status !== colKey) {
      onStatusChange?.(dragging.id, colKey);
    }
    setDragOver(null);
    setDragging(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(col => {
        const colTasks   = tasks[col.key] || [];
        const isDropZone = dragOver === col.key;

        return (
          <div
            key={col.key}
            onDragOver={e  => { e.preventDefault(); setDragOver(col.key); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e      => handleDrop(e, col.key)}
            className={`rounded-2xl border p-3 min-h-[420px] transition-all duration-150
                        ${col.bg} ${col.border}
                        ${isDropZone ? `ring-2 ${col.dropRing} ring-offset-2 ${col.bg}` : ''}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <span className="text-sm font-600 text-gray-700">{col.label}</span>
              </div>
              <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${col.countBg}`}>
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {colTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskClick?.(task)}
                  onEdit={onTaskEdit   ? () => onTaskEdit(task)   : null}
                  onDelete={onTaskDelete ? () => onTaskDelete(task.id) : null}
                />
              ))}

              {/* Drop target placeholder */}
              <div className={`flex items-center justify-center rounded-xl border-2 border-dashed
                              transition-all text-xs font-500
                              ${isDropZone
                                ? 'h-16 border-primary/50 text-primary bg-primary-light/30'
                                : 'h-12 border-gray-200 text-gray-300'}`}>
                {isDropZone ? 'Drop here' : colTasks.length === 0 ? 'No tasks' : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function TaskCard({ task, onDragStart, onDragEnd, onClick, onEdit, onDelete }) {
  const navigate   = useNavigate();
  const isOverdue  = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'done';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-xl border border-border shadow-card
                 cursor-grab active:cursor-grabbing select-none
                 hover:shadow-card-hover hover:-translate-y-0.5
                 transition-all duration-150 overflow-hidden"
    >
      {/* Top accent for overdue */}
      {isOverdue && <div className="h-0.5 bg-danger w-full" />}

      <div className="p-3.5">
        {/* Drag handle + title row */}
        <div className="flex items-start gap-2 mb-2">
          <GripVertical size={14} className="text-gray-300 mt-0.5 shrink-0 group-hover:text-gray-400" />
          <p className="text-sm font-500 text-gray-800 leading-snug flex-1 min-w-0">{task.title}</p>

          {/* Action buttons — show on hover */}
          <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            {onEdit && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg
                           hover:bg-primary-light text-gray-400 hover:text-primary transition-colors"
              >
                <Pencil size={11} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg
                           hover:bg-danger-light text-gray-400 hover:text-danger transition-colors"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Client name + link */}
        {task.business_name && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/clients/${task.client_id}/profile`); }}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline ml-5 mb-2"
          >
            {task.business_name}
            <ExternalLink size={9} />
          </button>
        )}

        {/* Description preview */}
        {task.description && (
          <p className="text-[11px] text-muted ml-5 mb-2 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Footer: deadline + assignee */}
        <div className="flex items-center justify-between ml-5">
          {task.deadline ? (
            <span className={`flex items-center gap-1 text-[11px] font-500
                              ${isOverdue ? 'text-danger' : 'text-muted'}`}>
              <Calendar size={11} />
              {format(parseISO(task.deadline), 'MMM d')}
              {isOverdue && <span className="ml-1 text-[10px] font-700 bg-danger-light text-danger px-1.5 py-0.5 rounded-full">Overdue</span>}
            </span>
          ) : <span />}

          {task.assigned_to_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple
                              flex items-center justify-center">
                <span className="text-[9px] font-700 text-white">
                  {task.assigned_to_name[0].toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-muted">{task.assigned_to_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}