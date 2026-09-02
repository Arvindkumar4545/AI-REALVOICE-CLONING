import React from 'react';
import { useAuth } from '../store/AuthContext';
import { User, Shield, Key, Mail, Building, Calendar, CheckCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen pt-10 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 cyber-grid-bg">
      <div className="border-b border-gray-200 pb-6 space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-xs font-mono text-gray-900 font-semibold">
          <User className="w-3.5 h-3.5 text-gray-900" />
          <span>Security Operator Profile</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          OPERATOR CREDENTIALS & ACCESS
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Manage security privileges, authentication keys, and role-based clearance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="glass-panel p-6 rounded-3xl border border-gray-200 text-center space-y-4 md:col-span-1">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#3B82F6] p-0.5 mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <div className="w-full h-full bg-[#020817] rounded-[14px] flex items-center justify-center">
              <User className="w-10 h-10 text-gray-900" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{user?.full_name || 'Security Analyst'}</h3>
            <p className="text-xs text-gray-900 font-mono">{user?.role || 'SOC_ANALYST_L2'}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.30)] text-[10px] font-mono text-[#10B981] font-semibold">
            <CheckCircle className="w-3 h-3" />
            <span>MFA ENFORCED</span>
          </div>
        </div>

        {/* Details Card */}
        <div className="glass-panel p-6 rounded-3xl border border-gray-200 space-y-4 md:col-span-2">
          <h4 className="text-sm font-bold text-gray-900 font-mono uppercase border-b border-gray-200 pb-3">
            Account Specifications
          </h4>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-900" /> Email Address
              </span>
              <span className="text-gray-900 font-semibold">{user?.email || 'analyst@enterprise.com'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#3B82F6]" /> Organization Cluster
              </span>
              <span className="text-gray-900 font-semibold">VoiceShield SOC Primary Node</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#6366F1]" /> Cryptographic Key ID
              </span>
              <span className="text-gray-900 font-semibold">VS-KEY-88192-ECDSA</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#10B981]" /> Session Expiration
              </span>
              <span className="text-gray-900 font-semibold">Active (Auto-Refreshed via JWT)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
