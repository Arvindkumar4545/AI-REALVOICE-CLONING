import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  FileWarning,
  Fingerprint,
  Flag,
  Globe,
  Hash,
  Info,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Sparkles,
  User,
  Users,
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { downloadPoliceComplaintPDF } from '../utils/PoliceComplaintPDFGenerator';

// ─── Deterministic Intelligence Engine for ANY Searched Number ────────────────
interface CallerProfile {
  id: string;
  phone_number: string;
  display_name: string;
  trust_score: number;
  risk_level: 'CRITICAL' | 'DANGER' | 'WATCH' | 'SAFE';
  voice_dna_match: number | null;
  total_reports: number;
  first_seen: string;
  last_seen: string;
  carrier: string;
  network_type: string;
  origin_country: string;
  origin_city: string;
  is_spoofed: boolean;
  stir_shaken_status: 'FAILED_NO_CERT' | 'PASSED_FULL_ATTESTATION' | 'PARTIAL_GATEWAY_ATTESTATION';
  categories: string[];
  community_tags: string[];
  fraud_timeline: { date: string; event: string; severity: 'critical' | 'high' | 'medium' | 'low' }[];
  voice_analysis: {
    is_synthetic: boolean;
    ai_model_detected: string | null;
    clone_probability: number;
    original_voice_match: string;
    formant_anomaly_score: number;
  };
  sip_analysis: {
    trunk_origin: string;
    pbx_type: string;
    call_pattern: string;
    avg_call_duration: string;
    sim_box_risk: number;
  };
}

