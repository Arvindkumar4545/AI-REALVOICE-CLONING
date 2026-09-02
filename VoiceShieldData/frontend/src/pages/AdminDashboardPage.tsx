import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { AdminTelemetry } from '../types';
import {
  ShieldAlert,
  Cpu,
  Activity,
  Users,
  HardDrive,
  Clock,
  Terminal,
  RefreshCw,
  Lock,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [telemetry, setTelemetry] = useState<AdminTelemetry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOverview();
      if (res.success && res.data) {
        setTelemetry(res.data);
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-800 text-purple-300 text-xs font-mono uppercase">
            <Lock className="w-3.5 h-3.5 text-purple-400" /> Elevated Security Operations Center
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Admin Command & Telemetry</h1>
          <p className="text-xs text-slate-400 mt-1">
            System infrastructure telemetry, ML model worker status, queue depth, and audit stream.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="btn-cyber-secondary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Telemetry
        </button>
      </div>

      {/* Threat Activity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Detections (24h)</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {telemetry?.telemetry?.total_detections_24h || 0}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {telemetry?.telemetry?.spoof_detected_24h || 0} spoof / {telemetry?.telemetry?.bona_fide_24h || 0} authentic
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Avg Risk Score</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">
            {telemetry?.telemetry?.average_risk_score_24h?.toFixed(1) || '0.0'}
          </div>
          <div className="text-[11px] text-red-400/80 font-mono">Forensic threat index</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Queue Depth</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {telemetry?.telemetry?.queue_depth || 0} jobs
          </div>
          <div className="text-[11px] text-amber-400/80 font-mono">BullMQ Async Workers</div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>ML Service Health</span>
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 uppercase">
            {telemetry?.telemetry?.ml_service_status || 'healthy'}
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">FastAPI + PyTorch GPU/CPU</div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" /> Realtime Security Audit Log Stream
        </h3>

        <div className="bg-slate-950/80 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2 max-h-72 overflow-y-auto border border-slate-800">
          {telemetry?.recent_audit_logs && telemetry.recent_audit_logs.length > 0 ? (
            telemetry.recent_audit_logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-2 border-b border-slate-900 pb-1">
                <span className="text-slate-500">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                <span className="text-cyan-400 font-bold">{log.action}</span>
                <span className="text-slate-400">({log.resource})</span>
                <span className="text-slate-500 ml-auto">IP: {log.ip_address || '127.0.0.1'}</span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 py-4 text-center">No recent audit log events.</div>
          )}
        </div>
      </div>
    </div>
  );
};
