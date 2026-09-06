import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileWarning,
  Fingerprint,
  Flag,
  Hash,
  Headphones,
  Heart,
  HelpCircle,
  IndianRupee,
  Info,
  Lock,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneOff,
  PiggyBank,
  QrCode,
  Scale,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

// ─── Mock Fraud Alerts ──────────────────────────────────────────────────────
const FRAUD_ALERTS = [
  {
    id: 'FA-001',
    type: 'UPI_FRAUD',
    title: 'Fake UPI Collect Request — ₹49,999',
    description: 'UPI collect request from merchant "POLICE-CYBER-CELL" via PhonePe. This is NOT an official payment request. Police never send UPI collect requests.',
    severity: 'CRITICAL',
    timestamp: '2026-09-06T12:30:00',
    beneficiary: 'p.sharma8892@ybl',
    amount: 49999,
    status: 'BLOCKED',
  },
  {
    id: 'FA-002',
    type: 'NEFT_FRAUD',
    title: 'Suspicious NEFT Transfer to Mule Account',
    description: 'NEFT transfer attempted to flagged mule account at XYZ Co-op Bank. Account has 47 fraud reports in the last 30 days.',
    severity: 'HIGH',
    timestamp: '2026-09-06T11:15:00',
    beneficiary: 'ACCT-9872143XXX',
    amount: 150000,
    status: 'PENDING_REVIEW',
  },
  {
    id: 'FA-003',
    type: 'VISHING',
    title: 'Voice Phishing Call Detected — SBI Officer Impersonation',
    description: 'AI-synthesized voice detected impersonating SBI branch manager. Caller demanded OTP for "KYC verification". VoiceShield blocked the call.',
    severity: 'CRITICAL',
    timestamp: '2026-09-06T10:45:00',
    beneficiary: '+91 98721 00412',
    amount: 0,
    status: 'BLOCKED',
  },
];

const EVIDENCE_VAULT = [
  { id: 'EV-001', type: 'AUDIO', filename: 'call_recording_20260906.wav', sha256: 'a7f3c8d1e9b2f4a6...', timestamp: '2026-09-06T12:30:00', size: '4.2 MB', case_id: 'CASE-2847', verified: true },
  { id: 'EV-002', type: 'SCREENSHOT', filename: 'upi_scam_screenshot.png', sha256: 'b8e4d2c7f1a3b5e9...', timestamp: '2026-09-06T11:15:00', size: '1.8 MB', case_id: 'CASE-2847', verified: true },
  { id: 'EV-003', type: 'CHAT_LOG', filename: 'whatsapp_conversation.txt', sha256: 'c9f5e3d8a2b4c6f1...', timestamp: '2026-09-06T10:45:00', size: '24 KB', case_id: 'CASE-2848', verified: false },
  { id: 'EV-004', type: 'DOCUMENT', filename: 'fake_letter_police.pdf', sha256: 'd1a6f4e9b3c5d7a2...', timestamp: '2026-09-05T18:20:00', size: '892 KB', case_id: 'CASE-2848', verified: true },
];

const FRAUD_STATS = {
  total_blocked_30d: 1247,
  total_saved_amount: 8450000,
  vishing_attempts_30d: 342,
  upi_frauds_30d: 478,
  active_cases: 23,
  conviction_rate: 67,
};

const HELPLINE_NUMBERS = [
  { name: 'National Cyber Crime Helpline', number: '1930', description: 'Government of India — 24/7', active: true },
  { name: 'RBI Fraud Helpline', number: '14440', description: 'Reserve Bank of India', active: true },
  { name: 'CERT-In', number: 'incident@cert-in.org.in', description: 'Computer Emergency Response Team', active: true },
  { name: 'Nearest Police Station', number: '100', description: 'Emergency Services', active: true },
];

