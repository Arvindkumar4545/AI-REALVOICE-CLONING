import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Download,
  Eye,
  FileWarning,
  Fingerprint,
  Flag,
  Globe,
  HardDrive,
  Hash,
  Laptop,
  Lock,
  MapPin,
  Monitor,
  MousePointer,
  Network,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Smartphone,
  Terminal,
  Wifi,
  Zap,
} from 'lucide-react';

// ─── Mock Suspicious Sessions ───────────────────────────────────────────────
const MOCK_SESSIONS = [
  {
    session_id: 'SES-78291',
    ip_address: '203.0.113.45',
    geolocation: { country: 'India', city: 'Delhi', region: 'NCT', lat: 28.6139, lng: 77.2090, isp: 'Jio Fiber Broadband', asn: 'AS55836', timezone: 'IST (UTC+5:30)' },
    device: { browser: 'Chrome 128.0.6613.113', os: 'Windows 11 Pro', screen: '1920×1080', language: 'en-IN', gpu: 'NVIDIA RTX 3060', cores: 8, ram_gb: 16, touch: false },
    risk_score: 92,
    risk_level: 'CRITICAL' as const,
    anomalies: ['Impossible Travel', 'Rapid API Calls', 'Multiple Failed Logins', 'Bot-Like Behavior'],
    timestamp: '2026-09-06T12:45:32+05:30',
    duration: '00:04:12',
    pages_visited: ['/signin', '/detect', '/api/v1/detection', '/api/v1/detection', '/api/v1/detection', '/api/v1/admin/users'],
    forms_submitted: ['login_attempt (3x failed)', 'audio_upload (7x rapid)', 'admin_access (1x unauthorized)'],
    transaction_logs: ['POST /auth/signin — 401 (3x)', 'POST /detection — 200 (7x in 30s)', 'GET /admin/overview — 403'],
    status: 'ACTIVE' as const,
    fraud_type: 'API Abuse / Credential Stuffing',
    fingerprint_hash: 'fp_8a3c7d1e9b2f4a6c',
  },
  {
    session_id: 'SES-78290',
    ip_address: '198.51.100.72',
    geolocation: { country: 'Nigeria', city: 'Lagos', region: 'Lagos State', lat: 6.5244, lng: 3.3792, isp: 'MTN Nigeria', asn: 'AS29465', timezone: 'WAT (UTC+1)' },
    device: { browser: 'Firefox 130.0', os: 'Ubuntu 24.04', screen: '1366×768', language: 'en-US', gpu: 'Mesa Intel', cores: 4, ram_gb: 8, touch: false },
    risk_score: 78,
    risk_level: 'HIGH' as const,
    anomalies: ['VPN/Proxy Detected', 'Tor Exit Node', 'Suspicious User-Agent'],
    timestamp: '2026-09-06T11:22:15+05:30',
    duration: '00:12:45',
    pages_visited: ['/signup', '/detect', '/report', '/history'],
    forms_submitted: ['signup (1x)', 'audio_upload (2x)', 'report_submission (1x — phishing content)'],
    transaction_logs: ['POST /auth/signup — 201', 'POST /detection — 200 (2x)', 'POST /reports — 201 (suspicious content)'],
    status: 'FLAGGED' as const,
    fraud_type: 'Phishing Report Abuse',
    fingerprint_hash: 'fp_2d5f8e3a1c7b9d4e',
  },
  {
    session_id: 'SES-78289',
    ip_address: '10.0.0.15',
    geolocation: { country: 'India', city: 'Mumbai', region: 'Maharashtra', lat: 19.0760, lng: 72.8777, isp: 'Airtel Business', asn: 'AS9498', timezone: 'IST (UTC+5:30)' },
    device: { browser: 'Safari 18.0', os: 'macOS Sequoia 15.1', screen: '2560×1600', language: 'en-IN', gpu: 'Apple M4 Pro', cores: 12, ram_gb: 36, touch: false },
    risk_score: 8,
    risk_level: 'SAFE' as const,
    anomalies: [],
    timestamp: '2026-09-06T10:05:00+05:30',
    duration: '00:45:22',
    pages_visited: ['/signin', '/detect', '/dashboard', '/history', '/profile'],
    forms_submitted: ['login (1x success)', 'audio_upload (3x)'],
    transaction_logs: ['POST /auth/signin — 200', 'POST /detection — 200 (3x)', 'GET /history — 200', 'GET /statistics — 200'],
    status: 'NORMAL' as const,
    fraud_type: 'None',
    fingerprint_hash: 'fp_9c1a4b7e3d8f2e6a',
  },
];

