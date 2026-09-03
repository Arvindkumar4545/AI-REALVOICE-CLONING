import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from '../config/index.js';

const ML_INVALID_RESPONSE_MESSAGE = 'The analysis service returned an invalid result.';

function invalidMlResponseError(message: string = ML_INVALID_RESPONSE_MESSAGE): Error {
  const error = new Error(`ML_INVALID_RESPONSE: ${message}`);
  return error;
}

function normalizePredictionLabel(value: unknown): string {
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return 'UNKNOWN';
  if (['BONAFIDE', 'BONA_FIDE', 'REAL', 'AUTHENTIC'].includes(text)) return 'BONA_FIDE';
  if (['SPOOF', 'FAKE', 'SYNTHETIC', 'CLONED'].includes(text)) return 'SPOOF';
  if (['UNCERTAIN', 'REVIEW_REQUIRED', 'LOW_CONFIDENCE'].includes(text)) return 'UNCERTAIN';
  if (['INSUFFICIENT_AUDIO', 'INSUFFICIENT', 'TOO_SHORT'].includes(text)) return 'INSUFFICIENT_AUDIO';
  if (['INVALID_RESULT', 'ERROR', 'MALFORMED'].includes(text)) return 'INVALID_RESULT';
  return text;
}

function deriveFraudRisk(prediction: string, riskScore: number, confidence: number): number {
  let base = 0;
  if (prediction === 'SPOOF') base = 35;
  else if (prediction === 'UNCERTAIN') base = 20;
  else if (prediction === 'BONA_FIDE') base = 5;

  const riskComponent = riskScore * 0.45;
  const confidenceFactor = (100 - confidence) * 0.2;
  const total = base + riskComponent + confidenceFactor;
  return Number(Math.min(100, Math.max(0, total)).toFixed(1));
}

export function normalizeMLResult(payload: any): MLPredictResponse {
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    throw invalidMlResponseError();
  }

  const prediction = normalizePredictionLabel(payload.prediction ?? payload.classification ?? payload.status ?? '');
  const riskScore = Number(payload.risk_score ?? payload.riskScore ?? payload.score ?? NaN);
  const confidence = Number(payload.confidence ?? payload.confidence_score ?? 0);
  const spoofProbability = Number(payload.spoof_probability ?? payload.spoofProbability ?? payload.spoof_prob ?? 0);
  const bonaFideProbability = Number(payload.bona_fide_probability ?? payload.bonaFideProbability ?? payload.bonafide_probability ?? 1);

  if (prediction === 'INVALID_RESULT' || prediction === 'UNKNOWN') {
    throw invalidMlResponseError();
  }

  if (prediction !== 'INSUFFICIENT_AUDIO') {
    if (!Number.isFinite(riskScore) || !Number.isFinite(confidence) || !Number.isFinite(spoofProbability) || !Number.isFinite(bonaFideProbability)) {
      throw invalidMlResponseError();
    }
    if (riskScore < 0 || riskScore > 100 || confidence < 0 || confidence > 100 || spoofProbability < 0 || spoofProbability > 100 || bonaFideProbability < 0 || bonaFideProbability > 100) {
      throw invalidMlResponseError('The analysis service returned an out-of-range result.');
    }
  }

  const fraudRisk = deriveFraudRisk(prediction, prediction === 'INSUFFICIENT_AUDIO' ? 0 : riskScore, confidence);

  return {
    ...payload,
    prediction,
    classification: payload.classification ?? prediction,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    risk_score: prediction === 'INSUFFICIENT_AUDIO' ? 0 : riskScore,
    fraud_risk: fraudRisk,
    spoof_probability: Number.isFinite(spoofProbability) ? spoofProbability : 0,
    bona_fide_probability: Number.isFinite(bonaFideProbability) ? bonaFideProbability : 100,
    raw_probability: Number(payload.raw_probability ?? payload.rawProbability ?? spoofProbability ?? 0),
    decision_reason: payload.decision_reason ?? payload.decisionReason ?? 'Forensic evaluation completed.',
    replay_analysis: payload.replay_analysis ?? null,
    voice_continuity: payload.voice_continuity ?? null,
    copilot_analysis: payload.copilot_analysis ?? null,
  } as MLPredictResponse;
}

export interface MLPredictResponse {
  success: boolean;
  request_id: string;
  filename: string;
  file_size_bytes: number;
  prediction: 'BONA_FIDE' | 'SPOOF' | 'UNCERTAIN' | 'INSUFFICIENT_AUDIO' | string;
  classification?: string;
  confidence: number;
  uncertainty?: number;
  risk_score: number;
  fraud_risk?: number;
  risk_tier?: string;
  spoof_probability: number;
  bona_fide_probability: number;
  raw_probability: number;
  processing_time_ms: number;
  model_name: string;
  model_version: string;
  checkpoint_hash: string;
  model_agreement?: number;
  decision_reason?: string;
  windows_analyzed?: number;
  suspicious_windows?: number;
  model_scores?: Record<string, number | null>;
  audio_quality?: any;
  replay_analysis?: any;
  voice_continuity?: any;
  copilot_analysis?: any;
  forensics: any;
  explainability: any[];
  model_explanation_note?: string;
}

export class MLService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.mlService.url,
      timeout: config.mlService.timeoutMs,
    });
  }

  async predict(filePath: string, filename: string, requestId: string): Promise<MLPredictResponse> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found on disk: ${filePath}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), { filename });

    const response = await this.client.post<any>('/predict', form, {
      headers: {
        ...form.getHeaders(),
        'X-Request-ID': requestId,
      },
    });

    return normalizeMLResult(response.data);
  }

  async validateAudio(filePath: string, filename: string): Promise<any> {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), { filename });

    const response = await this.client.post('/validate-audio', form, {
      headers: form.getHeaders(),
    });

    return response.data;
  }

  async getModelInfo(): Promise<any> {
    const response = await this.client.get('/model/info');
    return response.data;
  }

  async getHealth(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const mlService = new MLService();
