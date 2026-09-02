export type DetectionPrediction =
  | 'BONA_FIDE'
  | 'REAL'
  | 'SPOOF'
  | 'FAKE'
  | 'UNCERTAIN'
  | 'REVIEW_REQUIRED'
  | 'INSUFFICIENT_AUDIO'
  | 'INSUFFICIENT_EVIDENCE'
  | 'INVALID_RESULT'
  | 'UNKNOWN'
  | string;

export function normalizePrediction(value: unknown): string {
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return 'UNKNOWN';

  if (text === 'BONAFIDE' || text === 'BONA_FIDE' || text === 'REAL' || text === 'AUTHENTIC') return 'BONA_FIDE';
  if (text === 'SPOOF' || text === 'FAKE' || text === 'SYNTHETIC' || text === 'CLONED') return 'SPOOF';
  if (text === 'UNCERTAIN' || text === 'REVIEW_REQUIRED' || text === 'LOW_CONFIDENCE' || text === 'INSUFFICIENT_EVIDENCE') return 'UNCERTAIN';
  if (text === 'INSUFFICIENT_AUDIO' || text === 'INSUFFICIENT' || text === 'TOO_SHORT') return 'INSUFFICIENT_AUDIO';
  if (text === 'INVALID_RESULT' || text === 'ERROR' || text === 'MALFORMED') return 'INVALID_RESULT';
  if (text === 'UNKNOWN' || text === 'UNDETERMINED') return 'UNKNOWN';
  return text;
}

export function getEffectiveDetectionData(payload: any): any {
  if (!payload || typeof payload !== 'object') return null;

  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }

  if (payload.result && typeof payload.result === 'object') {
    return payload.result;
  }

  return payload;
}

export function isInsufficientAudioResult(data: any): boolean {
  const normalized = normalizePrediction(data?.prediction ?? data?.classification ?? data?.status ?? '');
  return normalized === 'INSUFFICIENT_AUDIO';
}

export function isReviewRequiredResult(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  const normalized = normalizePrediction(data?.prediction ?? data?.classification ?? data?.status ?? '');
  const riskScore = Number(data?.risk_score ?? data?.riskScore ?? data?.score ?? 0);

  return normalized === 'UNCERTAIN' || (Number.isFinite(riskScore) && riskScore >= 40 && riskScore <= 65);
}

export function isInvalidDetectionResult(data: any): boolean {
  if (!data || typeof data !== 'object') return true;
  if (data.success === false || data.error) return true;

  const riskScore = Number(data.risk_score ?? data.riskScore ?? data.score ?? NaN);
  const confidence = Number(data.confidence ?? data.confidence_score ?? 0);
  const prediction = normalizePrediction(data.prediction ?? data.classification ?? data.status ?? '');

  if (prediction === 'INVALID_RESULT' || prediction === 'UNKNOWN') return true;
  if (prediction === 'INSUFFICIENT_AUDIO') return false;
  if (!Number.isFinite(riskScore) || !Number.isFinite(confidence)) return true;

  return false;
}

export function deriveFraudRisk(data: any): number {
  if (!data || typeof data !== 'object') return 0;

  const authenticityRisk = Number(data.risk_score ?? data.riskScore ?? data.score ?? 0);
  const confidence = Number(data.confidence ?? data.confidence_score ?? 0);
  const prediction = normalizePrediction(data.prediction ?? data.classification ?? data.status ?? '');

  let base = 0;
  if (prediction === 'SPOOF') base += 35;
  else if (prediction === 'UNCERTAIN') base += 20;
  else if (prediction === 'BONA_FIDE') base += 5;

  const riskComponent = authenticityRisk * 0.45;
  const confidenceFactor = (100 - confidence) * 0.2;
  const total = Math.min(100, Math.max(0, base + riskComponent + confidenceFactor));

  return Number(total.toFixed(1));
}

export function getFraudRecommendation(score: number): string {
  if (!Number.isFinite(score)) return 'Manual review required before trusting the request.';
  if (score >= 75) {
    return 'Potential social-engineering indicators detected. End the call and independently verify the request using a trusted contact method.';
  }
  if (score >= 45) {
    return 'Some pressure or impersonation indicators may be present. Please independently verify the request before taking action.';
  }
  return 'No strong fraud indicators detected from the current evidence. Continue with standard verification practices.';
}

export function getAlertMessageForPrediction(prediction: string, confidence?: number): { title: string; message: string; type: 'success' | 'warning' | 'error' } {
  const normalized = normalizePrediction(prediction);

  if (normalized === 'INSUFFICIENT_AUDIO') {
    return {
      type: 'error',
      title: 'Audio too short or low quality',
      message: 'Analysis could not complete reliably: the audio sample is too short or low quality for forensic review.',
    };
  }

  if (normalized === 'INVALID_RESULT' || normalized === 'UNKNOWN') {
    return {
      type: 'error',
      title: 'Analysis unavailable',
      message: 'The ML service returned an invalid or incomplete result and no verdict can be trusted.',
    };
  }

  if (normalized === 'UNCERTAIN') {
    return {
      type: 'warning',
      title: 'Review required',
      message: 'The evidence is mixed or borderline. Manual verification is recommended before trust is placed in the voice.',
    };
  }

  if (normalized === 'SPOOF' || normalized === 'FAKE') {
    return {
      type: 'warning',
      title: 'Threat Detected',
      message: `Audio analysis finished: ${normalized} (${Math.round(Number(confidence ?? 0))}% confidence)`,
    };
  }

  return {
    type: 'success',
    title: 'Likely Authentic',
    message: `Audio analysis finished: ${normalized} (${Math.round(Number(confidence ?? 0))}% confidence)`,
  };
}