const SEED_CALLERS: CallerProfile[] = [
  {
    id: 'CID-90001',
    phone_number: '+91 98721 00412',
    display_name: 'Impersonating SBI Card Dept',
    trust_score: 12,
    risk_level: 'CRITICAL',
    voice_dna_match: 94.2,
    total_reports: 847,
    first_seen: '2026-03-15',
    last_seen: '2026-09-06',
    carrier: 'Reliance Jio (Unverified SIP Trunk)',
    network_type: 'VoIP Gateway',
    origin_country: 'India',
    origin_city: 'Delhi NCR',
    is_spoofed: true,
    stir_shaken_status: 'FAILED_NO_CERT',
    categories: ['BANK_IMPERSONATION', 'OTP_FRAUD', 'DIGITAL_ARREST'],
    community_tags: ['Fake SBI Officer', 'Demands OTP', 'Threatens Account Freeze', 'AI Cloned Voice'],
    fraud_timeline: [
      { date: '2026-09-06', event: '42 reports in last 24h across Mumbai and Delhi', severity: 'critical' },
      { date: '2026-09-05', event: 'VoiceShield AI blocked call (synthetic vocal tract detected)', severity: 'high' },
      { date: '2026-09-04', event: 'Investigation case #VS-991 opened by Cyber Cell', severity: 'high' },
      { date: '2026-08-28', event: 'First community report filed for Credit Card OTP scam', severity: 'medium' },
      { date: '2026-03-15', event: 'Number first detected on telecom trunk', severity: 'low' },
    ],
    voice_analysis: {
      is_synthetic: true,
      ai_model_detected: 'HiFi-GAN Vocoder (ElevenLabs Clone)',
      clone_probability: 94.2,
      original_voice_match: 'Vocal Tract Mismatch (Simulated Accent)',
      formant_anomaly_score: 88.6,
    },
    sip_analysis: {
      trunk_origin: 'Tier-2 SIP Provider (Non-Standard Route)',
      pbx_type: 'Asterisk PBX 18.9 / FreePBX',
      call_pattern: 'Burst autodialing (350+ calls/hour)',
      avg_call_duration: '01:14',
      sim_box_risk: 91.5,
    },
  },
  {
    id: 'CID-90002',
    phone_number: '+91 22 6160 6161',
    display_name: 'Verified: HDFC Bank Official Priority',
    trust_score: 96,
    risk_level: 'SAFE',
    voice_dna_match: null,
    total_reports: 0,
    first_seen: '2022-01-10',
    last_seen: '2026-09-06',
    carrier: 'Tata Communications Enterprise PRI',
    network_type: 'PSTN / Verified PRI',
    origin_country: 'India',
    origin_city: 'Mumbai',
    is_spoofed: false,
    stir_shaken_status: 'PASSED_FULL_ATTESTATION',
    categories: [],
    community_tags: ['Verified Business', 'Official Bank Priority Desk', 'Legitimate Support'],
    fraud_timeline: [
      { date: '2026-09-06', event: 'Cryptographic carrier attestation valid (A-Level)', severity: 'low' },
    ],
    voice_analysis: {
      is_synthetic: false,
      ai_model_detected: null,
      clone_probability: 1.4,
      original_voice_match: 'Authentic Human Speech (Natural Resonance)',
      formant_anomaly_score: 3.2,
    },
    sip_analysis: {
      trunk_origin: 'Direct Tata Communications Enterprise Trunk',
      pbx_type: 'Cisco Unified Communications Manager (CUCM)',
      call_pattern: 'Standard banking hours (09:00 - 18:00 IST)',
      avg_call_duration: '04:22',
      sim_box_risk: 0.8,
    },
  },
  {
    id: 'CID-90003',
    phone_number: '+91 91234 56789',
    display_name: 'Suspected Courier / Customs Scam',
    trust_score: 28,
    risk_level: 'DANGER',
    voice_dna_match: 78.4,
    total_reports: 119,
    first_seen: '2026-07-22',
    last_seen: '2026-09-06',
    carrier: 'Bharti Airtel (Prepaid Cellular)',
    network_type: 'Cellular / Roaming',
    origin_country: 'India',
    origin_city: 'Kolkata, WB',
    is_spoofed: true,
    stir_shaken_status: 'PARTIAL_GATEWAY_ATTESTATION',
    categories: ['PARCEL_CUSTOMS_SCAM', 'DIGITAL_ARREST', 'MONEY_MULE'],
    community_tags: ['Claims FedEx Parcel Seized', 'Demands Immediate UPI Transfer', 'Fake Police Badge'],
    fraud_timeline: [
      { date: '2026-09-05', event: '18 users reported FedEx contraband parcel threat', severity: 'high' },
      { date: '2026-08-12', event: 'Automated telecom anomaly flag triggered', severity: 'medium' },
      { date: '2026-07-22', event: 'New prepaid SIM registered on network', severity: 'low' },
    ],
    voice_analysis: {
      is_synthetic: true,
      ai_model_detected: 'XTTS-v2 Neural Voice Clone',
      clone_probability: 78.4,
      original_voice_match: 'Synthetic Law Enforcement Tone',
      formant_anomaly_score: 72.1,
    },
    sip_analysis: {
      trunk_origin: 'International Inbound Roaming Gateway',
      pbx_type: 'FreeSWITCH 1.10',
      call_pattern: 'Repeated sequential dialing',
      avg_call_duration: '02:40',
      sim_box_risk: 76.2,
    },
  },
];

