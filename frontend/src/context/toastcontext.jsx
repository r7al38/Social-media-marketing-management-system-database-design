import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ type = 'info', message, duration = 3500 }) => {
    const id = ++_id;
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);

  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const styles = {
    success: { bg: 'bg-success-light border-success/30', icon: <CheckCircle2 size={18} className="text-success shrink-0" />, text: 'text-green-800' },
    error:   { bg: 'bg-danger-light border-danger/30',   icon: <XCircle     size={18} className="text-danger  shrink-0" />, text: 'text-red-800' },
    info:    { bg: 'bg-primary-light border-primary/30', icon: <Info        size={18} className="text-primary  shrink-0" />, text: 'text-blue-800' },
  };
  const s = styles[toast.type] || styles.info;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-card-hover
                     animate-slide-in ${s.bg}`}>
      {s.icon}
      <p className={`text-sm font-medium flex-1 ${s.text}`}>{toast.message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
        <X size={14} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);