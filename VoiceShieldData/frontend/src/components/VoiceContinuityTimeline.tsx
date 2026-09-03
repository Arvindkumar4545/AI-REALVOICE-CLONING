import React from 'react';
import { Activity, Clock, CheckCircle2, AlertTriangle, Disc } from 'lucide-react';

interface Segment {
  segment_index: number;
  time_range: string;
  start_sec: number;
  end_sec: number;
  spoof_score: number;
  status: string;
  quality_tag: string;
}

interface VoiceContinuityTimelineProps {
  continuity?: {
    segments: Segment[];
    has_transition: boolean;
    transition_timestamp?: number | null;
    continuity_score: number;
    summary: string;
  };
}

export const VoiceContinuityTimeline: React.FC<VoiceContinuityTimelineProps> = ({ continuity }) => {
  if (!continuity || !continuity.segments || continuity.segments.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" />
          <h4 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">
            Voice Continuity & Window Temporal Consistency
          </h4>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
          Stability: {continuity.continuity_score.toFixed(1)}%
        </span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {continuity.segments.map((seg) => {
            const isSynthetic = seg.quality_tag === 'SYNTHETIC';
            const isBorderline = seg.quality_tag === 'BORDERLINE';
            return (
              <div
                key={seg.segment_index}
                className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                  isSynthetic
                    ? 'bg-red-50/70 border-red-200 text-red-900'
                    : isBorderline
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{seg.time_range}</span>
                  {isSynthetic ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="text-[10px] text-gray-600">
                  Risk: {(seg.spoof_score * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] font-semibold truncate">{seg.status}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-600 font-mono flex items-center justify-between">
        <span>{continuity.summary}</span>
        {continuity.has_transition && (
          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold ml-2 shrink-0">
            Shift @ {continuity.transition_timestamp}s
          </span>
        )}
      </div>
    </div>
  );
};
