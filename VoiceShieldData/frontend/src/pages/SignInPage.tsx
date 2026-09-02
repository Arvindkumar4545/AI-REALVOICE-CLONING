import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Shield, Lock, Mail, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminAccess, setIsAdminAccess] = useState(false);
  const [adminOtp, setAdminOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password, isAdminAccess ? adminOtp : undefined);
      // If it's an admin login, we can forcefully redirect to investigation or let the route redirect handle it
      navigate(isAdminAccess ? '/investigation' : from, { replace: true });
    } catch (err: any) {
      // Extract field-level validation errors if available
      const errorDetails = err.response?.data?.error?.details;
      if (Array.isArray(errorDetails) && errorDetails.length > 0) {
        // Format Zod validation errors for display
        const fieldErrors = errorDetails
          .map((err: any) => `${err.path?.join('.')} - ${err.message}`)
          .join('; ');
        setError(fieldErrors || 'Validation failed. Please check your input.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Authentication failed. Please verify credentials.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 cyber-grid-bg">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-gray-200 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#3B82F6] p-0.5 mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <div className="w-full h-full bg-[#020817] rounded-[14px] flex items-center justify-center">
              <Shield className="w-6 h-6 text-gray-900" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Enterprise Sign In
          </h1>
          <p className="text-xs text-gray-600 font-mono">
            Access calibrated SOC telemetry & voice security controls
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
            <span className="text-xs font-mono font-semibold text-gray-700">Law Enforcement / Admin Access</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAdminAccess} onChange={(e) => setIsAdminAccess(e.target.checked)} />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-gray-600 font-semibold block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@enterprise.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="text-gray-600 font-semibold">Password</label>
              <Link to="/forgot-password" className="text-gray-900 hover:text-[#38BDF8]">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="������������"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
              />
            </div>
          </div>

          {isAdminAccess && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-mono text-gray-600 font-semibold block">Authorization OTP</label>
              <div className="relative">
                <Shield className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={adminOtp}
                  onChange={(e) => setAdminOtp(e.target.value)}
                  placeholder="Enter 6-digit code (Demo: 123456)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#2563EB] text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all hover:scale-[1.01]"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Sign In to SOC Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-200 text-xs text-gray-600">
          Don't have an enterprise account?{' '}
          <Link to="/signup" className="text-gray-900 font-semibold hover:underline">
            Register Organization
          </Link>
        </div>
      </div>
    </div>
  );
};
