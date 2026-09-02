import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Mail, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email);
      setMessage(res.message || 'Password reset instructions have been dispatched.');
    } catch (err: any) {
      setError('Failed to dispatch reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white">Reset Password</h2>
          <p className="text-xs text-slate-400">
            Enter your registered email to receive a password recovery token.
          </p>
        </div>

        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@voiceshield.ai"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-cyber-primary text-sm py-3 disabled:opacity-50"
          >
            {loading ? 'Sending Instructions...' : 'Send Reset Instructions'}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/signin" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