// ─── Fraud Heat Map Data ────────────────────────────────────────────────────
const HEATMAP_DATA = [
  { country: 'India', city: 'Delhi', incidents: 234, lat: 28.6139, lng: 77.2090, severity: 'high' },
  { country: 'India', city: 'Mumbai', incidents: 156, lat: 19.0760, lng: 72.8777, severity: 'medium' },
  { country: 'Nigeria', city: 'Lagos', incidents: 89, lat: 6.5244, lng: 3.3792, severity: 'high' },
  { country: 'USA', city: 'Houston', incidents: 67, lat: 29.7604, lng: -95.3698, severity: 'medium' },
  { country: 'UK', city: 'London', incidents: 45, lat: 51.5074, lng: -0.1278, severity: 'low' },
  { country: 'Pakistan', city: 'Karachi', incidents: 78, lat: 24.8607, lng: 67.0011, severity: 'high' },
  { country: 'Bangladesh', city: 'Dhaka', incidents: 34, lat: 23.8103, lng: 90.4125, severity: 'medium' },
];

export const FraudDetectionDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = useState(MOCK_SESSIONS[0]);
  const [activeView, setActiveView] = useState<'sessions' | 'heatmap' | 'patterns'>('sessions');
  const [searchTerm, setSearchTerm] = useState('');
  const [blockedIPs, setBlockedIPs] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleBlockIP = (ip: string) => {
    setBlockedIPs((prev) => {
      const next = new Set(prev);
      if (next.has(ip)) {
        next.delete(ip);
        showToast(`Unblocked IP ${ip}`);
      } else {
        next.add(ip);
        showToast(`🚨 IP ${ip} blocked & added to Gateway WAF rule list`);
      }
      return next;
    });
  };

  const handleExportSession = (session: typeof MOCK_SESSIONS[0]) => {
    const jsonStr = JSON.stringify(session, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fraud-Dossier-${session.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Forensic JSON dossier exported for ${session.session_id}`);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'SAFE': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-red-500 animate-pulse';
      case 'FLAGGED': return 'bg-amber-500';
      case 'NORMAL': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200">
            <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
            <span className="text-xs font-semibold text-red-700 tracking-wide uppercase font-sans">
              Fraud Intelligence Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Advanced Fraud Detection Dashboard
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl font-sans">
            Real-time session forensics, device fingerprinting, IP geolocation analysis, and fraud pattern recognition for suspicious activity on your platform.
          </p>
        </div>

        {/* Live Stats */}
        <div className="flex gap-3">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
            <span className="text-[10px] text-red-600 uppercase tracking-wider font-semibold block font-sans">Active Threats</span>
            <span className="text-xl font-black text-red-700 font-mono">3</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold block font-sans">Flagged Today</span>
            <span className="text-xl font-black text-amber-700 font-mono">12</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block font-sans">Blocked</span>
            <span className="text-xl font-black text-emerald-700 font-mono">847</span>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-sm w-fit">
        {[
          { id: 'sessions', label: 'Suspicious Sessions', icon: <Monitor className="w-3.5 h-3.5" /> },
          { id: 'heatmap', label: 'Fraud Heat Map', icon: <Globe className="w-3.5 h-3.5" /> },
          { id: 'patterns', label: 'Pattern Analysis', icon: <Network className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-sans font-medium flex items-center gap-2 transition-all ${
              activeView === tab.id
                ? 'bg-slate-900 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions View */}
      {activeView === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Session List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IP, session ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-300 font-sans"
              />
            </div>

            {MOCK_SESSIONS.map((session) => (
              <button
                key={session.session_id}
                onClick={() => setSelectedSession(session)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  selectedSession.session_id === session.session_id
                    ? 'bg-red-50/60 border-red-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(session.status)}`} />
                    <span className="text-sm font-bold font-mono text-slate-900">{session.session_id}</span>
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${getRiskColor(session.risk_level)}`}>
                    {session.risk_score}% RISK
                  </span>
                </div>
                <div className="text-xs font-sans text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    <span className="font-mono">{session.ip_address}</span>
                    <span className="text-slate-400">• {session.geolocation.city}, {session.geolocation.country}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Laptop className="w-3 h-3" />
                    <span className="truncate">{session.device.browser.split(' ')[0]} / {session.device.os.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                  {session.anomalies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {session.anomalies.slice(0, 2).map((a, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-semibold border border-red-200">{a}</span>
                      ))}
                      {session.anomalies.length > 2 && (
                        <span className="text-[9px] text-slate-500">+{session.anomalies.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Session Detail */}
          <div className="lg:col-span-8 space-y-6">
            {/* Session Header */}
            <div className={`p-6 rounded-2xl border shadow-sm ${
              selectedSession.risk_level === 'CRITICAL' ? 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200' :
              selectedSession.risk_level === 'HIGH' ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200' :
              'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-bold font-mono text-slate-900">{selectedSession.session_id}</span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getRiskColor(selectedSession.risk_level)}`}>
                      {selectedSession.risk_level} — {selectedSession.risk_score}%
                    </span>
                  </div>
                  <span className="text-sm text-slate-600 font-sans">{selectedSession.fraud_type}</span>
                </div>
                <div className="text-right text-xs font-sans text-slate-500">
                  <div className="font-mono">{new Date(selectedSession.timestamp).toLocaleString()}</div>
                  <div>Duration: <strong>{selectedSession.duration}</strong></div>
                </div>
              </div>

              {/* Anomaly Tags */}
              {selectedSession.anomalies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSession.anomalies.map((anomaly, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-xs font-semibold font-sans flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> {anomaly}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* IP & Geolocation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900 font-sans">IP Address & Geolocation</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-sans">
                {[
                  { label: 'IP Address', value: selectedSession.ip_address },
                  { label: 'Country', value: selectedSession.geolocation.country },
                  { label: 'City', value: selectedSession.geolocation.city },
                  { label: 'ISP', value: selectedSession.geolocation.isp },
                  { label: 'ASN', value: selectedSession.geolocation.asn },
                  { label: 'Timezone', value: selectedSession.geolocation.timezone },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">{item.label}</span>
                    <span className="font-semibold text-slate-900 font-mono mt-0.5 block">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Fingerprint */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-900 font-sans">Device Fingerprint</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{selectedSession.fingerprint_hash}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                {[
                  { label: 'Browser', value: selectedSession.device.browser, icon: <Globe className="w-4 h-4 text-blue-500" /> },
                  { label: 'OS', value: selectedSession.device.os, icon: <Monitor className="w-4 h-4 text-violet-500" /> },
                  { label: 'Screen', value: selectedSession.device.screen, icon: <Laptop className="w-4 h-4 text-cyan-500" /> },
                  { label: 'Language', value: selectedSession.device.language, icon: <Globe className="w-4 h-4 text-emerald-500" /> },
                  { label: 'GPU', value: selectedSession.device.gpu, icon: <Cpu className="w-4 h-4 text-amber-500" /> },
                  { label: 'CPU Cores', value: String(selectedSession.device.cores), icon: <Server className="w-4 h-4 text-red-500" /> },
                  { label: 'RAM', value: `${selectedSession.device.ram_gb} GB`, icon: <HardDrive className="w-4 h-4 text-blue-500" /> },
                  { label: 'Touch', value: selectedSession.device.touch ? 'Yes' : 'No', icon: <Smartphone className="w-4 h-4 text-violet-500" /> },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      {item.icon}
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{item.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900 text-[11px] block truncate">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Activity Log */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Terminal className="w-5 h-5 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900 font-sans">Session Activity Log</h3>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold font-sans">Pages Visited</span>
                <div className="flex flex-wrap gap-2">
                  {selectedSession.pages_visited.map((page, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200">{page}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold font-sans">Forms Submitted</span>
                {selectedSession.forms_submitted.map((form, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 text-xs font-mono text-amber-800 flex items-center gap-2">
                    <MousePointer className="w-3.5 h-3.5 text-amber-600" />
                    {form}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold font-sans">Transaction Logs</span>
                <div className="bg-slate-900 rounded-xl p-4 space-y-1.5 font-mono text-[11px]">
                  {selectedSession.transaction_logs.map((log, idx) => (
                    <div key={idx} className={`flex items-center gap-2 ${
                      log.includes('401') || log.includes('403') ? 'text-red-400' :
                      log.includes('201') ? 'text-emerald-400' :
                      'text-slate-300'
                    }`}>
                      <span className="text-slate-600">{`[${idx + 1}]`}</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fraudster ID Card */}
            {selectedSession.risk_level === 'CRITICAL' && (
              <div className="bg-gradient-to-br from-red-50 to-red-100/30 rounded-2xl border-2 border-red-200 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-bold text-red-800 font-sans uppercase tracking-wider">Auto-Generated Fraudster ID Card</h3>
                  </div>
                  <button
                    onClick={() => handleToggleBlockIP(selectedSession.ip_address)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      blockedIPs.has(selectedSession.ip_address)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{blockedIPs.has(selectedSession.ip_address) ? 'Unblock IP' : 'Block IP'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                  <div className="p-3 rounded-xl bg-white border border-red-200">
                    <span className="text-[10px] text-red-600 block font-semibold uppercase">IP Address</span>
                    <span className="font-mono font-bold text-slate-900">{selectedSession.ip_address}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-red-200">
                    <span className="text-[10px] text-red-600 block font-semibold uppercase">Location</span>
                    <span className="font-semibold text-slate-900">{selectedSession.geolocation.city}, {selectedSession.geolocation.country}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-red-200">
                    <span className="text-[10px] text-red-600 block font-semibold uppercase">Device Fingerprint</span>
                    <span className="font-mono font-bold text-slate-900">{selectedSession.fingerprint_hash}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-red-200">
                    <span className="text-[10px] text-red-600 block font-semibold uppercase">Fraud Type</span>
                    <span className="font-semibold text-red-700">{selectedSession.fraud_type}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExportSession(selectedSession)}
                    className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" /> Export Forensic JSON Dossier
                  </button>
                  <button
                    onClick={() => navigate('/report')}
                    className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <FileWarning className="w-4 h-4" /> File Police Complaint PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Heat Map View */}
      {activeView === 'heatmap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" /> Global Fraud Incident Heat Map
          </h3>
          
          {/* Map Placeholder with Data Overlay */}
          <div className="relative h-80 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden border border-slate-700">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-7 gap-4 p-8 w-full max-w-2xl">
                {HEATMAP_DATA.map((point, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 group">
                    <div className={`rounded-full transition-all group-hover:scale-150 ${
                      point.severity === 'high' ? 'w-6 h-6 bg-red-500/70 animate-ping-slow shadow-lg shadow-red-500/30' :
                      point.severity === 'medium' ? 'w-5 h-5 bg-amber-500/70 shadow-lg shadow-amber-500/30' :
                      'w-4 h-4 bg-emerald-500/70'
                    }`} />
                    <span className="text-[9px] text-white/70 font-mono text-center">{point.city}</span>
                    <span className="text-[10px] text-white font-bold font-mono">{point.incidents}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 text-left font-semibold">Location</th>
                  <th className="p-3 text-left font-semibold">Incidents</th>
                  <th className="p-3 text-left font-semibold">Severity</th>
                  <th className="p-3 text-left font-semibold">Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {HEATMAP_DATA.sort((a, b) => b.incidents - a.incidents).map((point, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{point.city}, {point.country}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{point.incidents}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        point.severity === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                        point.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {point.severity}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pattern Analysis View */}
      {activeView === 'patterns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" /> Fraud Pattern Recognition
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  pattern: 'Credential Stuffing',
                  description: 'Multiple failed login attempts from same device fingerprint with different email addresses',
                  occurrences: 23,
                  severity: 'CRITICAL',
                  indicators: ['Rapid login attempts', 'Rotating emails', 'Same IP range'],
                },
                {
                  pattern: 'API Abuse / Scraping',
                  description: 'Abnormally high rate of detection API calls suggesting automated abuse or data harvesting',
                  occurrences: 8,
                  severity: 'HIGH',
                  indicators: ['100+ calls/minute', 'Sequential file names', 'No UI interaction'],
                },
                {
                  pattern: 'Phishing Kit Deployment',
                  description: 'Suspicious report submissions containing phishing URLs and social engineering content',
                  occurrences: 5,
                  severity: 'HIGH',
                  indicators: ['Fake bank URLs', 'OTP phishing pages', 'Clone site detection'],
                },
              ].map((pattern, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 font-sans">{pattern.pattern}</span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${getRiskColor(pattern.severity)}`}>
                      {pattern.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">{pattern.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pattern.indicators.map((ind, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-sans border border-slate-200">{ind}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-sans">
                    <span className="text-slate-500">Occurrences (30d)</span>
                    <span className="font-bold font-mono text-red-600">{pattern.occurrences}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
