// ─────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────
export function Badge({ children, variant = 'default', className = '' }) {
    const variants = {
      default:     'bg-gray-100 text-gray-700',
      primary:     'bg-primary-light text-primary',
      success:     'bg-success-light text-green-700',
      danger:      'bg-danger-light text-red-700',
      warning:     'bg-warning-light text-amber-700',
      purple:      'bg-purple-light text-purple-dark',
      pending:     'bg-amber-50 text-amber-700',
      in_progress: 'bg-primary-light text-primary',
      completed:   'bg-success-light text-green-700',
      cancelled:   'bg-gray-100 text-gray-500',
      paid:        'bg-success-light text-green-700',
      unpaid:      'bg-danger-light text-red-700',
      overdue:     'bg-red-100 text-red-800',
      active:      'bg-success-light text-green-700',
      paused:      'bg-warning-light text-amber-700',
      todo:        'bg-gray-100 text-gray-600',
      done:        'bg-success-light text-green-700',
      cafe:        'bg-amber-50 text-amber-700',
      restaurant:  'bg-orange-50 text-orange-700',
      company:     'bg-primary-light text-primary',
      other:       'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`badge ${variants[variant] || variants.default} ${className}`}>
        {children}
      </span>
    );
  }
  
  // ─────────────────────────────────────────────
  // Button
  // ─────────────────────────────────────────────
  export function Button({
    children, onClick, variant = 'primary', size = 'md',
    className = '', disabled = false, type = 'button', icon,
  }) {
    const variants = {
      primary:   'bg-primary text-white hover:bg-primary-dark shadow-sm',
      secondary: 'bg-white text-gray-700 border border-border hover:bg-surface',
      danger:    'bg-danger text-white hover:bg-red-600 shadow-sm',
      ghost:     'text-gray-600 hover:bg-surface',
      outline:   'border border-primary text-primary hover:bg-primary-light',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
    };
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center gap-2 font-500 rounded-xl transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${variants[variant]} ${sizes[size]} ${className}`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
  
  // ─────────────────────────────────────────────
  // StatCard — KPI card
  // ─────────────────────────────────────────────
  export function StatCard({ title, value, icon, color = 'blue', trend, sub }) {
    const colors = {
      blue:   { bg: 'bg-primary-light',  icon: 'text-primary',  border: 'border-primary/20' },
      green:  { bg: 'bg-success-light',  icon: 'text-success',  border: 'border-success/20' },
      purple: { bg: 'bg-purple-light',   icon: 'text-purple',   border: 'border-purple/20' },
      amber:  { bg: 'bg-warning-light',  icon: 'text-warning',  border: 'border-warning/20' },
      red:    { bg: 'bg-danger-light',   icon: 'text-danger',   border: 'border-danger/20' },
    };
    const c = colors[color] || colors.blue;
  
    return (
      <div className={`card border-l-4 ${c.border} hover:shadow-card-hover transition-shadow`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-500 text-muted uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-700 text-gray-900 mt-1">{value ?? '—'}</p>
            {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
            {trend !== undefined && (
              <p className={`text-xs font-500 mt-1 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last week
              </p>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
            <span className={c.icon}>{icon}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // ─────────────────────────────────────────────
  // ProgressBar
  // ─────────────────────────────────────────────
  export function ProgressBar({ value = 0, color = 'primary', showLabel = true, size = 'md' }) {
    const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
    const colors  = {
      primary: 'bg-primary',
      success: 'bg-success',
      danger:  'bg-danger',
      warning: 'bg-warning',
      purple:  'bg-purple',
    };
    const pct = Math.max(0, Math.min(100, value));
    return (
      <div className="flex items-center gap-2">
        <div className={`flex-1 bg-gray-100 rounded-full overflow-hidden ${heights[size]}`}>
          <div
            className={`${heights[size]} ${colors[color] || colors.primary} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%`, animation: 'progressGrow 0.6s ease-out' }}
          />
        </div>
        {showLabel && <span className="text-xs font-600 text-gray-600 w-8 text-right">{pct}%</span>}
      </div>
    );
  }
  
  // ─────────────────────────────────────────────
  // Modal
  // ─────────────────────────────────────────────
  import { X } from 'lucide-react';
  
  export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative bg-white rounded-2xl shadow-card-hover w-full ${width}
                         animate-fade-in max-h-[90vh] overflow-y-auto`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-600 text-gray-800">{title}</h2>
            <button onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg
                               hover:bg-surface text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    );
  }
  
  // ─────────────────────────────────────────────
  // EmptyState
  // ─────────────────────────────────────────────
  export function EmptyState({ icon, title, description, action }) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="text-4xl mb-3 opacity-40">{icon || '📭'}</div>
        <p className="text-sm font-600 text-gray-600">{title || 'Nothing here yet'}</p>
        {description && <p className="text-xs text-muted mt-1 max-w-xs">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }
  
  // ─────────────────────────────────────────────
  // Spinner
  // ─────────────────────────────────────────────
  export function Spinner({ size = 'md' }) {
    const s = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
    return (
      <div className="flex items-center justify-center py-10">
        <div className={`${s[size]} border-primary/30 border-t-primary rounded-full animate-spin`} />
      </div>
    );
  }
  
  // ─────────────────────────────────────────────
  // Input + Select + Textarea
  // ─────────────────────────────────────────────
  export function Input({ label, error, className = '', ...props }) {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-xs font-500 text-gray-600">{label}</label>}
        <input className={`input ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''} ${className}`} {...props} />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
  
  export function Select({ label, error, children, className = '', ...props }) {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-xs font-500 text-gray-600">{label}</label>}
        <select className={`input appearance-none ${error ? 'border-danger' : ''} ${className}`} {...props}>
          {children}
        </select>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
  
  export function Textarea({ label, error, className = '', ...props }) {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-xs font-500 text-gray-600">{label}</label>}
        <textarea className={`input resize-none ${error ? 'border-danger' : ''} ${className}`} rows={3} {...props} />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }