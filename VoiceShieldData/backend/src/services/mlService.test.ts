import { describe, expect, it } from 'vitest';
import { normalizeMLResult } from './mlService';

describe('normalizeMLResult', () => {
  it('accepts a valid ML prediction payload', () => {
    const result = normalizeMLResult({
      success: true,
      request_id: 'req_123',
      filename: 'sample.wav',
      file_size_bytes: 1024,
      prediction: 'UNCERTAIN',
      classification: 'UNCERTAIN',
      confidence: 35,
      risk_score: 48.4,
      spoof_probability: 48.35,
      bona_fide_probability: 51.65,
      raw_probability: 0.4835,
      processing_time_ms: 2348,
      model_name: 'VoiceShield-v2.0.0-Ensemble',
      model_version: 'v2.0.0-champion',
      checkpoint_hash: 'abc123',
      forensics: {},
      explainability: [],
    });

    expect(result.prediction).toBe('UNCERTAIN');
    expect(result.confidence).toBe(35);
    expect(result.risk_score).toBe(48.4);
  });

  it('rejects malformed payloads with the explicit ML_INVALID_RESPONSE contract', () => {
    expect(() => normalizeMLResult({ success: true, status: 'completed' })).toThrowError(/ML_INVALID_RESPONSE|invalid result/i);
  });
});
