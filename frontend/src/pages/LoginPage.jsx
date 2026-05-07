import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../components/shared/UI';
import { FlaskConical, User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-brand-700 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <FlaskConical size={20} className="text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-white">CoalLIMS</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Coal Testing<br />Laboratory<br />Management
          </h1>
          <p className="text-brand-200 text-base leading-relaxed">
            End-to-end sample tracking, test assignment and result management for modern coal testing laboratories.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Sample Tracking',   desc: 'From collection to report' },
            { label: 'Role-Based Access', desc: 'Four distinct roles'        },
            { label: 'Bulk Assignment',   desc: 'Assign tests to 60+ samples at once' },
            { label: 'PDF Reports',       desc: 'Per-sample full reports'    },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-white font-semibold text-sm">{item.label}</p>
              <p className="text-brand-200 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <FlaskConical size={22} className="text-brand-700" />
            <span className="font-display text-xl font-bold text-gray-900">CoalLIMS</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in with your lab username.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username <span className="text-brand-600">*</span></label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="input pl-9 font-mono"
                  placeholder="firstname.relims"
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Format: firstname.relims</p>
            </div>

            <div>
              <label className="label">Password <span className="text-brand-600">*</span></label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Default password is your username</p>
            </div>

            <Alert type="error" message={error} />

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 p-3 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-500 text-center font-mono">
              superadmin.relims / superadmin.relims
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
