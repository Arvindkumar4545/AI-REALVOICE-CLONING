import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Search,
  Filter,
  Download,
  Clock,
  Play,
  Square,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Radio,
  Server,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CallRecord {
  callId: string;
  callerNumber: string;
  recipient: string;
  duration: string;
  riskScore: number;
  confidence: number;
  threatType: string;
  status: 'BLOCKED' | 'ALLOWED' | 'REVIEWED';
  timestamp: string;
}

const SAMPLE_CALLS: CallRecord[] = [
  {
    callId: 'CALL-90412',
    callerNumber: '+1 (555) 019-2834',
    recipient: 'Wealth Ops Trunk 04',
    duration: '01:42',
    riskScore: 94.2,
    confidence: 0.99,
    threatType: 'Zero-Shot AI Voice Clone',
    status: 'BLOCKED',
    timestamp: '2026-08-31 21:14:02',
  },
  {
    callId: 'CALL-90411',
    callerNumber: '+44 20 7946 0912',
    recipient: 'Customer Support 12',
    duration: '03:15',
    riskScore: 12.0,
    confidence: 0.98,
    threatType: 'None (Genuine Human)',
    status: 'ALLOWED',
    timestamp: '2026-08-31 21:08:44',
  },
  {
    callId: 'CALL-90410',
    callerNumber: '+1 (555) 441-9982',
    recipient: 'Wire Authorization Desk',
    duration: '00:54',
    riskScore: 88.6,
    confidence: 0.96,
    threatType: 'Synthetic TTS HiFi-GAN Vocoder',
    status: 'BLOCKED',
    timestamp: '2026-08-31 20:55:19',
  },
  {
    callId: 'CALL-90409',
    callerNumber: '+1 (555) 782-1100',
    recipient: 'Executive Direct Line',
    duration: '02:08',
    riskScore: 56.4,
    confidence: 0.88,
    threatType: 'Acoustic Reverberation / Borderline',
    status: 'REVIEWED',
    timestamp: '2026-08-31 20:41:00',
  },
  {
    callId: 'CALL-90408',
    callerNumber: '+65 6789 0123',
    recipient: 'Claims Inbound Queue',
    duration: '04:22',
    riskScore: 8.5,
    confidence: 0.97,
    threatType: 'None (Genuine Human)',
    status: 'ALLOWED',
    timestamp: '2026-08-31 20:30:15',
  },
];

