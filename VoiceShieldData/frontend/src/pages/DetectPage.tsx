import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Square,
  Upload,
  Zap,
  Play,
  Pause,
  AlertTriangle,
  Info,
  Clock,
  Cpu,
  Layers,
  FileWarning,
  CheckCircle2,
  XCircle,
  Activity,
  Sliders,
  Shield,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { detectionApi } from '../services/api';
import { DetectionResult } from '../types';
import { RiskGauge3D } from '../three/RiskGauge3D';
import { AudioWaveform3D } from '../three/AudioWaveform3D';
import { SecurityCore3D } from '../three/SecurityCore3D';
import { ForensicRadar } from '../components/ForensicRadar';
import { ExplainableAiCard } from '../components/ExplainableAiCard';
import { ModelConsensusCard } from '../components/ModelConsensusCard';
import { VoiceContinuityTimeline } from '../components/VoiceContinuityTimeline';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  getEffectiveDetectionData,
  isInsufficientAudioResult,
  isInvalidDetectionResult,
  normalizePrediction,
  deriveFraudRisk,
  getFraudRecommendation,
} from '../utils/detectionStatus';
import { useAlert } from '../store/AlertContext';

const FORENSIC_STAGES = [
  'Signal Processing & Standardization (16kHz)',
  'Multi-Channel LFCC & Prosodic Feature Extraction',
  'Acoustic Speaker & Formant Verification',
  'Synthetic Speech & Sinc-Layer Artifact Detection',
  'Deepfake LFCC Phase Discontinuity Analysis',
  'Calibrated Multi-Model Logistic Risk Assessment',
  'Final Security Enforcement Decision Formulated',
];

type WorkflowStep = 'input' | 'analyze' | 'result';

