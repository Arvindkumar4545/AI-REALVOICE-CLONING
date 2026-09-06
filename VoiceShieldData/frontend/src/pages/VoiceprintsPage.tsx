import React, { useState } from 'react';
import {
  Fingerprint,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Shield,
} from 'lucide-react';
import { VoiceprintVisualizer3D } from '../three/VoiceprintVisualizer3D';

interface VoiceprintRecord {
  id: string;
  speakerName: string;
  role: string;
  enrolledDate: string;
  embeddingDim: number;
  qualityScore: number;
  similarityThreshold: number;
  status: 'ACTIVE' | 'FLAGGED' | 'REVIEW';
}

const SAMPLE_VOICEPRINTS: VoiceprintRecord[] = [
  {
    id: 'VP-88219',
    speakerName: 'Dr. Michael Chen',
    role: 'Chief Executive Officer',
    enrolledDate: '2026-08-15',
    embeddingDim: 192,
    qualityScore: 98.4,
    similarityThreshold: 0.88,
    status: 'ACTIVE',
  },
  {
    id: 'VP-88220',
    speakerName: 'Sarah Jenkins',
    role: 'Chief Financial Officer',
    enrolledDate: '2026-08-18',
    embeddingDim: 192,
    qualityScore: 96.8,
    similarityThreshold: 0.86,
    status: 'ACTIVE',
  },
  {
    id: 'VP-88221',
    speakerName: 'David K. Vance',
    role: 'Head of Wire Operations',
    enrolledDate: '2026-08-22',
    embeddingDim: 192,
    qualityScore: 94.2,
    similarityThreshold: 0.85,
    status: 'ACTIVE',
  },
  {
    id: 'VP-88222',
    speakerName: 'Elena Rostova',
    role: 'Treasury Director',
    enrolledDate: '2026-08-25',
    embeddingDim: 192,
    qualityScore: 97.1,
    similarityThreshold: 0.88,
    status: 'ACTIVE',
  },
];

export const VoiceprintsPage: React.FC = () => {
  const [selectedSpeaker, setSelectedSpeaker] = useState<VoiceprintRecord>(SAMPLE_VOICEPRINTS[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = SAMPLE_VOICEPRINTS.filter(
    (v) =>
      v.speakerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 cyber-grid-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-sans text-cyan-800 font-medium">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-700" />
            <span>Biometric Identity Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight font-sans">
            Voiceprints & Speaker Verification
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 font-sans">
            192-dimensional ECAPA-TDNN acoustic embeddings and biometric voice enrollment directory.
          </p>
        </div>

        <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium font-sans text-xs flex items-center gap-2 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Enroll New Speaker
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Speaker List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search speaker name, role, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-sans"
            />
          </div>

          <div className="space-y-2">
            {filtered.map((speaker) => {
              const isSelected = selectedSpeaker.id === speaker.id;
              return (
                <div
                  key={speaker.id}
                  onClick={() => setSelectedSpeaker(speaker)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSpeaker(speaker);
                    }
                  }}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border outline-none ${
                    isSelected
                      ? 'bg-white border-blue-400 hover:bg-[#F8FAFF] shadow-[0_0_0_1px_rgba(96,165,250,0.6),0_8px_24px_rgba(59,130,246,0.12)] focus-visible:ring-2 focus-visible:ring-blue-400'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-[#F8FAFC] shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-gray-700 font-semibold">{speaker.id}</span>
                    <span className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                      {speaker.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 font-sans">{speaker.speakerName}</h4>
                  <p className="text-xs text-gray-600 font-sans">{speaker.role}</p>

                  <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-xs font-sans text-gray-500">
                    <span>Quality: <span className="font-mono font-medium">{speaker.qualityScore}%</span></span>
                    <span>Threshold: <span className="font-mono font-medium">{speaker.similarityThreshold}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: 3D Voiceprint Embedding Focus (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-gray-200 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <span className="text-[10px] font-sans uppercase tracking-wider text-gray-500 font-semibold">Selected Identity</span>
                <h3 className="text-base font-semibold text-gray-900 font-sans">{selectedSpeaker.speakerName}</h3>
                <span className="text-xs text-gray-600 font-sans">{selectedSpeaker.role}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-sans uppercase tracking-wider text-gray-500 block font-semibold">Enrollment Vector</span>
                <span className="text-xs font-mono font-semibold text-gray-900">192-D ECAPA-TDNN</span>
              </div>
            </div>

            {/* 3D Embedding Cloud Canvas */}
            <div className="relative rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
              <div className="absolute top-3 left-3 z-10 text-xs font-sans text-gray-700 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-700" />
                <span>3D Acoustic Embedding Manifold (t-SNE / PCA)</span>
              </div>
              <VoiceprintVisualizer3D similarity={selectedSpeaker.qualityScore / 100} />
            </div>

            {/* Biometric Characteristics breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-sans">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Formant F1/F2</span>
                <span className="font-mono font-semibold text-gray-900 mt-1 block">540 Hz / 1780 Hz</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Baseline F0</span>
                <span className="font-mono font-semibold text-gray-900 mt-1 block">132.4 Hz</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Anti-Spoof Match</span>
                <span className="font-semibold text-emerald-600 mt-1 block">PASS (98.4%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
