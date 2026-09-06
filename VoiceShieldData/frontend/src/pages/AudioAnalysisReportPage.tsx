import React, { useState } from 'react';
import {
  Activity,
  AudioLines,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Ear,
  FileAudio,
  Gauge,
  Mic,
  Radio,
  Shield,
  Signal,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
  Volume2,
  Waves,
  Zap,
} from 'lucide-react';

// ─── Mock Audio Analysis Data ────────────────────────────────────────────────
const MOCK_ANALYSIS = {
  file_name: 'suspect_call_recording_20260906.wav',
  file_size: '4.2 MB',
  format: 'WAV (PCM 16-bit)',
  duration: '02:34',
  analyzed_at: new Date().toISOString(),
  quality: {
    overall_score: 87,
    snr_db: 38.4,
    clarity_score: 91,
    dynamic_range_db: 52.1,
    bit_depth: 16,
    sample_rate: 44100,
    bitrate: '1411 kbps',
    clipping_ratio: 0.002,
    silence_ratio: 0.12,
    noise_floor_db: -62.3,
    thd_percent: 0.08,
    peak_level_db: -1.2,
    rms_level_db: -18.4,
  },
  speakers: {
    total_detected: 2,
    dominant_speaker_percent: 72,
    speakers: [
      {
        id: 'SPK-001',
        label: 'Primary Speaker (Caller)',
        percent: 72,
        avg_pitch_hz: 142,
        pitch_range: '98–210 Hz',
        gender_estimate: 'Male',
        confidence: 0.94,
        speech_rate_wpm: 156,
        energy_profile: 'Strong / Assertive',
      },
      {
        id: 'SPK-002',
        label: 'Secondary Speaker (Recipient)',
        percent: 24,
        avg_pitch_hz: 218,
        pitch_range: '180–285 Hz',
        gender_estimate: 'Female',
        confidence: 0.89,
        speech_rate_wpm: 132,
        energy_profile: 'Soft / Hesitant',
      },
    ],
    background_noise: {
      type: 'Office / Indoor',
      level_db: -45.2,
      classification: 'Low ambient noise — keyboard, air conditioning',
      crowd_detected: false,
      traffic_detected: false,
      music_detected: false,
    },
  },
  voice: {
    fundamental_frequency_hz: 142,
    formant_f1_hz: 520,
    formant_f2_hz: 1480,
    formant_f3_hz: 2580,
    jitter_percent: 0.42,
    shimmer_percent: 2.1,
    hnr_db: 21.3,
    speech_rate_wpm: 156,
    articulation_rate: 4.8,
    pause_ratio: 0.18,
    voice_onset_time_ms: 32,
    spectral_tilt_db: -8.2,
    voice_quality: 'Modal / Clear',
  },
  environment: {
    reverb_time_rt60_ms: 420,
    room_type: 'Small Office / Cabin',
    estimated_distance_m: 0.4,
    microphone_quality: 'Professional Grade (Low Noise Floor)',
    encoding_artifacts: 'None Detected',
    compression: 'Uncompressed PCM',
    channel_config: 'Mono (Single Channel)',
  },
  spectrogram: {
    frequency_range: '20 Hz – 22,050 Hz',
    time_resolution_ms: 10,
    frequency_resolution_hz: 43,
    dominant_frequencies: [142, 284, 520, 1480, 2580],
    anomaly_regions: [
      { start_sec: 45.2, end_sec: 47.8, type: 'Spectral Discontinuity', severity: 'medium' },
      { start_sec: 112.5, end_sec: 113.1, type: 'Silence Gap Anomaly', severity: 'low' },
    ],
  },
};

// Generate fake spectrogram bars for visualization
const generateSpectrogramData = () => {
  const rows = 32;
  const cols = 64;
  const data: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const base = Math.sin(c * 0.15 + r * 0.2) * 0.3 + 0.3;
      const noise = Math.random() * 0.3;
      const formant = r > 8 && r < 16 ? Math.sin(c * 0.1) * 0.4 + 0.3 : 0;
      row.push(Math.min(1, Math.max(0, base + noise + formant)));
    }
    data.push(row);
  }
  return data;
};