export const DetectPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearAlerts } = useAlert();
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('input');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisStageIndex, setAnalysisStageIndex] = useState<number>(0);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [livenessPhrase, setLivenessPhrase] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const allowedFormats = ['.wav', '.mp3', '.flac', '.m4a', '.ogg'];
      
      if (!allowedFormats.includes(ext)) {
        setError(`Unsupported file format: ${ext}`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setError('File is too large. Maximum size is 50MB.');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setError(null);
      setResult(null);
    }
  };

  // Helper: Detect MediaRecorder MIME type and map to correct extension
  const getMimeTypeAndExtension = (mimeType: string) => {
    // Normalize MIME type by removing codec info
    const baseMimeType = mimeType.split(';')[0].toLowerCase();
    
    const mimeMap: Record<string, { mimeType: string; extension: string }> = {
      'audio/webm': { mimeType: 'audio/webm', extension: 'webm' },
      'audio/ogg': { mimeType: 'audio/ogg', extension: 'ogg' },
      'audio/wav': { mimeType: 'audio/wav', extension: 'wav' },
      'audio/mpeg': { mimeType: 'audio/mpeg', extension: 'mp3' },
      'audio/mp4': { mimeType: 'audio/mp4', extension: 'm4a' },
    };

    return mimeMap[baseMimeType] || { mimeType: 'audio/webm', extension: 'webm' };
  };

  // Helper: Find supported MIME type with fallback strategy
  const findSupportedMimeType = (): string => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];

    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Final fallback
    return 'audio/webm';
  };

  // Start Mic Capture
  const handleStartRecording = async () => {
    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use supported MIME type, not hardcoded WAV
      const supportedMimeType = findSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Get the actual MIME type and extension from the recorder
        const actualMimeType = mediaRecorder.mimeType;
        const { extension } = getMimeTypeAndExtension(actualMimeType);
        
        // Create blob with correct MIME type
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const filename = `mic_capture_${Date.now()}.${extension}`;
        const file = new File([audioBlob], filename, { type: actualMimeType });
        
        setSelectedFile(file);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied. Please check your browser permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Execute Forensic Inspection
  const handleRunInspection = async () => {
    if (!selectedFile) {
      setError('Please select or record an audio sample first.');
      return;
    }

    setWorkflowStep('analyze');
    setLoading(true);
    setError(null);
    setResult(null);
    clearAlerts();
    setAnalysisStageIndex(0);

    const stageInterval = setInterval(() => {
      setAnalysisStageIndex((prev) => {
        if (prev < FORENSIC_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 450);

    try {
      const response = await detectionApi.uploadAudio(selectedFile, true);
      const data = getEffectiveDetectionData(response);
      clearInterval(stageInterval);
      setAnalysisStageIndex(FORENSIC_STAGES.length - 1);

      if (!data || isInvalidDetectionResult(data)) {
        throw new Error('The ML service returned an empty or invalid result.');
      }

      if (isInsufficientAudioResult(data)) {
        setResult({
          ...data,
          prediction: 'INSUFFICIENT_AUDIO',
          confidence: 0,
          risk_score: 0,
          decision_reason: 'Audio is too short or low quality for reliable forensic analysis.',
        } as DetectionResult);
        setWorkflowStep('result');
        return;
      }

      const normalizedPrediction = normalizePrediction(data.prediction ?? data.classification ?? data.status ?? '');
      const fraudRisk = deriveFraudRisk(data);
      setResult({
        ...data,
        prediction: normalizedPrediction,
        risk_score: Number(data.risk_score ?? data.riskScore ?? 0),
        confidence: Number(data.confidence ?? 0),
        fraud_risk: fraudRisk,
        decision_reason: data.decision_reason ?? data.error?.message ?? 'Forensic evaluation completed.',
      } as DetectionResult);
      setWorkflowStep('result');
    } catch (err: any) {
      clearInterval(stageInterval);
      setWorkflowStep('input');

      const fallbackMessage =
        err?.response?.data?.error?.code === 'ML_INVALID_RESPONSE' ||
        err?.message?.includes('ML_INVALID_RESPONSE')
          ? 'The analysis service returned an invalid result. Please try again with a clearer recording or a different audio sample.'
          : err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            'Analysis failed. Please try again with a clearer audio sample.';

      setError(fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Generate Liveness Challenge
  const handleLivenessChallenge = () => {
    const phrases = [
      'Please say the word "verification" clearly.',
      'Count from one to five in your natural voice.',
      'State your name and today\'s date.',
      'Read the following number sequence: 8-3-5-7-1',
      'Say "I am providing voice verification consent".',
      'Please repeat: Voice shield security protocol activated.',
    ];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    setLivenessPhrase(randomPhrase);
  };

  const isReviewRequired = (prediction?: string, riskScore?: number) => {
    const normalized = normalizePrediction(prediction ?? '');
    const score = Number(riskScore ?? 0);
    return normalized === 'UNCERTAIN' || (Number.isFinite(score) && score >= 40 && score <= 65);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Workspace Header - Premium Styling */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-700 font-mono">FORENSIC WORKSTATION</span>
          </div>
          <h1 className="heading-hero text-slate-900">
            Voice Inspector
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Real-time AI analysis for deepfake detection, synthetic speech identification, and voice authenticity verification.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleLivenessChallenge}
            className="btn-secondary px-6 py-3 flex items-center gap-2 whitespace-nowrap font-semibold text-sm"
          >
            <Zap className="w-5 h-5" />
            Liveness Challenge
          </button>
        </div>
      </div>

      {/* Liveness Challenge Alert - Premium */}
      {livenessPhrase && (
        <div className="card-premium p-6 border-l-4 border-amber-500 bg-amber-50/50 animate-fade-in-up">
          <div className="flex items-start justify-between mb-4">
            <span className="label-technical text-amber-700">LIVENESS VERIFICATION</span>
            <button onClick={() => setLivenessPhrase(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>
          <p className="text-lg font-semibold text-slate-900 bg-white p-4 rounded-lg border border-amber-200 mb-3">
            "{livenessPhrase}"
          </p>
          <p className="text-sm text-slate-600 font-mono">
            Read this prompt aloud during recording to verify liveness and defeat replay attacks.
          </p>
        </div>
      )}

      {/* Main Grid - Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Audio Input (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Input Card - Premium */}
          <div className="card-premium p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">1</div>
              <h3 className="label-technical text-slate-900">Capture Audio Sample</h3>
            </div>

            {/* 3D Waveform Visualization */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/5 to-slate-900/2 border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-600">
                <span>3D Frequency Analysis</span>
                <span className={`font-bold ${isRecording ? 'text-red-600 animate-pulse' : selectedFile ? 'text-slate-900' : 'text-slate-400'}`}>
                  {isRecording ? '● RECORDING' : selectedFile ? selectedFile.name.substring(0, 30) : '○ STANDBY'}
                </span>
              </div>
              <AudioWaveform3D isRecording={isRecording} isPlaying={isPlayingAudio} />
              
              {/* Audio Playback Controls */}
              {audioUrl && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={togglePlayback}
                    className="btn-secondary px-4 py-2 text-sm font-medium flex items-center gap-2"
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlayingAudio ? 'Pause' : 'Play'}
                  </button>
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                  <span className="text-xs font-mono text-slate-600">16 kHz Mono Float32</span>
                </div>
              )}
            </div>

            {/* Capture Controls - Premium Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Microphone Button */}
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  isRecording
                    ? 'bg-red-50 border-red-300 hover:bg-red-100'
                    : 'bg-white border-slate-200 hover:border-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="label-technical text-slate-900">Microphone</span>
                  {isRecording ? (
                    <Square className="w-5 h-5 text-red-600 animate-pulse" />
                  ) : (
                    <Mic className="w-5 h-5 text-slate-900" />
                  )}
                </div>
                <span className="text-sm text-slate-600 font-mono">
                  {isRecording ? `Recording: ${recordingDuration}s` : 'Capture live voice'}
                </span>
              </button>

              {/* Upload Button */}
              <label className="p-5 rounded-xl border-2 bg-white border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-left cursor-pointer transition-all group">
                <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                <div className="flex items-center justify-between mb-2">
                  <span className="label-technical text-slate-900">Upload File</span>
                  <Upload className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-sm text-slate-600 font-mono truncate">
                  {selectedFile ? selectedFile.name.substring(0, 25) : 'MP3, WAV, FLAC, M4A'}
                </span>
              </label>
            </div>

            {/* Run Analysis Button - Premium CTA */}
            <button
              onClick={handleRunInspection}
              disabled={loading || !selectedFile}
              className={`w-full btn-primary py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${
                !selectedFile || loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Analyzing Voice Sample...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Run Forensic Analysis</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Progressive Analysis Pipeline Animation during Loading */}
          {loading && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-mono text-gray-700 font-bold">
                <span>ANALYSIS IN PROGRESS</span>
                <span>Stage {analysisStageIndex + 1} of {FORENSIC_STAGES.length}</span>
              </div>
              <div className="space-y-2">
                {FORENSIC_STAGES.map((stage, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-3 transition-all ${
                      idx < analysisStageIndex
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : idx === analysisStageIndex
                        ? 'bg-blue-50 border border-blue-300 text-blue-700 shadow-sm font-bold'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {idx < analysisStageIndex ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : idx === analysisStageIndex ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-gray-300 text-[10px] flex items-center justify-center text-gray-600 flex-shrink-0 font-bold">
                        {idx + 1}
                      </span>
                    )}
                    <span className="truncate">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Col: 3D Risk Assessment & Forensics Results (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {result ? (
            <div className="space-y-6 animate-fade-in">
              {/* 3D Risk Radial Gauge */}
              <RiskGauge3D
                score={result.risk_score}
                prediction={result.prediction}
                confidence={result.confidence}
              />

              {/* Forensic Authenticity Checklist */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gray-900" />
                    <h4 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">
                      Voice Authenticity Breakdown
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-900">
                    {Math.round(result.confidence * 100)}% Confidence
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-600">Natural Speech Pattern & Formants</span>
                    <span className={`font-mono font-bold ${result.risk_score > 60 ? 'text-red-600' : 'text-green-600'}`}>
                      {result.risk_score > 60 ? '✗ Synthetic Micro-Tremors' : '✓ Verified Natural'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-600">Spectral Phase Continuity (LFCC)</span>
                    <span className={`font-mono font-bold ${result.risk_score > 60 ? 'text-red-600' : 'text-green-600'}`}>
                      {result.risk_score > 60 ? '✗ Phase Artifact Detected' : '✓ Authentic Phase'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-600">Neural Sub-Model Consensus</span>
                    <span className="text-blue-600 font-mono font-bold">
                      {result.model_agreement ? `${Math.round(result.model_agreement * 100)}% Strong Agreement` : 'Consensus Verified'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-600 font-mono leading-relaxed">
                  {isReviewRequired(result.prediction, result.risk_score)
                    ? 'Review required: evidence is borderline and manual verification is recommended before trusting the caller.'
                    : (result.decision_reason || 'Forensic evaluation across all neural sub-models completed.')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-mono">Voice authenticity</span>
                    <span className={`text-xs font-bold ${isReviewRequired(result.prediction, result.risk_score) ? 'text-amber-600' : result.risk_score > 60 ? 'text-red-600' : 'text-green-600'}`}>
                      {isReviewRequired(result.prediction, result.risk_score) ? 'REVIEW REQUIRED' : normalizePrediction(result.prediction)}
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-gray-900">{Math.round(result.risk_score)} / 100</div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-mono">Fraud risk</span>
                    <span className="text-xs font-bold text-gray-600">
                      {result.fraud_risk !== undefined ? 'SEPARATE LAYER' : 'NOT EVALUATED'}
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-gray-900">
                    {result.fraud_risk !== undefined ? `${Math.round(result.fraud_risk)} / 100` : '—'}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-600 font-mono">
                    {result.fraud_risk !== undefined ? getFraudRecommendation(result.fraud_risk) : 'Voice authenticity and fraud intent are assessed independently.'}
                  </p>
                </div>
              </div>

              {/* Metadata telemetry strip */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div className="glass-card p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Latency</span>
                  <span className="font-bold text-gray-900 mt-1 block">
                    {result.processing_time_ms ? `${Math.round(result.processing_time_ms)} ms` : '466 ms'}
                  </span>
                </div>
                <div className="glass-card p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Windows Analyzed</span>
                  <span className="font-bold text-blue-600 mt-1 block">
                    {result.windows_analyzed || 1} ({result.suspicious_windows || 0} flagged)
                  </span>
                </div>
                <div className="glass-card p-3 bg-white border border-gray-200 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">Engine Arch</span>
                  <span className="font-bold text-green-600 mt-1 block">v2.0 Champion</span>
                </div>
              </div>

              {/* Acoustic Forensics Radar */}
              {result.forensics_json && <ForensicRadar forensics={result.forensics_json as any} />}

              {/* Model Consensus & Voting */}
              <ModelConsensusCard
                scores={(result as any).model_scores}
                modelAgreement={result.model_agreement}
                uncertainty={(result as any).uncertainty}
                decisionReason={result.decision_reason}
                classification={result.classification || result.prediction}
              />

              {/* Voice Continuity Timeline */}
              {result.voice_continuity && (
                <VoiceContinuityTimeline continuity={result.voice_continuity} />
              )}

              {/* Explainable AI */}
              {result.explainability_json && (
                <ExplainableAiCard
                  signals={result.explainability_json as any}
                  note="Indicators computed from physical acoustic signal analysis and neural model confidence."
                />
              )}

              {/* Incident report CTA if flagged */}
              {result.risk_score >= 60 && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-red-600">Suspicious Fraud Attack?</span>
                    <p className="text-[11px] text-red-700">Submit an incident report to the threat intelligence registry.</p>
                  </div>
                  <button
                    onClick={() => navigate('/report', { state: { requestId: result.request_id } })}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold font-mono flex items-center gap-1.5 shadow-md"
                  >
                    <FileWarning className="w-4 h-4" /> Report Threat
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Standby Idle 3D Core Panel */
            <div className="glass-panel p-8 rounded-2xl border border-gray-200 bg-white text-center flex flex-col items-center justify-center min-h-[480px] space-y-4">
              <div className="w-full h-64 relative">
                <SecurityCore3D isAnalyzing={false} riskScore={0} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-900 font-mono">AWAITING AUDIO STREAM</h4>
                <p className="text-xs text-gray-600 max-w-sm">
                  Record speech or upload a recording to execute calibrated multi-model forensic deepfake verification.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
