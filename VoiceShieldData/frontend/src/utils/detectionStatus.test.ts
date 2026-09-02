import { describe, it, expect } from 'vitest';
import {
  normalizePrediction,
  isInsufficientAudioResult,
  isInvalidDetectionResult,
  getAlertMessageForPrediction,
  deriveFraudRisk,
  getFraudRecommendation,
} from './detectionStatus';

describe('detectionStatus', () => {
  it('normalizes authentic and spoof predictions consistently', () => {
    expect(normalizePrediction('BONA_FIDE')).toBe('BONA_FIDE');
    expect(normalizePrediction('REAL')).toBe('BONA_FIDE');
    expect(normalizePrediction('SPOOF')).toBe('SPOOF');
    expect(normalizePrediction('FAKE')).toBe('SPOOF');
  });

  it('treats insufficient audio as a non-success classification', () => {
    expect(isInsufficientAudioResult({ prediction: 'INSUFFICIENT_AUDIO' })).toBe(true);
    expect(isInsufficientAudioResult({ prediction: 'BONA_FIDE', risk_score: 10 })).toBe(false);
  });

  it('treats review-required cases as uncertain rather than authentic', () => {
    expect(normalizePrediction('REVIEW_REQUIRED')).toBe('UNCERTAIN');
    expect(normalizePrediction('INSUFFICIENT_EVIDENCE')).toBe('UNCERTAIN');
  });

  it('flags invalid ML payloads and empty responses', () => {
    expect(isInvalidDetectionResult({})).toBe(true);
    expect(isInvalidDetectionResult({ prediction: 'INSUFFICIENT_AUDIO', risk_score: 0 })).toBe(false);
    expect(isInvalidDetectionResult({ prediction: 'BONA_FIDE', risk_score: 12.4 })).toBe(false);
  });

  it('keeps fraud-risk separate from voice authenticity and caps borderline cases conservatively', () => {
    expect(deriveFraudRisk({ risk_score: 6, confidence: 92, prediction: 'BONA_FIDE' })).toBeLessThanOrEqual(20);
    expect(deriveFraudRisk({ risk_score: 84, confidence: 91, prediction: 'SPOOF' })).toBeGreaterThan(60);
    expect(getFraudRecommendation(72)).toContain('independently verify');
  });

  it('never treats unknown or malformed results as authentic', () => {
    expect(isInvalidDetectionResult({ prediction: 'UNKNOWN', risk_score: 85 })).toBe(true);
    expect(isInvalidDetectionResult({ prediction: 'INVALID_RESULT', risk_score: null })).toBe(true);
    expect(getAlertMessageForPrediction('UNKNOWN', 85).type).toBe('error');
    expect(getAlertMessageForPrediction('INSUFFICIENT_AUDIO', 85).type).toBe('error');
  });
});