export const FraudPreventionCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'vault' | 'victim' | 'stats'>('alerts');

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 tracking-wide uppercase font-sans">
              Digital Fraud Prevention
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Fraud Prevention & Victim Support Center
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl font-sans">
            Money transfer fraud alerts, voice phishing protection, tamper-evident digital evidence vault, and comprehensive victim support resources.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block font-sans">Amount Saved (30d)</span>
            <span className="text-lg font-black text-emerald-700 font-sans">₹{(FRAUD_STATS.total_saved_amount / 100000).toFixed(1)}L</span>
          </div>
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
            <span className="text-[10px] text-red-600 uppercase tracking-wider font-semibold block font-sans">Frauds Blocked</span>
            <span className="text-lg font-black text-red-700 font-mono">{FRAUD_STATS.total_blocked_30d}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-sm w-fit">
        {[
          { id: 'alerts', label: 'Fraud Alerts', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { id: 'vault', label: 'Evidence Vault', icon: <Lock className="w-3.5 h-3.5" /> },
          { id: 'victim', label: 'Victim Support', icon: <Heart className="w-3.5 h-3.5" /> },
          { id: 'stats', label: 'Fraud Statistics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-sans font-medium flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Fraud Alerts Tab ─── */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Vishing Shield Status */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-sans">Vishing Shield — ACTIVE</h3>
                  <p className="text-xs text-slate-300 font-sans">Real-time voice phishing protection across all monitored trunks</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-emerald-400">{FRAUD_STATS.vishing_attempts_30d}</span>
                  <span className="text-xs text-slate-300 block font-sans">Vishing blocked (30d)</span>
                </div>
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'AI Voice Detection', status: 'ACTIVE', color: 'text-emerald-400' },
                { label: 'OTP Demand Detection', status: 'ACTIVE', color: 'text-emerald-400' },
                { label: 'Authority Impersonation', status: 'ACTIVE', color: 'text-emerald-400' },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-sans">{s.label}</span>
                  <span className={`text-xs font-bold font-sans ${s.color}`}>● {s.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Alert Feed */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" /> Recent Fraud Alerts
            </h3>
            {FRAUD_ALERTS.map((alert) => (
              <div key={alert.id} className={`p-5 rounded-2xl border-2 space-y-3 transition-all hover:shadow-md ${
                alert.severity === 'CRITICAL' ? 'border-red-200 bg-gradient-to-r from-red-50/80 to-white' :
                'border-amber-200 bg-gradient-to-r from-amber-50/80 to-white'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      alert.type === 'VISHING' ? 'bg-red-100 text-red-600' :
                      alert.type === 'UPI_FRAUD' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {alert.type === 'VISHING' ? <PhoneOff className="w-5 h-5" /> :
                       alert.type === 'UPI_FRAUD' ? <Smartphone className="w-5 h-5" /> :
                       <Banknote className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-sans">{alert.title}</h4>
                      <span className="text-[10px] font-mono text-slate-500">{alert.id} • {new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${getSeverityStyle(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      alert.status === 'BLOCKED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {alert.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-sans leading-relaxed">{alert.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-xs font-sans text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {alert.beneficiary}
                    </span>
                    {alert.amount > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-red-600">
                        <IndianRupee className="w-3 h-3" /> {alert.amount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold font-sans flex items-center gap-1.5 transition-all shadow-sm">
                    <Eye className="w-3 h-3" /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Evidence Vault Tab ─── */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-900 font-sans">Tamper-Evident Digital Evidence Vault</h3>
              </div>
              <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-sans">
                SHA-256 Integrity Protected
              </span>
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              All evidence is stored with SHA-256 cryptographic hashes and immutable timestamps. Any modification to the evidence automatically invalidates the hash, ensuring forensic integrity for court proceedings.
            </p>

            <div className="space-y-3">
              {EVIDENCE_VAULT.map((evidence) => (
                <div key={evidence.id} className="p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        evidence.type === 'AUDIO' ? 'bg-blue-100 text-blue-600' :
                        evidence.type === 'SCREENSHOT' ? 'bg-amber-100 text-amber-600' :
                        evidence.type === 'CHAT_LOG' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-violet-100 text-violet-600'
                      }`}>
                        {evidence.type === 'AUDIO' ? <PhoneCall className="w-4 h-4" /> :
                         evidence.type === 'SCREENSHOT' ? <Eye className="w-4 h-4" /> :
                         evidence.type === 'CHAT_LOG' ? <MessageSquare className="w-4 h-4" /> :
                         <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-900 font-sans block">{evidence.filename}</span>
                        <span className="text-[10px] text-slate-500 font-sans">{evidence.type} • {evidence.size} • Case: {evidence.case_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {evidence.verified ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 text-slate-300 font-mono text-[10px] mt-2 flex items-center justify-between">
                    <span>SHA-256: {evidence.sha256}</span>
                    <span className="text-slate-500">{new Date(evidence.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Victim Support Tab ─── */}
      {activeTab === 'victim' && (
        <div className="space-y-6">
          {/* Emergency Action Steps */}
          <div className="bg-gradient-to-r from-red-50 to-red-100/30 rounded-2xl border-2 border-red-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold text-red-800 font-sans">If You Are Currently Being Scammed — Do This NOW</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: '1', title: 'HANG UP IMMEDIATELY', description: 'Do NOT share OTP, PIN, password, or make any payment. Hang up the call right now.', icon: <PhoneOff className="w-6 h-6" />, color: 'bg-red-600 text-white' },
                { step: '2', title: 'CALL 1930', description: 'National Cyber Crime Helpline. Report within 1 hour for maximum chance of recovering money.', icon: <Phone className="w-6 h-6" />, color: 'bg-blue-600 text-white' },
                { step: '3', title: 'BLOCK & FREEZE', description: 'Call your bank immediately. Request account freeze if any transaction was made. Block the scammer\'s number.', icon: <Lock className="w-6 h-6" />, color: 'bg-amber-600 text-white' },
              ].map((step) => (
                <div key={step.step} className="p-5 rounded-xl bg-white border border-red-200 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center`}>
                      {step.icon}
                    </div>
                    <div>
                      <span className="text-[10px] text-red-500 font-bold uppercase font-sans">Step {step.step}</span>
                      <h4 className="text-sm font-bold text-slate-900 font-sans">{step.title}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Helpline Numbers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Headphones className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900 font-sans">Emergency Helpline Numbers</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HELPLINE_NUMBERS.map((line) => (
                <div key={line.name} className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-slate-900 font-sans block">{line.name}</span>
                    <span className="text-lg font-black text-blue-700 font-mono block">{line.number}</span>
                    <span className="text-[10px] text-slate-500 font-sans">{line.description}</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Guide */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900 font-sans">Step-by-Step Recovery Guide</h3>
            </div>
            <div className="space-y-3">
              {[
                { step: 1, title: 'Document Everything', detail: 'Save call recordings, screenshots, chat messages, transaction receipts, and any communication from the fraudster.' },
                { step: 2, title: 'File Online FIR', detail: 'Visit cybercrime.gov.in and file a complaint with all evidence. Note down the complaint reference number.' },
                { step: 3, title: 'Contact Your Bank', detail: 'Call your bank\'s fraud helpline immediately. Request reversal of any unauthorized transactions and temporary account freeze.' },
                { step: 4, title: 'Report on VoiceShield', detail: 'Use our Report Scam feature to add the fraudster\'s number to our threat intelligence database, helping protect others.' },
                { step: 5, title: 'Use VoiceShield Evidence Vault', detail: 'Upload all evidence to our tamper-evident vault. We\'ll generate an integrity-verified incident report suitable for police filing.' },
                { step: 6, title: 'Follow Up Regularly', detail: 'Check your complaint status on cybercrime.gov.in regularly. Contact the investigating officer assigned to your case.' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900 font-sans block">{item.title}</span>
                    <p className="text-xs text-slate-600 font-sans leading-relaxed mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Stats Tab ─── */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Frauds Blocked', value: FRAUD_STATS.total_blocked_30d.toLocaleString(), icon: <Shield className="w-5 h-5 text-emerald-600" />, color: 'bg-emerald-50 border-emerald-200', valueColor: 'text-emerald-700' },
              { label: 'Amount Saved', value: `₹${(FRAUD_STATS.total_saved_amount / 100000).toFixed(1)}L`, icon: <PiggyBank className="w-5 h-5 text-blue-600" />, color: 'bg-blue-50 border-blue-200', valueColor: 'text-blue-700' },
              { label: 'Vishing Blocked', value: String(FRAUD_STATS.vishing_attempts_30d), icon: <PhoneOff className="w-5 h-5 text-red-600" />, color: 'bg-red-50 border-red-200', valueColor: 'text-red-700' },
              { label: 'UPI Frauds', value: String(FRAUD_STATS.upi_frauds_30d), icon: <Smartphone className="w-5 h-5 text-amber-600" />, color: 'bg-amber-50 border-amber-200', valueColor: 'text-amber-700' },
              { label: 'Active Cases', value: String(FRAUD_STATS.active_cases), icon: <FileWarning className="w-5 h-5 text-violet-600" />, color: 'bg-violet-50 border-violet-200', valueColor: 'text-violet-700' },
              { label: 'Conviction Rate', value: `${FRAUD_STATS.conviction_rate}%`, icon: <Scale className="w-5 h-5 text-cyan-600" />, color: 'bg-cyan-50 border-cyan-200', valueColor: 'text-cyan-700' },
            ].map((stat) => (
              <div key={stat.label} className={`p-4 rounded-xl border ${stat.color} text-center`}>
                <div className="flex items-center justify-center mb-2">{stat.icon}</div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block font-sans">{stat.label}</span>
                <span className={`text-xl font-black font-mono ${stat.valueColor} block mt-1`}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Top Scam Categories */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" /> Top Scam Categories (Last 30 Days)
            </h3>
            <div className="space-y-3">
              {[
                { category: 'UPI / Payment Fraud', count: 478, percent: 38, color: 'bg-amber-500' },
                { category: 'Voice Phishing (Vishing)', count: 342, percent: 27, color: 'bg-red-500' },
                { category: 'Bank Impersonation', count: 189, percent: 15, color: 'bg-blue-500' },
                { category: 'KYC / SIM Block Scam', count: 134, percent: 11, color: 'bg-violet-500' },
                { category: 'Tech Support Scam', count: 67, percent: 5, color: 'bg-cyan-500' },
                { category: 'Other', count: 37, percent: 4, color: 'bg-slate-400' },
              ].map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-slate-700 font-medium">{cat.category}</span>
                    <span className="font-mono font-semibold text-slate-900">{cat.count} <span className="text-slate-400">({cat.percent}%)</span></span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${cat.color} transition-all duration-1000`} style={{ width: `${cat.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Monthly Fraud Trend (2026)
            </h3>
            <div className="flex items-end gap-2 h-40 px-4">
              {[
                { month: 'Jan', value: 45 }, { month: 'Feb', value: 52 }, { month: 'Mar', value: 68 },
                { month: 'Apr', value: 73 }, { month: 'May', value: 85 }, { month: 'Jun', value: 91 },
                { month: 'Jul', value: 78 }, { month: 'Aug', value: 95 }, { month: 'Sep', value: 100 },
              ].map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-slate-500">{item.value}%</span>
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500"
                    style={{ height: `${item.value}%` }}
                  />
                  <span className="text-[10px] font-semibold text-slate-600 font-sans">{item.month}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-sans flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span><strong>Trend Alert:</strong> Voice phishing attempts have increased 42% since June 2026. Synthetic AI voice cloning attacks are the fastest growing category.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
