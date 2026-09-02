import React, { useState } from 'react';
import {
  FileText,
  Search,
  Lock,
  Download,
  ShieldCheck,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  callId: string;
  decision: string;
  riskScore: number;
  ipAddress: string;
  hash: string;
}

const SAMPLE_AUDIT_LOGS: AuditEntry[] = [
  {
    id: 'AUD-10982',
    timestamp: '2026-08-31 21:14:03 UTC',
    operator: 'SYSTEM / AUTO_ENFORCE',
    action: 'VOICE_INSPECTION_DECISION',
    callId: 'CALL-90412',
    decision: 'BLOCK_CALL',
    riskScore: 94.2,
    ipAddress: '10.240.12.88',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  {
    id: 'AUD-10981',
    timestamp: '2026-08-31 21:08:45 UTC',
    operator: 'SYSTEM / AUTO_ENFORCE',
    action: 'VOICE_INSPECTION_DECISION',
    callId: 'CALL-90411',
    decision: 'ALLOW_CALL',
    riskScore: 12.0,
    ipAddress: '10.240.12.88',
    hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
  },
  {
    id: 'AUD-10980',
    timestamp: '2026-08-31 20:55:20 UTC',
    operator: 'SYSTEM / AUTO_ENFORCE',
    action: 'VOICE_INSPECTION_DECISION',
    callId: 'CALL-90410',
    decision: 'BLOCK_CALL',
    riskScore: 88.6,
    ipAddress: '10.240.12.89',
    hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
  },
  {
    id: 'AUD-10979',
    timestamp: '2026-08-31 20:41:01 UTC',
    operator: 'SOC_OPERATOR_44 (Alex)',
    action: 'MANUAL_OVERRIDE_REVIEW',
    callId: 'CALL-90409',
    decision: 'FLAG_FOR_MONITORING',
    riskScore: 56.4,
    ipAddress: '192.168.4.12',
    hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
  },
];

export const AuditLogPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = SAMPLE_AUDIT_LOGS.filter(
    (l) =>
      l.id.toLowerCase().includes(search.toLowerCase()) ||
      l.callId.toLowerCase().includes(search.toLowerCase()) ||
      l.operator.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 cyber-grid-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-[11px] font-mono text-gray-900 font-semibold">
            <FileText className="w-3.5 h-3.5 text-gray-900" />
            <span>Compliance & Cryptographic Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            ENTERPRISE AUDIT LOG TRAIL
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Cryptographically sealed, tamper-evident audit logs of all inspection decisions and administrative actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-[#10B981] text-xs font-mono font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>SHA-256 Chain Verified</span>
          </div>
          <button className="px-4 py-2 rounded-xl bg-white hover:bg-[#0F1C30] border border-gray-200 hover:border-[#3B82F6] text-gray-900 text-xs font-mono font-semibold flex items-center gap-2 transition-all">
            <Download className="w-4 h-4 text-gray-900" /> Export Audit Log
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-200">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Log ID, call ID, operator, hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Log ID & Timestamp</th>
                <th className="p-4">Operator / Engine</th>
                <th className="p-4">Action & Target</th>
                <th className="p-4">Decision & Risk</th>
                <th className="p-4">Origin IP</th>
                <th className="p-4">Cryptographic Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16324A]/60 text-gray-900 bg-white">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#0F1C30] transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-gray-900 block">{entry.id}</span>
                    <span className="text-[10px] text-[#64748B] block">{entry.timestamp}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-900 font-semibold block">{entry.operator}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-900 font-semibold block">{entry.action}</span>
                    <span className="text-[10px] text-gray-600 block">{entry.callId}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-gray-900 block">{entry.decision}</span>
                    <span className="text-[10px] text-gray-600 block">Risk: {entry.riskScore}%</span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {entry.ipAddress}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] text-[#64748B] font-mono truncate max-w-xs block" title={entry.hash}>
                      {entry.hash.substring(0, 16)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

