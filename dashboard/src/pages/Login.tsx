import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('operator@shesecure.org');
  const [password, setPassword] = useState('OperatorPassword123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'operator' | 'viewer') => {
    if (role === 'admin') {
      setEmail('admin@shesecure.org');
      setPassword('AdminPassword123!');
    } else if (role === 'operator') {
      setEmail('operator@shesecure.org');
      setPassword('OperatorPassword123!');
    } else {
      setEmail('viewer@shesecure.org');
      setPassword('ViewerPassword123!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-xl shadow-rose-950/60 border border-rose-400/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-white tracking-tight">
          SheSecure Response Center
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Authorized Emergency Monitoring & Incident Response Console
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 py-8 px-4 shadow-2xl border border-slate-800 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase">
                Authority Email
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  placeholder="operator@shesecure.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase">
                Password
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Console'}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Quick Fill Test Accounts */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold text-center mb-2.5">
              Quick Switch Demo Roles
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('operator')}
                className="py-1.5 px-2 text-xs font-semibold rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-amber-300 transition-colors text-center"
              >
                Operator
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="py-1.5 px-2 text-xs font-semibold rounded bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-rose-300 transition-colors text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('viewer')}
                className="py-1.5 px-2 text-xs font-semibold rounded bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-blue-300 transition-colors text-center"
              >
                Viewer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
