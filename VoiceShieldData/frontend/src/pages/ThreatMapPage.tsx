import React, { useState } from 'react';
import {
  Globe,
  Flame,
  Activity,
} from 'lucide-react';
import { ThreatGlobe3D } from '../three/ThreatGlobe3D';

const LIVE_INCIDENTS = [
  { id: 'THREAT-401', type: 'Zero-Shot Voice Clone', target: 'Wealth Management Wire Desk', location: 'San Francisco, US', risk: 94.2, time: '2 mins ago' },
  { id: 'THREAT-400', type: 'HiFi-GAN Vocoder Deepfake', target: 'Tier-1 Customer Support Trunk', location: 'London, UK', risk: 91.8, time: '6 mins ago' },
  { id: 'THREAT-399', type: 'Social Engineering Bot', target: 'Executive Direct Line', location: 'Singapore', risk: 88.5, time: '14 mins ago' },
  { id: 'THREAT-398', type: 'Synthetic Speech Scam', target: 'Insurance Claims FNOL', location: 'Sydney, AU', risk: 79.4, time: '21 mins ago' },
  { id: 'THREAT-397', type: 'Caller ID Impersonation', target: 'Banking Telephone Tree', location: 'Tokyo, JP', risk: 86.0, time: '29 mins ago' },
];

export const ThreatMapPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 cyber-grid-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[11px] font-mono text-[#EF4444] font-semibold">
            <Flame className="w-3.5 h-3.5 text-[#EF4444] animate-pulse" />
            <span>Global Cyber Threat Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            GLOBAL VOICE FRAUD THREAT MAP
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Real-time geospatial telemetry tracking AI voice cloning attacks, neural vocoder signatures, and spoof campaigns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-mono text-[#EF4444] font-semibold shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
            <span>5 Active Incidents Blocked</span>
          </div>
        </div>
      </div>

      {/* 3D Threat Globe Focus Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-900" />
              <h3 className="text-xs font-mono font-bold text-gray-900 uppercase">3D Global Threat Radar</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-600">Live Orbit Visualization</span>
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
            <ThreatGlobe3D className="w-full h-80 sm:h-96" />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-gray-600 pt-1">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Critical Attack (&gt;85% Risk)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Suspicious Vishing</span>
          </div>
        </div>

        {/* Real-time Threat Stream */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-900" /> Live Threat Stream
          </h3>

          <div className="space-y-2.5">
            {LIVE_INCIDENTS.map((inc) => (
              <div key={inc.id} className="glass-card p-4 space-y-2 glass-card-hover">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#EF4444]">{inc.id}</span>
                  <span className="text-[10px] font-mono text-[#64748B]">{inc.time}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{inc.type}</h4>
                  <p className="text-[11px] text-gray-600 font-mono">{inc.target}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-gray-200">
                  <span className="text-gray-600">{inc.location}</span>
                  <span className="font-bold text-[#EF4444]">Risk: {inc.risk}% (BLOCKED)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