const spectrogramData = generateSpectrogramData();

const QualityBar: React.FC<{ value: number; max: number; label: string; unit?: string; color?: string }> = ({
  value,
  max,
  label,
  unit = '',
  color = 'bg-emerald-500',
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs font-sans">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="font-mono font-semibold text-slate-900">
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        {unit}
      </span>
    </div>
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  </div>
);

const ScoreRing: React.FC<{ score: number; size?: number; label: string }> = ({ score, size = 120, label }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E2E8F0" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-black font-mono text-slate-900">{score}</span>
        <span className="text-[10px] text-slate-500 font-sans uppercase tracking-wider">/ 100</span>
      </div>
      <span className="text-xs font-semibold text-slate-700 font-sans">{label}</span>
    </div>
  );
};

export const AudioAnalysisReportPage: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('quality');
  const data = MOCK_ANALYSIS;

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  const SectionHeader: React.FC<{ id: string; icon: React.ReactNode; title: string; badge?: string; badgeColor?: string }> = ({
    id,
    icon,
    title,
    badge,
    badgeColor = 'bg-slate-100 text-slate-600 border-slate-200',
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors rounded-t-xl"
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-semibold text-slate-900 font-sans">{title}</h3>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border font-sans ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {expandedSection === id ? (
        <ChevronUp className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-200">
            <AudioLines className="w-4 h-4 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700 tracking-wide uppercase font-sans">
              Forensic Audio Analysis
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Audio Intelligence Report
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl font-sans">
            Comprehensive forensic breakdown — sound quality metrics, speaker diarization, voice biometrics, environmental acoustics, and spectral analysis.
          </p>
        </div>

        <button className="btn-secondary px-6 py-3 flex items-center gap-2 whitespace-nowrap font-semibold text-sm rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 shadow-sm transition-all">
          <Download className="w-5 h-5" />
          Export PDF Report
        </button>
      </div>

      {/* File Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'File', value: data.file_name.substring(0, 20) + '...', icon: <FileAudio className="w-3.5 h-3.5 text-blue-600" /> },
          { label: 'Size', value: data.file_size, icon: <BarChart3 className="w-3.5 h-3.5 text-violet-600" /> },
          { label: 'Format', value: data.quality.sample_rate + ' Hz', icon: <Radio className="w-3.5 h-3.5 text-emerald-600" /> },
          { label: 'Duration', value: data.duration, icon: <Timer className="w-3.5 h-3.5 text-amber-600" /> },
          { label: 'Bit Depth', value: data.quality.bit_depth + '-bit', icon: <Signal className="w-3.5 h-3.5 text-cyan-600" /> },
          { label: 'Speakers', value: String(data.speakers.total_detected), icon: <Users className="w-3.5 h-3.5 text-red-500" /> },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              {item.icon}
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold font-sans">{item.label}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 font-mono truncate block">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Overall Quality Score Ring */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <ScoreRing score={data.quality.overall_score} size={140} label="Overall Quality" />
        </div>
        <div className="grid grid-cols-2 gap-4 flex-1 max-w-md">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block font-sans">SNR</span>
            <span className="text-xl font-black text-emerald-800 font-mono">{data.quality.snr_db} dB</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <span className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold block font-sans">Clarity</span>
            <span className="text-xl font-black text-blue-800 font-mono">{data.quality.clarity_score}%</span>
          </div>
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-center">
            <span className="text-[10px] text-violet-600 uppercase tracking-wider font-semibold block font-sans">Dynamic Range</span>
            <span className="text-xl font-black text-violet-800 font-mono">{data.quality.dynamic_range_db} dB</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold block font-sans">Noise Floor</span>
            <span className="text-xl font-black text-amber-800 font-mono">{data.quality.noise_floor_db} dB</span>
          </div>
        </div>
      </div>

      {/* ─── Section 1: Sound Quality Metrics ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          id="quality"
          icon={<Gauge className="w-5 h-5 text-emerald-600" />}
          title="Sound Quality Metrics"
          badge="EXCELLENT"
          badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        {expandedSection === 'quality' && (
          <div className="p-6 border-t border-slate-100 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <QualityBar value={data.quality.snr_db} max={60} label="Signal-to-Noise Ratio" unit=" dB" color="bg-emerald-500" />
                <QualityBar value={data.quality.clarity_score} max={100} label="Clarity Score" unit="%" color="bg-blue-500" />
                <QualityBar value={data.quality.dynamic_range_db} max={96} label="Dynamic Range" unit=" dB" color="bg-violet-500" />
                <QualityBar value={100 - data.quality.clipping_ratio * 100} max={100} label="Clipping-Free" unit="%" color="bg-emerald-500" />
              </div>
              <div className="space-y-4">
                <QualityBar value={100 - data.quality.thd_percent} max={100} label="Harmonic Purity (THD)" unit="%" color="bg-cyan-500" />
                <QualityBar value={Math.abs(data.quality.peak_level_db)} max={30} label="Peak Headroom" unit=" dB" color="bg-amber-500" />
                <QualityBar value={100 - data.quality.silence_ratio * 100} max={100} label="Speech Activity" unit="%" color="bg-blue-500" />
                <QualityBar value={data.quality.sample_rate / 480} max={100} label="Sample Rate Quality" unit="" color="bg-violet-500" />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-sans leading-relaxed">
              <strong className="text-slate-800">Assessment:</strong> Audio recording is of professional quality with minimal noise contamination.
              SNR of {data.quality.snr_db} dB indicates clean separation between speech and ambient noise.
              {data.quality.clipping_ratio < 0.01 ? ' No clipping artifacts detected.' : ' Minor clipping detected at high energy segments.'}
            </div>
          </div>
        )}
      </div>

      {/* ─── Section 2: Speaker Diarization & Background Detection ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          id="speakers"
          icon={<Users className="w-5 h-5 text-blue-600" />}
          title="Speaker Detection & Background Analysis"
          badge={`${data.speakers.total_detected} SPEAKERS`}
          badgeColor="bg-blue-50 text-blue-700 border-blue-200"
        />
        {expandedSection === 'speakers' && (
          <div className="p-6 border-t border-slate-100 space-y-6 animate-fade-in">
            {/* Speaker Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.speakers.speakers.map((speaker) => (
                <div key={speaker.id} className="p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        speaker.id === 'SPK-001' ? 'bg-blue-600' : 'bg-violet-600'
                      }`}>
                        {speaker.id.slice(-1)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-900 block font-sans">{speaker.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{speaker.id}</span>
                      </div>
                    </div>
                    <span className="text-lg font-black font-mono text-slate-900">{speaker.percent}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        speaker.id === 'SPK-001' ? 'bg-blue-500' : 'bg-violet-500'
                      }`}
                      style={{ width: `${speaker.percent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Avg Pitch</span>
                      <span className="font-semibold text-slate-900 font-mono">{speaker.avg_pitch_hz} Hz</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Gender</span>
                      <span className="font-semibold text-slate-900">{speaker.gender_estimate}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Speech Rate</span>
                      <span className="font-semibold text-slate-900 font-mono">{speaker.speech_rate_wpm} wpm</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Energy</span>
                      <span className="font-semibold text-slate-900">{speaker.energy_profile}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Background Noise Panel */}
            <div className="p-5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <Ear className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900 font-sans">Background Noise Analysis</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-sans">
                <div className="p-3 rounded-lg bg-white border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-600 block uppercase tracking-wider font-semibold">Environment</span>
                  <span className="font-semibold text-slate-900 text-sm">{data.speakers.background_noise.type}</span>
                </div>
                <div className="p-3 rounded-lg bg-white border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-600 block uppercase tracking-wider font-semibold">Level</span>
                  <span className="font-semibold text-slate-900 font-mono text-sm">{data.speakers.background_noise.level_db} dB</span>
                </div>
                <div className="p-3 rounded-lg bg-white border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-600 block uppercase tracking-wider font-semibold">Crowd</span>
                  <span className={`font-semibold text-sm ${data.speakers.background_noise.crowd_detected ? 'text-red-600' : 'text-emerald-600'}`}>
                    {data.speakers.background_noise.crowd_detected ? 'Detected' : 'Not Detected'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-white border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-600 block uppercase tracking-wider font-semibold">Traffic</span>
                  <span className={`font-semibold text-sm ${data.speakers.background_noise.traffic_detected ? 'text-red-600' : 'text-emerald-600'}`}>
                    {data.speakers.background_noise.traffic_detected ? 'Detected' : 'Not Detected'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-800 font-sans">{data.speakers.background_noise.classification}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Section 3: Voice Characteristics ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          id="voice"
          icon={<Mic className="w-5 h-5 text-violet-600" />}
          title="Voice Biometric Characteristics"
          badge={data.voice.voice_quality}
          badgeColor="bg-violet-50 text-violet-700 border-violet-200"
        />
        {expandedSection === 'voice' && (
          <div className="p-6 border-t border-slate-100 space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Fundamental Frequency */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-white border border-violet-200 text-center space-y-1">
                <Waves className="w-5 h-5 text-violet-600 mx-auto" />
                <span className="text-[10px] text-violet-600 uppercase tracking-wider font-semibold block font-sans">Fundamental Freq (F0)</span>
                <span className="text-2xl font-black text-violet-800 font-mono block">{data.voice.fundamental_frequency_hz} Hz</span>
                <span className="text-xs text-slate-600 font-sans">Normal male range (85–180 Hz)</span>
              </div>

              {/* Speech Rate */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200 text-center space-y-1">
                <Zap className="w-5 h-5 text-blue-600 mx-auto" />
                <span className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold block font-sans">Speech Rate</span>
                <span className="text-2xl font-black text-blue-800 font-mono block">{data.voice.speech_rate_wpm} WPM</span>
                <span className="text-xs text-slate-600 font-sans">Average conversational (120–180)</span>
              </div>

              {/* HNR */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 text-center space-y-1">
                <Volume2 className="w-5 h-5 text-emerald-600 mx-auto" />
                <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block font-sans">Harmonics-to-Noise</span>
                <span className="text-2xl font-black text-emerald-800 font-mono block">{data.voice.hnr_db} dB</span>
                <span className="text-xs text-slate-600 font-sans">Healthy voice (&gt;20 dB)</span>
              </div>
            </div>

            {/* Formant Analysis */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">Formant Frequencies (Vowel Characteristics)</span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'F1 (Openness)', value: data.voice.formant_f1_hz, max: 1000, color: 'bg-rose-500' },
                  { label: 'F2 (Frontness)', value: data.voice.formant_f2_hz, max: 3000, color: 'bg-blue-500' },
                  { label: 'F3 (Lip Shape)', value: data.voice.formant_f3_hz, max: 4000, color: 'bg-violet-500' },
                ].map((f) => (
                  <div key={f.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="text-slate-600">{f.label}</span>
                      <span className="font-mono font-semibold text-slate-900">{f.value} Hz</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full rounded-full ${f.color}`} style={{ width: `${(f.value / f.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Quality Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
              {[
                { label: 'Jitter', value: `${data.voice.jitter_percent}%`, status: data.voice.jitter_percent < 1 ? 'normal' : 'high' },
                { label: 'Shimmer', value: `${data.voice.shimmer_percent}%`, status: data.voice.shimmer_percent < 3 ? 'normal' : 'high' },
                { label: 'Pause Ratio', value: `${(data.voice.pause_ratio * 100).toFixed(0)}%`, status: 'normal' },
                { label: 'VOT', value: `${data.voice.voice_onset_time_ms} ms`, status: 'normal' },
              ].map((m) => (
                <div key={m.label} className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">{m.label}</span>
                  <span className="font-bold text-slate-900 font-mono block mt-1">{m.value}</span>
                  <span className={`text-[10px] font-semibold ${m.status === 'normal' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {m.status === 'normal' ? '✓ Normal' : '⚠ Elevated'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Section 4: Spectrogram Visualization ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          id="spectrogram"
          icon={<TrendingUp className="w-5 h-5 text-cyan-600" />}
          title="Spectrogram Analysis"
          badge={`${data.spectrogram.anomaly_regions.length} ANOMALIES`}
          badgeColor={data.spectrogram.anomaly_regions.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
        />
        {expandedSection === 'spectrogram' && (
          <div className="p-6 border-t border-slate-100 space-y-4 animate-fade-in">
            {/* Spectrogram Heat Map */}
            <div className="p-4 rounded-xl bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400">Frequency (Hz) ↑</span>
                <span className="text-xs font-mono text-slate-400">Time (s) →</span>
              </div>
              <div className="space-y-0.5">
                {spectrogramData.map((row, ri) => (
                  <div key={ri} className="flex gap-0.5">
                    {row.map((val, ci) => (
                      <div
                        key={ci}
                        className="flex-1 rounded-[1px]"
                        style={{
                          height: '6px',
                          backgroundColor: `hsl(${260 - val * 200}, ${70 + val * 30}%, ${15 + val * 55}%)`,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-500">
                <span>0s</span>
                <span>30s</span>
                <span>60s</span>
                <span>90s</span>
                <span>120s</span>
                <span>154s</span>
              </div>
            </div>

            {/* Anomaly Regions */}
            {data.spectrogram.anomaly_regions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sans">Detected Anomaly Regions</span>
                {data.spectrogram.anomaly_regions.map((region, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-sans ${
                      region.severity === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${region.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <span className="font-medium text-slate-900">{region.type}</span>
                    </div>
                    <span className="font-mono text-slate-600">
                      {region.start_sec.toFixed(1)}s – {region.end_sec.toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Dominant Frequencies */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2 font-sans">Dominant Frequency Peaks</span>
              <div className="flex items-end gap-2 h-20">
                {data.spectrogram.dominant_frequencies.map((freq, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg transition-all"
                      style={{ height: `${Math.min(100, (freq / 3000) * 100)}%` }}
                    />
                    <span className="text-[10px] font-mono text-slate-600">{freq} Hz</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Section 5: Environment Analysis ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          id="environment"
          icon={<Sparkles className="w-5 h-5 text-amber-600" />}
          title="Recording Environment Analysis"
          badge={data.environment.room_type}
          badgeColor="bg-amber-50 text-amber-700 border-amber-200"
        />
        {expandedSection === 'environment' && (
          <div className="p-6 border-t border-slate-100 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
              {[
                { label: 'Reverb Time (RT60)', value: `${data.environment.reverb_time_rt60_ms} ms`, icon: <Waves className="w-4 h-4 text-blue-600" /> },
                { label: 'Room Type', value: data.environment.room_type, icon: <Shield className="w-4 h-4 text-violet-600" /> },
                { label: 'Estimated Distance', value: `${data.environment.estimated_distance_m} m from mic`, icon: <Radio className="w-4 h-4 text-emerald-600" /> },
                { label: 'Microphone Quality', value: data.environment.microphone_quality, icon: <Mic className="w-4 h-4 text-cyan-600" /> },
                { label: 'Encoding Artifacts', value: data.environment.encoding_artifacts, icon: <Brain className="w-4 h-4 text-amber-600" /> },
                { label: 'Channel Config', value: data.environment.channel_config, icon: <Activity className="w-4 h-4 text-red-500" /> },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 block">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-sans flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Environment Assessment:</strong> Recording captured in a controlled indoor environment with professional-grade microphone.
                No compression artifacts or encoding issues detected. Suitable for forensic voice analysis.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
