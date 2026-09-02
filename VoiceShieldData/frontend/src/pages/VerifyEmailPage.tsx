import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing or invalid verification token in URL.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Email verified successfully.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Verification token is invalid or expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl">
        {status === 'verifying' && (
          <div className="space-y-3 py-6">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-bold text-white">Verifying Cryptographic Token...</h3>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Email Verified</h3>
            <p className="text-xs text-slate-300">{message}</p>
            <Link to="/signin" className="btn-cyber-primary text-sm py-2.5 px-6 inline-flex mt-2">
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Verification Failed</h3>
            <p className="text-xs text-red-300">{message}</p>
            <Link to="/signin" className="btn-cyber-secondary text-sm py-2.5 px-6 inline-flex mt-2">
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
