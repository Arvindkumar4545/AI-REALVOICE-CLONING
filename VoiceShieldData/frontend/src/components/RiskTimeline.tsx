/**
 * RiskTimeline Component
 * Displays real-time risk scores as animated charts with dark cyber theme.
 */

import React, { useMemo } from 'react';
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { ChunkScore, ConsensusUpdate } from '../hooks/useStreamingDetection';

interface TimelineData {
  timeMs: number;
  fastRiskScore?: number;
  slowRiskScore?: number;
  classification?: string;
}

interface RiskTimelineProps {
  chunkScores: ChunkScore[];
  consensusUpdates: ConsensusUpdate[];
  maxDataPoints?: number;
}

export const RiskTimeline: React.FC<RiskTimelineProps> = ({
  chunkScores,
  consensusUpdates,
  maxDataPoints = 50,
}) => {
  const data = useMemo(() => {
    const timelineMap = new Map<number, TimelineData>();

    chunkScores.forEach((score) => {
      const existing = timelineMap.get(score.seq) || { timeMs: score.seq * 1500 };
      timelineMap.set(score.seq, {
        ...existing,
        timeMs: score.seq * 1500,
        fastRiskScore: score.riskScore,
      });
    });

    consensusUpdates.forEach((update) => {
      const existing = timelineMap.get(update.seq) || { timeMs: update.seq * 1500 };
      timelineMap.set(update.seq, {
        ...existing,
        timeMs: update.seq * 1500,
        slowRiskScore: update.riskScore,
        classification: update.classification,
      });
    });

    let result = Array.from(timelineMap.values()).sort((a, b) => a.timeMs - b.timeMs);

    if (result.length > maxDataPoints) {
      result = result.slice(-maxDataPoints);
    }

    return result;
  }, [chunkScores, consensusUpdates, maxDataPoints]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-3 text-xs font-mono">
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color || '#22D3EE' }}>
            <strong>{entry.name}:</strong> {(Number(entry.value) * 100).toFixed(1)}%
          </p>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 text-center">
        <h3 className="text-sm font-mono font-bold text-white mb-2">Real-Time Risk Timeline</h3>
        <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
          <p>Waiting for continuous audio streaming chunks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Real-Time Risk Timeline</h3>
        <div className="flex gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full" />
            <span className="text-slate-400">Fast LCNN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
            <span className="text-slate-400">Ensemble Consensus</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
          <XAxis
            dataKey="timeMs"
            tickFormatter={formatTime}
            stroke="#64748B"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
          />
          <YAxis
            stroke="#64748B"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            domain={[0, 1]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Line
            type="monotone"
            dataKey="fastRiskScore"
            stroke="#06B6D4"
            strokeWidth={1.5}
            dot={false}
            name="LCNN Pulse"
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="slowRiskScore"
            stroke="#EF4444"
            strokeWidth={3}
            dot={{ fill: '#EF4444', r: 3 }}
            name="Consensus Verdict"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
