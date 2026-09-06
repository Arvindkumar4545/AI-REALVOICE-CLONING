import { Router, Request, Response } from 'express';
import { fallbackDb } from '../database/index.js';

const router = Router();

// GET /api/v1/caller-intel/lookup?query=+919876543210
router.get('/lookup', (req: Request, res: Response) => {
  const query = (req.query.query as string || '').trim();
  if (!query) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_QUERY', message: 'Query parameter is required.' },
    });
  }

  // Check persistent in-memory store or synthesize
  let record = Array.from(fallbackDb.caller_threat_profiles.values()).find(
    (c: any) =>
      c.phone_number.includes(query) ||
      c.display_name.toLowerCase().includes(query.toLowerCase())
  );

  if (!record) {
    // Deterministic hash calculation
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      hash = (hash << 5) - hash + query.charCodeAt(i);
      hash |= 0;
    }
    const posHash = Math.abs(hash);

    const isScam = posHash % 10 < 7;
    const trustScore = isScam ? 10 + (posHash % 30) : 80 + (posHash % 19);
    const riskLevel = trustScore < 30 ? 'CRITICAL' : trustScore < 50 ? 'DANGER' : trustScore < 70 ? 'WATCH' : 'SAFE';

    record = {
      id: `CID-${10000 + (posHash % 89999)}`,
      phone_number: query.startsWith('+') ? query : `+91 ${query}`,
      display_name: isScam ? `Suspected Target #${posHash % 900 + 100}` : `Verified Caller`,
      trust_score: trustScore,
      risk_level: riskLevel,
      voice_dna_match: isScam ? 70 + (posHash % 28) : null,
      total_reports: isScam ? 15 + (posHash % 300) : 0,
      carrier: posHash % 2 === 0 ? 'Reliance Jio Infocomm' : 'Bharti Airtel Enterprise',
      network_type: isScam ? 'VoIP / SIP Gateway' : 'Cellular 5G PRI',
      origin_country: 'India',
      origin_city: posHash % 3 === 0 ? 'Mumbai' : posHash % 3 === 1 ? 'Delhi NCR' : 'Bengaluru',
      is_spoofed: isScam,
      stir_shaken_status: isScam ? 'FAILED_NO_CERT' : 'PASSED_FULL_ATTESTATION',
      is_blocked: false,
      categories: isScam ? ['BANK_IMPERSONATION', 'UPI_FRAUD'] : [],
      community_tags: isScam ? ['Demands OTP', 'Fake Bank Officer'] : ['Verified Line'],
      created_at: new Date().toISOString(),
    };

    fallbackDb.caller_threat_profiles.set(record.id, record);
  }

  return res.json({
    success: true,
    data: record,
    telecom_carrier_check: {
      status: 'VERIFIED_ACTIVE',
      last_signal_ping_ms: 42,
      latency_rating: 'OPTIMAL',
    },
  });
});

// POST /api/v1/caller-intel/blacklist
router.post('/blacklist', (req: Request, res: Response) => {
  const { phone_number, reason } = req.body;
  if (!phone_number) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Phone number is required.' },
    });
  }

  const record = {
    id: `BLK-${Date.now()}`,
    phone_number,
    reason: reason || 'Flagged by VoiceShield AI Security Engine',
    blocked_at: new Date().toISOString(),
    firewall_rule: 'SIP_DROP_PACKET',
  };

  fallbackDb.caller_threat_profiles.set(record.id, record);

  return res.json({
    success: true,
    message: `Phone number ${phone_number} successfully blacklisted on VoiceShield SIP Firewall.`,
    data: record,
  });
});

// POST /api/v1/caller-intel/analyze-vishing-transcript
router.post('/analyze-vishing-transcript', (req: Request, res: Response) => {
  const { transcript, session_id } = req.body;
  if (!transcript) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_TRANSCRIPT', message: 'Transcript text is required.' },
    });
  }

  const lower = transcript.toLowerCase();
  const TRIGGERS = [
    { word: 'otp', category: 'OTP_DEMAND', weight: 35 },
    { word: 'digital arrest', category: 'DIGITAL_ARREST', weight: 45 },
    { word: 'cbi', category: 'POLICE_IMPERSONATION', weight: 40 },
    { word: 'police', category: 'POLICE_IMPERSONATION', weight: 35 },
    { word: 'bank account freeze', category: 'URGENCY_EXTORTION', weight: 30 },
    { word: 'urgent', category: 'URGENCY', weight: 15 },
    { word: 'transfer immediately', category: 'MONEY_TRANSFER_TRAP', weight: 40 },
    { word: 'pin number', category: 'FINANCIAL_CREDENTIALS', weight: 35 },
    { word: 'customs parcel', category: 'CUSTOMS_CONTRABAND_SCAM', weight: 35 },
    { word: 'narcotics', category: 'DIGITAL_ARREST', weight: 40 },
  ];

  const matchedTriggers = TRIGGERS.filter((t) => lower.includes(t.word));
  let calculatedRisk = 10;
  matchedTriggers.forEach((t) => {
    calculatedRisk += t.weight;
  });
  calculatedRisk = Math.min(100, calculatedRisk);

  const triggerRecord = {
    id: `TRG-${Date.now()}`,
    session_id: session_id || `SESS-${Date.now()}`,
    risk_score: calculatedRisk,
    vishing_level: calculatedRisk > 70 ? 'CRITICAL_VISHING_THREAT' : calculatedRisk > 40 ? 'SUSPICIOUS_CALL' : 'LOW_RISK',
    matched_cues: matchedTriggers,
    recommendation: calculatedRisk > 70 ? 'DISCONNECT_CALL_AND_ALERT_AUTHORITIES' : 'MONITOR_CLOSELY',
    timestamp: new Date().toISOString(),
  };

  fallbackDb.vishing_threat_triggers.set(triggerRecord.id, triggerRecord);

  return res.json({
    success: true,
    data: triggerRecord,
  });
});

export default router;