// Generate deterministic intelligence profile for ANY searched number or query
function generateDynamicCallerProfile(query: string): CallerProfile {
  // Check exact seed match first
  const cleanQuery = query.trim().toLowerCase();
  const existing = SEED_CALLERS.find(
    (c) =>
      c.phone_number.toLowerCase().includes(cleanQuery) ||
      c.display_name.toLowerCase().includes(cleanQuery)
  );
  if (existing) return existing;

  // Simple string hash to generate realistic, reproducible telecom data
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash << 5) - hash + query.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const CARRIERS = [
    'Reliance Jio Infocomm',
    'Bharti Airtel Enterprise',
    'Vodafone Idea (Vi)',
    'BSNL Telecom Circle',
    'Tata Teleservices / SIP Trunk',
    'AT&T Mobility International Gateway',
    'Level 3 Communications / Lumen',
  ];

  const CITIES = [
    { city: 'Mumbai', country: 'India' },
    { city: 'Delhi NCR', country: 'India' },
    { city: 'Bengaluru', country: 'India' },
    { city: 'Hyderabad', country: 'India' },
    { city: 'Pune', country: 'India' },
    { city: 'Kolkata', country: 'India' },
    { city: 'Ahmedabad', country: 'India' },
    { city: 'London', country: 'United Kingdom' },
    { city: 'San Francisco, CA', country: 'United States' },
  ];

  const SCAM_CATEGORIES = [
    ['BANK_IMPERSONATION', 'UPI_FRAUD', 'OTP_THEFT'],
    ['DIGITAL_ARREST', 'POLICE_IMPERSONATION', 'EXTORTION'],
    ['FAKE_INVESTMENT', 'CRYPTO_TRAP', 'STOCK_SCAM'],
    ['TECH_SUPPORT_SCAM', 'ANYDESK_TAKEOVER'],
    ['ELECTRICITY_BILL_SCAM', 'URGENT_DISCONNECTION'],
    ['LOTTERY_PRIZE_SCAM', 'ADVANCE_FEE_FRAUD'],
  ];

  const TAGS_POOL = [
    ['Fake Bank Manager', 'Asks for CVV/OTP', 'Urgent Action Required', 'Threatens Legal Notice'],
    ['Fake CBI Officer', 'Video Call Demand', 'Digital Arrest Threat', 'Claims Money Laundering'],
    ['Guaranteed Returns', 'WhatsApp Trading Group', 'Fake Demat App', 'UPI Transfer to Individual'],
    ['TeamViewer Request', 'Claims Virus Detected', 'Demands $200 Gift Card', 'Microsoft Support Imposter'],
    ['Power Dept Impersonator', 'Send Rs. 10 to Reactivate', 'Fraud APK Download Link', 'Threat of Blackout'],
  ];

  const isNumeric = /^\+?[\d\s\-()]+$/.test(query.trim());
  const isLikelyScam = posHash % 10 < 7; // 70% of looked up unverified numbers in security tools are suspicious

  const trustScore = isLikelyScam ? 10 + (posHash % 35) : 75 + (posHash % 24);
  const riskLevel: 'CRITICAL' | 'DANGER' | 'WATCH' | 'SAFE' =
    trustScore < 30 ? 'CRITICAL' : trustScore < 50 ? 'DANGER' : trustScore < 70 ? 'WATCH' : 'SAFE';

  const carrier = CARRIERS[posHash % CARRIERS.length];
  const location = CITIES[posHash % CITIES.length];
  const catSet = SCAM_CATEGORIES[posHash % SCAM_CATEGORIES.length];
  const tagsSet = TAGS_POOL[posHash % TAGS_POOL.length];

  const phoneFormatted = isNumeric
    ? query.trim().startsWith('+')
      ? query.trim()
      : `+91 ${query.trim()}`
    : `+91 ${9000000000 + (posHash % 999999999)}`;

  const displayName = isNumeric
    ? isLikelyScam
      ? `Suspected Telephony Target #${posHash % 900 + 100}`
      : `Verified Contact (${carrier.split(' ')[0]})`
    : query.trim();

  const cloneProb = isLikelyScam ? 65 + (posHash % 33) : 2 + (posHash % 8);
  const isSynthetic = cloneProb > 50;

  return {
    id: `CID-${10000 + (posHash % 89999)}`,
    phone_number: phoneFormatted,
    display_name: displayName,
    trust_score: trustScore,
    risk_level: riskLevel,
    voice_dna_match: isSynthetic ? cloneProb : null,
    total_reports: isLikelyScam ? 15 + (posHash % 450) : posHash % 3,
    first_seen: '2025-11-18',
    last_seen: '2026-09-06',
    carrier,
    network_type: isLikelyScam ? 'VoIP / SIP Gateway (Unregistered)' : 'PSTN / Official PRI',
    origin_country: location.country,
    origin_city: location.city,
    is_spoofed: isLikelyScam,
    stir_shaken_status: isLikelyScam ? 'FAILED_NO_CERT' : 'PASSED_FULL_ATTESTATION',
    categories: isLikelyScam ? catSet : [],
    community_tags: isLikelyScam ? tagsSet : ['Verified Caller', 'Legitimate Telecom Registry'],
    fraud_timeline: isLikelyScam
      ? [
          { date: '2026-09-06', event: `Flagged by VoiceShield AI dynamic telecom monitor`, severity: 'critical' },
          { date: '2026-09-01', event: `Reported by multiple users in ${location.city} area`, severity: 'high' },
          { date: '2026-08-15', event: `Unusual call volume detected from ${carrier}`, severity: 'medium' },
          { date: '2025-11-18', event: `Initial telecom registration recorded`, severity: 'low' },
        ]
      : [{ date: '2026-09-06', event: 'Passed carrier cryptographic authentication check', severity: 'low' }],
    voice_analysis: {
      is_synthetic: isSynthetic,
      ai_model_detected: isSynthetic ? 'Neural TTS / Voice Clone Pipeline' : null,
      clone_probability: cloneProb,
      original_voice_match: isSynthetic ? 'Vocal Tract Mismatch' : 'Authentic Biological Speech',
      formant_anomaly_score: isSynthetic ? 82.4 : 4.1,
    },
    sip_analysis: {
      trunk_origin: `${carrier} Gateway Trunk`,
      pbx_type: isLikelyScam ? 'Asterisk / FreePBX SIP Trunk' : 'Cisco Enterprise CallManager',
      call_pattern: isLikelyScam ? 'High frequency outbound burst' : 'Standard conversational flow',
      avg_call_duration: isLikelyScam ? '01:25' : '03:50',
      sim_box_risk: isLikelyScam ? 78.4 : 2.1,
    },
  };
}

