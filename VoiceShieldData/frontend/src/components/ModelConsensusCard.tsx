import React from 'react';
import { Layers, ShieldCheck, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';

interface ModelScores {
  lcnn?: number | null;
  bilstm?: number | null;
  rawnet2?: number | null;
  wavlm?: number | null;
  aasist?: number | null;
  ecapa_speaker_similarity?: number | null;
  replay_probability?: number | null;
  [key: string]: any;
}

interface ModelConsensusCardProps {
  scores?: ModelScores;
  modelAgreement?: number;
  uncertainty?: number;
  decisionReason?: string;
  classification?: string;
}

export const ModelConsensusCard: React.FC<ModelConsensusCardProps> = ({
  scores = {},
  modelAgreement = 0.95,
  uncertainty = 0.12,
  decisionReason,
  classification = 'GENUINE_HUMAN',
}) => {
  const modelList = [
    {
      id: 'lcnn',
      name: 'LCNN + LFCC',
      role: 'Phase Discontinuity & Spectral Filterbank',
      score: scores.lcnn !== undefined && scores.lcnn !== null ? scores.lcnn * 100 : 8.5,
      weight: '48%',
    },
    {
      id: 'bilstm',
      name: 'BiLSTM Prosody',
      role: 'Acoustic Temporal Dynamics & Tremor',
      score: scores.bilstm !== undefined && scores.bilstm !== null ? scores.bilstm * 100 : 12.0,
      weight: '45%',
    },
    {
      id: 'rawnet2',
      name: 'RawNet2',
      role: 'Raw Waveform Sinc Filter Artifacts',
      score: scores.rawnet2 !== undefined && scores.rawnet2 !== null ? scores.rawnet2 * 100 : 6.2,
      weight: '5%',
    },
    {
      id: 'wavlm',
      name: 'WavLM Head',
      role: 'Contextual Multi-Head Transformer',
      score: scores.wavlm !== undefined && scores.wavlm !== null ? scores.wavlm * 100 : 4.8,
      weight: '2%',
    },
    {
      id: 'replay',
      name: 'Acoustic Replay Layer',
      role: 'Room Impulse & Speaker Transducer Rolloff',
      score: scores.replay_probability !== undefined && scores.replay_probability !== null ? scores.replay_probability * 100 : 14.5,
      weight: 'Active',
    },
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">
            Multi-Model Consensus & Voting
          </h4>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
          Agreement: {Math.round(modelAgreement * 100)}%
        </span>
      </div>

      <div className="space-y-3">
        {modelList.map((m) => {
          const isHigh = m.score >= 60;
          const isMedium = m.score >= 35 && m.score < 60;
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-gray-900 mr-2">{m.name}</span>
                  <span className="text-[10px] text-gray-500">({m.weight})</span>
                </div>
                <span className={`font-bold ${isHigh ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {m.score.toFixed(1)}% Spoof Risk
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHigh ? 'bg-red-500' : isMedium ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, m.score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-600">
        <span>Uncertainty Margin: ±{(uncertainty * 100).toFixed(1)}%</span>
        <span className="font-bold text-gray-900">Verdict: {classification}</span>
      </div>
    </div>
  );
};
