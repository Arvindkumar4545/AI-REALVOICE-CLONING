import React, { useState } from 'react';
import {
  PhoneCall,
  Search,
  Filter,
  Download,
  Clock,
} from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCallId, setSelectedCallId] = useState<string>(SAMPLE_CALLS[0].callId);

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-[11px] font-mono text-gray-900 font-semibold">
            <PhoneCall className="w-3.5 h-3.5 text-gray-900" />
            <span>Voice Operations Monitoring Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            LIVE CALL INSPECTION LOG
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Real-time telephonic SIP trunk voice inspections, duration, calibrated risk index, and policy decisions.
          </p>
        </div>

        <button className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-gray-200 hover:border-[#3B82F6] text-gray-900 text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-sm">
          <Download className="w-4 h-4 text-gray-900" /> Export CSV Report
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Call ID, caller phone, threat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-mono text-[#64748B] font-semibold">Filter:</span>
          {['ALL', 'BLOCKED', 'REVIEWED', 'ALLOWED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-[rgba(6,182,212,0.15)] text-gray-900 border border-[#3B82F6]'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:text-gray-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Calls Table */}
      <div className="glass-panel rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-[10px] tracking-wider font-bold">
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
                      <span className="font-bold text-gray-900 block">{call.callId}</span>
                      <span className="text-[10px] text-[#64748B] block">{call.timestamp}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-gray-900 block">{call.callerNumber}</span>
                      <span className="text-[10px] text-gray-600 block">{call.recipient}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                        {call.duration}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-bold font-mono ${
                          call.riskScore >= 70
                            ? 'text-[#EF4444]'
                            : call.riskScore >= 40
                            ? 'text-[#F59E0B]'
                            : 'text-[#10B981]'
                        }`}
                      >
                        {call.riskScore.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-[#64748B] block">
                        Conf: {Math.round(call.confidence * 100)}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900 font-semibold block">{call.threatType}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
    </div>
  );
};