export const CallsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCallId, setSelectedCallId] = useState<string>(SAMPLE_CALLS[0].callId);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playProgress, setPlayProgress] = useState<number>(0);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 5;
        });
      }, 300);
    } else {
      setPlayProgress(0);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const selectedCall = SAMPLE_CALLS.find((c) => c.callId === selectedCallId) || SAMPLE_CALLS[0];

  const filteredCalls = SAMPLE_CALLS.filter((call) => {
    const matchesSearch =
      call.callId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.callerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.threatType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 cyber-grid-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-sans text-cyan-800 font-medium">
            <PhoneCall className="w-3.5 h-3.5 text-cyan-700" />
            <span>Voice Operations Monitoring Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight font-sans">
            Live Call Inspection Log
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 font-sans">
            Real-time telephonic SIP trunk voice inspections, duration, calibrated risk index, and policy decisions.
          </p>
        </div>

        <button className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-gray-200 hover:border-[#3B82F6] text-gray-900 text-xs font-sans font-medium flex items-center gap-2 transition-all shadow-sm">
          <Download className="w-4 h-4 text-gray-700" /> Export CSV Report
        </button>
      </div>

      {/* Telephony & SIPREC Trunk Health Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-semibold tracking-wider">SBC Trunk (SIPREC)</span>
              <span className="text-xs font-semibold text-gray-900 font-sans">Cisco CUBE Core-01</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
            Active • <span className="font-mono">18ms</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-semibold tracking-wider">PBX Media Fork</span>
              <span className="text-xs font-semibold text-gray-900 font-sans">Asterisk / FreeSWITCH</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-blue-50 border border-blue-200 text-blue-700">
            WS PCM • 3 ch
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-sans text-gray-500 uppercase block font-semibold tracking-wider">Transcoder Engine</span>
              <span className="text-xs font-semibold text-gray-900 font-sans">G.711u → 16kHz PCM</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-purple-50 border border-purple-200 text-purple-700">
            Jitter: <span className="font-mono">1.8ms</span>
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Call ID, caller phone, threat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-sans"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-sans text-[#64748B] font-medium">Filter:</span>
          {['ALL', 'BLOCKED', 'REVIEWED', 'ALLOWED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all ${
                statusFilter === st
                  ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold shadow-sm'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:text-gray-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Calls Table */}
      <div className="glass-panel rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="p-4">Call ID & Time</th>
                <th className="p-4">Caller & Recipient</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Risk Index</th>
                <th className="p-4">Threat Classification</th>
                <th className="p-4">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900 bg-white">
              {filteredCalls.map((call) => {
                const isSelected = selectedCallId === call.callId;
                return (
                  <tr
                    key={call.callId}
                    onClick={() => setSelectedCallId(call.callId)}
                    tabIndex={0}
                    role="button"
                    aria-selected={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCallId(call.callId);
                      }
                    }}
                    className={`cursor-pointer transition-all outline-none ${
                      isSelected
                        ? 'bg-blue-50/60 shadow-[inset_4px_0_0_0_#3B82F6] hover:bg-blue-50/80 focus-visible:ring-2 focus-visible:ring-blue-400'
                        : 'hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-blue-400'
                    }`}
                  >
                    <td className="p-4">
                      <span className="font-mono font-semibold text-gray-900 block">{call.callId}</span>
                      <span className="text-[11px] text-[#64748B] block font-sans">{call.timestamp}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-medium text-gray-900 block">{call.callerNumber}</span>
                      <span className="text-[11px] text-gray-600 block font-sans">{call.recipient}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 flex items-center gap-1.5 font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                        {call.duration}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-semibold font-mono ${
                          call.riskScore >= 70
                            ? 'text-[#EF4444]'
                            : call.riskScore >= 40
                            ? 'text-[#F59E0B]'
                            : 'text-[#10B981]'
                        }`}
                      >
                        {call.riskScore.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-[#64748B] block font-sans">
                        Conf: <span className="font-mono">{Math.round(call.confidence * 100)}%</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900 font-medium block">{call.threatType}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-sans ${
                          call.status === 'BLOCKED'
                            ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
                            : call.status === 'REVIEWED'
                            ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]'
                            : 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Call Deep Inspection & Audio Player Panel */}
      {selectedCall && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold text-gray-900">{selectedCall.callId}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-sans ${
                    selectedCall.status === 'BLOCKED'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : selectedCall.status === 'REVIEWED'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {selectedCall.status}
                </span>
                <span className="text-xs text-gray-500 font-sans">• {selectedCall.timestamp}</span>
              </div>
              <p className="text-xs text-gray-600 font-sans">
                Caller: <span className="font-semibold text-gray-900 font-mono">{selectedCall.callerNumber}</span> → Destination: <span className="font-semibold text-gray-900">{selectedCall.recipient}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/investigation')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-sans font-medium flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Open in Investigation Center
              </button>
            </div>
          </div>

          {/* Simulated Intercepted Audio Player */}
          <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                Telephony Audio Recording Stream ({selectedCall.duration})
              </span>
              <span className="text-gray-500 text-xs">Format: 16 kHz Mono PCM (SIPREC Intercept)</span>
            </div>

            {/* Playback Controls & Waveform Simulation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors text-xs font-sans ${
                  isPlaying
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
              </button>

              <div className="flex-1 space-y-1">
                <div className="h-6 flex items-end gap-1 overflow-hidden px-2 py-1 bg-white rounded-lg border border-gray-200">
                  {Array.from({ length: 48 }).map((_, idx) => {
                    const height = isPlaying
                      ? Math.max(15, Math.sin(idx * 0.4 + playProgress * 0.1) * 80 + 20)
                      : 20 + ((idx * 7) % 35);
                    const isPlayed = (idx / 48) * 100 <= playProgress;
                    return (
                      <div
                        key={idx}
                        style={{ height: `${height}%` }}
                        className={`flex-1 rounded-full transition-all duration-150 ${
                          isPlayed ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                  <span>{isPlaying ? `00:${playProgress < 10 ? '0' : ''}${Math.round(playProgress * 0.4)}` : '00:00'}</span>
                  <span>{selectedCall.duration}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Forensic Acoustic & SIP Telemetry Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2">
              <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider block">Acoustic Forensic Detection</span>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Calibrated Risk Index:</span>
                <span className={`font-semibold font-mono ${selectedCall.riskScore >= 70 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {selectedCall.riskScore.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Threat Classification:</span>
                <span className="font-semibold text-gray-900">{selectedCall.threatType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sub-Model Consensus:</span>
                <span className="font-medium text-blue-600">LCNN (99.4%) • BiLSTM (64.1%)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2">
              <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider block">SIP Signaling & Route Telemetry</span>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ingress Gateway:</span>
                <span className="font-semibold text-gray-900">Cisco CUBE Core-01</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Carrier Trunk:</span>
                <span className="font-semibold text-gray-900">Tata Teleservices / Level 3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">SIP User-Agent:</span>
                <span className="font-mono text-gray-800">Asterisk PBX 18.9</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