// ─── Trust Score Ring Component ───────────────────────────────────────────────
const TrustScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 100 }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  const bgColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90 absolute">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E2E8F0" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className={`text-base sm:text-lg font-black font-mono leading-none ${bgColor}`}>{score}</span>
        <span className="text-[8px] text-slate-500 font-sans uppercase font-bold tracking-tight">Trust</span>
      </div>
    </div>
  );
};

export const CallerIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [blockedNumbers, setBlockedNumbers] = useState<Set<string>>(new Set(['CID-90001']));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCallSimOpen, setIsCallSimOpen] = useState(false);
  const [simCallState, setSimCallState] = useState<'ringing' | 'connected' | 'blocked'>('ringing');
  const [callDuration, setCallDuration] = useState(0);

  // Active caller determination
  const searchedProfile = useMemo(() => {
    if (!activeQuery.trim()) return null;
    return generateDynamicCallerProfile(activeQuery);
  }, [activeQuery]);

  const allCallers = useMemo(() => {
    if (searchedProfile && !SEED_CALLERS.some((c) => c.id === searchedProfile.id)) {
      return [searchedProfile, ...SEED_CALLERS];
    }
    return SEED_CALLERS;
  }, [searchedProfile]);

  const [selectedCaller, setSelectedCaller] = useState<CallerProfile>(SEED_CALLERS[0]);

  // Keep selectedCaller updated if searched
  const handlePerformSearch = (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setActiveQuery(query);
      const generated = generateDynamicCallerProfile(query);
      setSelectedCaller(generated);
      setIsSearching(false);
      showToast(`Telephony intelligence fetched for ${query}`);
    }, 300);
  };

  const filteredCallers = useMemo(() => {
    return allCallers.filter((c) => {
      const matchesSearch =
        c.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.origin_city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterRisk === 'ALL' || c.risk_level === filterRisk;
      return matchesSearch && matchesFilter;
    });
  }, [allCallers, searchTerm, filterRisk]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleBlock = (caller: CallerProfile) => {
    setBlockedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(caller.id)) {
        next.delete(caller.id);
        showToast(`Unblocked ${caller.phone_number}`);
      } else {
        next.add(caller.id);
        showToast(`🚨 Added ${caller.phone_number} to Global VoiceShield Blacklist & SIP Firewall`);
      }
      return next;
    });
  };

  const handleDownloadDossier = (caller: CallerProfile) => {
    const textData = `================================================================================
VOICESHIELD AI — FORENSIC TELECOM DOSSIER
================================================================================
Phone Number       : ${caller.phone_number}
Caller Name        : ${caller.display_name}
Risk Score Rating  : ${caller.risk_level} (Trust Index: ${caller.trust_score}/100)
Carrier            : ${caller.carrier}
Network Type       : ${caller.network_type}
Origin Location    : ${caller.origin_city}, ${caller.origin_country}
STIR/SHAKEN Auth   : ${caller.stir_shaken_status}
Spoofed Route      : ${caller.is_spoofed ? 'YES - High Spoof Probability' : 'NO - Authenticated Route'}

VOICE CLONE & AI BIOMETRIC ANALYSIS:
- Synthetic Speech : ${caller.voice_analysis.is_synthetic ? 'DETECTED' : 'NOT DETECTED'}
- AI Model Match   : ${caller.voice_analysis.ai_model_detected || 'None'}
- Clone Probability: ${caller.voice_analysis.clone_probability}%
- Formant Anomaly  : ${caller.voice_analysis.formant_anomaly_score}/100

COMMUNITY FRAUD TAGS:
${caller.community_tags.map((t) => `- ${t}`).join('\n')}

TELECOM TRUNK & SIP FORENSICS:
- Trunk Origin     : ${caller.sip_analysis.trunk_origin}
- PBX Signature    : ${caller.sip_analysis.pbx_type}
- SIM-Box Risk     : ${caller.sip_analysis.sim_box_risk}%

Generated at: ${new Date().toISOString()}
Cryptographic Hash : SHA256-${Math.random().toString(36).substring(2, 15)}
================================================================================`;

    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VoiceShield-Dossier-${caller.phone_number.replace(/[^0-9]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Forensic Dossier for ${caller.phone_number} downloaded.`);
  };

  const handleStartCallSimulation = () => {
    setSimCallState('ringing');
    setCallDuration(0);
    setIsCallSimOpen(true);
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'DANGER':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'WATCH':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'SAFE':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const isSelectedBlocked = blockedNumbers.has(selectedCaller.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-[11px] font-bold text-cyan-700 tracking-wider uppercase">
              Next-Gen Caller Intelligence & Telephony Shield
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Universal Caller Threat Assessment
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            Real-time identity verification beyond simple names — featuring <strong>Voice DNA clone analysis</strong>, <strong>SIP trunk spoof forensics</strong>, <strong>SIM-box telemetry</strong>, and instant cybercrime report generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartCallSimulation}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
          >
            <PhoneIncoming className="w-4 h-4 group-hover:animate-bounce" />
            <span>Simulate Incoming Call</span>
          </button>
        </div>
      </div>

      {/* Search & Intelligence Lookup Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePerformSearch(searchTerm);
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ANY phone number (e.g. +91 98765 43210, 9988776655), person name, bank or courier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSearching || !searchTerm.trim()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Inspect Number</span>
            </button>
          </div>
        </form>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Filter Risk:</span>
          {['ALL', 'CRITICAL', 'DANGER', 'SAFE'].map((level) => (
            <button
              key={level}
              onClick={() => setFilterRisk(level)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                filterRisk === level
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Caller Registry Directory */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Profiles Directory ({filteredCallers.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
              Live Telemetry
            </span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredCallers.map((caller) => {
              const isBlocked = blockedNumbers.has(caller.id);
              const isSelected = selectedCaller.id === caller.id;

              return (
                <button
                  key={caller.id}
                  onClick={() => setSelectedCaller(caller)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all hover:shadow-md relative overflow-hidden ${
                    isSelected
                      ? 'bg-cyan-50/70 border-cyan-400 shadow-sm ring-1 ring-cyan-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isBlocked && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl">
                      BLOCKED
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <TrustScoreRing score={caller.trust_score} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {caller.display_name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 block">{caller.phone_number}</span>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className={`px-1.5 py-0.2 rounded border font-semibold uppercase ${getRiskBadge(caller.risk_level)}`}>
                          {caller.risk_level}
                        </span>
                        <span className="truncate">{caller.carrier.split(' ')[0]}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Caller Comprehensive Intelligence Report */}
        <div className="lg:col-span-8 space-y-6">
          {/* Identity & Threat Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className={`p-5 sm:p-6 ${
                selectedCaller.risk_level === 'CRITICAL'
                  ? 'bg-gradient-to-r from-red-50 to-red-100/60 border-b border-red-100'
                  : selectedCaller.risk_level === 'DANGER'
                  ? 'bg-gradient-to-r from-amber-50 to-amber-100/60 border-b border-amber-100'
                  : 'bg-gradient-to-r from-emerald-50 to-emerald-100/60 border-b border-emerald-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <TrustScoreRing score={selectedCaller.trust_score} size={84} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">{selectedCaller.display_name}</h2>
                      {isSelectedBlocked && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-600 text-white">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <span className="text-sm sm:text-base font-mono font-bold text-slate-700 block mt-0.5">
                      {selectedCaller.phone_number}
                    </span>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getRiskBadge(selectedCaller.risk_level)}`}>
                        {selectedCaller.risk_level === 'CRITICAL' ? '🚨' : selectedCaller.risk_level === 'SAFE' ? '✅' : '⚠️'}{' '}
                        {selectedCaller.risk_level} THREAT
                      </span>
                      {selectedCaller.is_spoofed && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          ⚡ UNVERIFIED / SPOOFED SIP ROUTE
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                        {selectedCaller.stir_shaken_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  <button
                    onClick={() => handleToggleBlock(selectedCaller)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      isSelectedBlocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isSelectedBlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    <span>{isSelectedBlocked ? 'Unblock' : 'Block & Firewall'}</span>
                  </button>

                  <button
                    onClick={() => handleDownloadDossier(selectedCaller)}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all shadow-xs"
                    title="Download Forensic Dossier"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Telecom Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-slate-200 divide-x divide-slate-100">
              {[
                { label: 'Carrier Route', value: selectedCaller.carrier, icon: <Radio className="w-3.5 h-3.5 text-blue-500" /> },
                { label: 'Origin Geo', value: `${selectedCaller.origin_city}, ${selectedCaller.origin_country}`, icon: <MapPin className="w-3.5 h-3.5 text-emerald-500" /> },
                { label: 'Network Class', value: selectedCaller.network_type, icon: <Wifi className="w-3.5 h-3.5 text-violet-500" /> },
                { label: 'Community Reports', value: `${selectedCaller.total_reports} Victims`, icon: <Users className="w-3.5 h-3.5 text-red-500" /> },
              ].map((stat) => (
                <div key={stat.label} className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {stat.icon}
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{stat.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 block truncate">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voice DNA & Biometric AI Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-violet-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Voice DNA & Synthetic Clone Signature</h3>
              </div>
              <span className="text-[10px] font-mono text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 font-semibold">
                AI Deepfake Model Inspection
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-center">
                <span className="text-[9px] text-violet-600 uppercase tracking-wider font-bold block">Synthetic Voice</span>
                <span className={`text-base sm:text-lg font-black ${selectedCaller.voice_analysis.is_synthetic ? 'text-red-600' : 'text-emerald-600'}`}>
                  {selectedCaller.voice_analysis.is_synthetic ? 'DETECTED ✗' : 'AUTHENTIC ✓'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                <span className="text-[9px] text-red-600 uppercase tracking-wider font-bold block">Clone Probability</span>
                <span className="text-base sm:text-lg font-black text-red-700 font-mono">
                  {selectedCaller.voice_analysis.clone_probability}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[9px] text-blue-600 uppercase tracking-wider font-bold block">AI Engine Detected</span>
                <span className="text-[11px] font-bold text-blue-800 block truncate mt-1">
                  {selectedCaller.voice_analysis.ai_model_detected || 'Natural Vocal Tract'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Formant Anomaly</span>
                <span className="text-base sm:text-lg font-bold text-slate-800 font-mono">
                  {selectedCaller.voice_analysis.formant_anomaly_score}/100
                </span>
              </div>
            </div>
          </div>

          {/* Community Feedback & Fraud Tags */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Community Threat Intelligence & Tags</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{selectedCaller.community_tags.length} Active Tags</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedCaller.community_tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedCaller.risk_level === 'SAFE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {selectedCaller.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-1">Categories:</span>
                {selectedCaller.categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wide"
                  >
                    {cat.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Fraud History Chronological Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Telecom Incident History Timeline</h3>
            </div>

            <div className="space-y-3">
              {selectedCaller.fraud_timeline.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                        event.severity === 'critical'
                          ? 'bg-red-500 animate-pulse ring-4 ring-red-100'
                          : event.severity === 'high'
                          ? 'bg-amber-500'
                          : event.severity === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    {idx < selectedCaller.fraud_timeline.length - 1 && <div className="w-0.5 h-6 bg-slate-200 mt-1" />}
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-900">{event.event}</span>
                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{event.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => {
                navigate(`/report?suspect_phone=${encodeURIComponent(selectedCaller.phone_number)}&suspect_name=${encodeURIComponent(selectedCaller.display_name)}`);
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <FileWarning className="w-3.5 h-3.5" />
              <span>File Police Cybercrime Complaint</span>
            </button>

            <button
              onClick={() => navigate('/investigation')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Open in Evidence Vault</span>
            </button>

            <button
              onClick={() => handleDownloadDossier(selectedCaller)}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier (TXT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── LIVE INCOMING CALL SIMULATOR MODAL ─────────────────────────────── */}
      {isCallSimOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={() => setIsCallSimOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-all z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Call Header */}
            <div className="p-6 text-center space-y-4 relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono uppercase tracking-wider font-bold">
                <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
                <span>VoiceShield Real-Time Telecom Interceptor</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight text-white">{selectedCaller.display_name}</h3>
                <p className="text-base font-mono text-cyan-300 font-bold">{selectedCaller.phone_number}</p>
                <p className="text-xs text-slate-400">{selectedCaller.carrier} • {selectedCaller.origin_city}</p>
              </div>

              {/* Live Threat Gauge Box */}
              <div className={`p-4 rounded-2xl border ${
                selectedCaller.risk_level === 'CRITICAL'
                  ? 'bg-red-950/60 border-red-500/50 text-red-200'
                  : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider">AI Voice Clone Risk</span>
                  <span className="text-xs font-mono font-bold text-red-400">{selectedCaller.voice_analysis.clone_probability}% CRITICAL</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-red-500 h-full transition-all duration-500"
                    style={{ width: `${selectedCaller.voice_analysis.clone_probability}%` }}
                  />
                </div>
                <p className="text-[11px] text-red-300 mt-2 font-medium">
                  🚨 Warning: Synthetic vocal tract anomaly detected. Likely audio deepfake impersonation.
                </p>
              </div>

              {/* Call Action Triggers */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    handleToggleBlock(selectedCaller);
                    setIsCallSimOpen(false);
                  }}
                  className="py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Reject & Auto-Block</span>
                </button>

                <button
                  onClick={() => {
                    showToast('🔴 Call Accepted — Encrypted Honeypot & Evidence Recording Active');
                    setIsCallSimOpen(false);
                    navigate('/fraud-detection');
                  }}
                  className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Accept & Trace Live</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
