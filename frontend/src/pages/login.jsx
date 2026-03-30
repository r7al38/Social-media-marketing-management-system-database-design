import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth }  from '../context/authcontext.jsx';
import { useToast } from '../context/toastcontext.jsx';

export default function Login() {
  const { login }     = useAuth();
  const { toast }     = useToast();
  const navigate      = useNavigate();
  const [form,   setForm]   = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast({ type: 'success', message: 'Welcome back!' });
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple/5 rounded-full" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-card-hover border border-border p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
              <Zap size={26} className="text-white" fill="white" />
            </div>
            <h1 className="text-xl font-700 text-gray-900">SMM Dashboard</h1>
            <p className="text-sm text-muted mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
                <p className="text-sm text-danger font-500">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-500 text-gray-600">Username</label>
              <input
                className="input"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-500 text-gray-600">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white text-sm font-600 rounded-xl
                         hover:bg-primary-dark transition-colors shadow-sm
                         flex items-center justify-center gap-2 mt-2
                         disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><LogIn size={16} /> Sign In</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-muted mt-6">
            Default: <span className="font-600 text-gray-600">admin</span> / <span className="font-600 text-gray-600">Admin@1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}