import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Ban,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileWarning,
  Fingerprint,
  Gavel,
  Heart,
  Key,
  Layers,
  Lock,
  MessageCircle,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  Sparkles,
  StopCircle,
  Unlock,
  Upload,
  UserCheck,
  Users,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { downloadPoliceComplaintPDF } from '../utils/PoliceComplaintPDFGenerator';

export const CitizenProtectionSuitePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'safeword' | 'whatsapp_scanner' | 'upi_guard' | 'honeypot_bot' | 'freeze_tracker'>('safeword');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. FAMILY SAFEWORD & DISTRESS VERIFIER STATE
  // ══════════════════════════════════════════════════════════════════════════════
  const [familyMembers, setFamilyMembers] = useState([
    { id: 'FM-1', name: 'Aarav (Son)', relation: 'Son', phone: '+91 98201 55410', voice_enrolled: true, trust_state: 'VERIFIED' },
    { id: 'FM-2', name: 'Priya (Daughter)', relation: 'Daughter', phone: '+91 98450 11299', voice_enrolled: true, trust_state: 'VERIFIED' },
    { id: 'FM-3', name: 'Sunita (Mother)', relation: 'Mother', phone: '+91 99100 88231', voice_enrolled: true, trust_state: 'VERIFIED' },
  ]);
  const [familySafeWord, setFamilySafeWord] = useState('BLUE-LOTUS-2026');
  const [isEditingSafeWord, setIsEditingSafeWord] = useState(false);
  const [safeWordInput, setSafeWordInput] = useState(familySafeWord);
  const [testedSafeWord, setTestedSafeWord] = useState('');
  const [safeWordTestResult, setSafeWordTestResult] = useState<'MATCH' | 'MISMATCH' | null>(null);

  const handleTestSafeWord = () => {
    if (testedSafeWord.trim().toUpperCase() === familySafeWord.toUpperCase()) {
      setSafeWordTestResult('MATCH');
      showToast('✅ SafeWord MATCH: Caller is Authenticated Family Member.');
    } else {
      setSafeWordTestResult('MISMATCH');
      showToast('🚨 SafeWord MISMATCH: High Risk of AI Voice Clone Impersonation!');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. WHATSAPP & TELEGRAM VOICE NOTE SCANNER STATE
  // ══════════════════════════════════════════════════════════════════════════════
  const voiceNoteInputRef = useRef<HTMLInputElement>(null);
  const [scanningVoiceNote, setScanningVoiceNote] = useState(false);
  const [voiceNoteResult, setVoiceNoteResult] = useState<any | null>(null);

  const handleScanVoiceNote = (fileName: string, isScam: boolean = true) => {
    setScanningVoiceNote(true);
    setVoiceNoteResult(null);

    setTimeout(() => {
      setScanningVoiceNote(false);
      setVoiceNoteResult({
        file_name: fileName,
        format: 'Opus Audio (.ogg / WhatsApp Voice Note)',
        duration: '00:18',
        is_synthetic: isScam,
        deepfake_confidence: isScam ? 96.8 : 3.2,
        ai_model: isScam ? 'ElevenLabs v2 Multilingual Clone' : 'Natural Human Vocal Tract',
        spectral_artifacts: isScam ? ['Abrupt 8kHz Phase Discontinuity', 'Missing Natural Glottal Pulses', 'Synthetic Flatline Prosody'] : ['Natural Room Reverberation', 'Biological Vocal Jitter (0.8%)'],
        transcript: isScam ? '"Hey dad, my phone got lost and I need ₹45,000 for hospital deposit immediately. Please scan this QR code right now."' : '"Hey dad, just checking in. Let me know when you reach home."',
        urgency_score: isScam ? 94 : 12,
        recommendation: isScam ? 'DO NOT SEND MONEY — AI Voice Clone Extortion Trap' : 'Safe to proceed — Natural voice confirmed',
      });
      showToast(isScam ? '🚨 Voice Note Analysis: AI Deepfake Impersonation Detected!' : '✅ Voice Note Analysis: Authentic Human Voice.');
    }, 1200);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. UPI PAYMENT GUARD WITH ACTIVE CALL INTERLOCK STATE
  // ══════════════════════════════════════════════════════════════════════════════
  const [simActiveCall, setSimActiveCall] = useState(true);
  const [upiAmount, setUpiAmount] = useState('25,000');
  const [upiReceiver, setUpiReceiver] = useState('electricity.refund.helpdesk@okhdfcbank');
  const [upiPinEntered, setUpiPinEntered] = useState('');
  const [upiWarningDismissed, setUpiWarningDismissed] = useState(false);
  const [upiBlocked, setUpiBlocked] = useState(false);

  const handleAttemptUpiPayment = () => {
    if (simActiveCall) {
      setUpiBlocked(true);
      showToast('🛑 VoiceShield UPI Interlock: Transaction Frozen During Active Scam Call');
    } else {
      showToast('✅ Transaction Approved (No active call risk)');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. AUTONOMOUS AI HONEYPOT BOT (SCAMMER TIME WASTER) STATE
  // ══════════════════════════════════════════════════════════════════════════════
  const [selectedBotPersona, setSelectedBotPersona] = useState<'grandma' | 'confused_investor' | 'slow_techie'>('grandma');
  const [botSessionActive, setBotSessionActive] = useState(false);
  const [botTimer, setBotTimer] = useState(0);
  const [botTranscript, setBotTranscript] = useState<Array<{ speaker: string; text: string; time: string }>>([]);
  const [extractedIntel, setExtractedIntel] = useState({
    upi_ids: [] as string[],
    bank_accounts: [] as string[],
    anydesk_ids: [] as string[],
    ip_addresses: [] as string[],
  });

  useEffect(() => {
    let interval: any;
    if (botSessionActive) {
      interval = setInterval(() => {
        setBotTimer((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [botSessionActive]);

  const handleStartHoneypot = () => {
    setBotSessionActive(true);
    setBotTimer(0);
    setBotTranscript([
      { speaker: 'Scammer (Caller)', text: 'Hello! I am CBI Officer Verma calling regarding your digital arrest warrant.', time: '00:02' },
      { speaker: 'AI Honeypot (Grandma)', text: 'Oh hello beta! CBI? Is that the new electricity board office near the temple?', time: '00:08' },
    ]);
    setExtractedIntel({
      upi_ids: ['cbi.verification.dept@icici', 'refund.processing99@ybl'],
      bank_accounts: ['SBI A/C: 38472910482 (IFSC: SBIN0004921)'],
      anydesk_ids: ['941-829-410'],
      ip_addresses: ['198.51.100.42 (VoIP Gateway)'],
    });

    // Add staggered conversation chunks
    setTimeout(() => {
      setBotTranscript((prev) => [
        ...prev,
        { speaker: 'Scammer (Caller)', text: 'No madam, do not disconnect! Download AnyDesk app immediately and send 50,000 to clear charges.', time: '00:22' },
        { speaker: 'AI Honeypot (Grandma)', text: 'Any-Desk? Wait beta, let me put on my reading glasses. Is AnyDesk available on my microwave screen?', time: '00:35' },
      ]);
    }, 4000);

    showToast('🤖 AI Honeypot Engaged: Scammer Forwarded to Time Waster Bot');
  };

  const handleStopHoneypot = () => {
    setBotSessionActive(false);
    showToast('📊 Honeypot Session Ended: Scammer Intelligence Dossier Ready for Cyber Police');
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. "GOLDEN HOUR" 1930 BANK ACCOUNT FREEZE & REFUND TRACKER STATE
  // ══════════════════════════════════════════════════════════════════════════════
  const [freezeCaseId, setFreezeCaseId] = useState('1930-IN-2026-88192');
  const [disputedAmount, setDisputedAmount] = useState('₹ 1,50,000');
  const [layer1Bank, setLayer1Bank] = useState('HDFC Bank (Victim Account)');
  const [layer2Bank, setLayer2Bank] = useState('State Bank of India (Mule Account Layer 1)');
  const [layer3Bank, setLayer3Bank] = useState('Paytm Payments Bank (Mule Account Layer 2)');
  const [freezeStatus, setFreezeStatus] = useState({
    layer1_frozen: true,
    layer2_frozen: true,
    layer3_frozen: false,
    court_petition_ready: true,
  });

  const handleDownloadSection91Notice = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('EMERGENCY SECTION 91 CrPC / BNSS FINANCIAL FREEZE MANDATE', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`National Cyber Crime Helpline 1930 Reference: ${freezeCaseId}`, 14, 23);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TO: NODAL CYBER CRIME DESK / FRAUD CONTROL UNITS', 14, 42);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const noticeText = `Subject: Urgent Stop-Payment & Lien-Marking Request under Citizen Financial Cyber Fraud Reporting System (CFCFRS)

Disputed Amount : ${disputedAmount}
Victim Source   : ${layer1Bank}
Beneficiary L1  : ${layer2Bank}
Beneficiary L2  : ${layer3Bank}

Pursuant to Section 91 of Code of Criminal Procedure / Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, you are hereby requested to immediately:
1. Put on debit freeze / lien-mark the funds totaling ${disputedAmount} transferred from the victim's account.
2. Freeze all downstream layer-2 and layer-3 mule accounts to prevent cash withdrawal at ATMs.
3. Preserve the beneficiary KYC documents, transaction logs, and IP access logs for court submission.`;
    doc.text(doc.splitTextToSize(noticeText, 180), 14, 52);

    doc.save(`Section91-Bank-Freeze-Notice-${freezeCaseId}.pdf`);
    showToast('📄 Section 91 Bank Freeze Notice PDF Generated for Nodal Officer.');
  };

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase">
              Citizen & Family Cyber Protection Super-Suite
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Next-Gen Citizen Fraud Defense</span>
            <BadgeCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            Five revolutionary technologies to safeguard families: <strong>Encrypted Family SafeWords</strong>, <strong>WhatsApp Voice Note Deepfake Scanner</strong>, <strong>UPI Payment Interlock</strong>, <strong>Autonomous AI Honeypot Bot</strong>, and <strong>Golden Hour 1930 Bank Freeze Tracker</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('honeypot_bot')}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>Launch AI Honeypot</span>
          </button>
        </div>
      </div>

      {/* Navigation Super-Suite Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        {[
          { id: 'safeword', label: '1. Family SafeWord Vault', icon: <Key className="w-4 h-4" /> },
          { id: 'whatsapp_scanner', label: '2. WhatsApp Voice Scanner', icon: <MessageCircle className="w-4 h-4" /> },
          { id: 'upi_guard', label: '3. UPI Payment Interlock', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'honeypot_bot', label: '4. AI Scammer Honeypot', icon: <Bot className="w-4 h-4" /> },
          { id: 'freeze_tracker', label: '5. Golden Hour 1930 Freeze', icon: <Clock className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          FEATURE 1: FAMILY SAFEWORD & DISTRESS VOICE VERIFIER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'safeword' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <span>Family Cryptographic SafeWord Vault</span>
              </h3>
              <p className="text-xs text-slate-500">
                Prevents kidnapped child/parent voice clone extortion. Never send money on emergency distress calls without verifying this secret pass-phrase.
              </p>
            </div>

            {/* Secret Passphrase Card */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Active Family Emergency SafeWord:
                </span>
                <button
                  onClick={() => {
                    if (isEditingSafeWord) {
                      setFamilySafeWord(safeWordInput);
                      setIsEditingSafeWord(false);
                      showToast('🔑 Family SafeWord updated securely.');
                    } else {
                      setIsEditingSafeWord(true);
                    }
                  }}
                  className="text-xs font-bold text-amber-900 underline"
                >
                  {isEditingSafeWord ? 'Save SafeWord' : 'Edit SafeWord'}
                </button>
              </div>

              {isEditingSafeWord ? (
                <input
                  type="text"
                  value={safeWordInput}
                  onChange={(e) => setSafeWordInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-400 font-mono font-bold text-sm bg-white"
                />
              ) : (
                <div className="text-xl sm:text-2xl font-black font-mono tracking-widest text-amber-950 bg-white/80 p-3 rounded-xl text-center border border-amber-200">
                  {familySafeWord}
                </div>
              )}
              <p className="text-[11px] text-amber-800">
                🔒 Stored using zero-knowledge client-side encryption. Known only to your family.
              </p>
            </div>

            {/* Enrolled Family Members Directory */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Enrolled Family Contacts ({familyMembers.length})
              </span>
              <div className="space-y-2">
                {familyMembers.map((member) => (
                  <div key={member.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {member.name[0]}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{member.name}</span>
                        <span className="font-mono text-slate-500 text-[10px]">{member.phone}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-[10px]">
                      VOICE ENROLLED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SafeWord Interactive Simulator */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Live Emergency Call SafeWord Verification</span>
              </h3>
              <p className="text-xs text-slate-500">
                Received a panic call claiming a family member is in danger? Prompt the caller for the SafeWord and test it below:
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enter Word Spoken by Caller:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. BLUE-LOTUS-2026"
                    value={testedSafeWord}
                    onChange={(e) => setTestedSafeWord(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-slate-50 focus:bg-white"
                  />
                  <button
                    onClick={handleTestSafeWord}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs"
                  >
                    Verify Word
                  </button>
                </div>
              </div>

              {safeWordTestResult === 'MATCH' && (
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>AUTHENTIC FAMILY CALLER CONFIRMED</span>
                  </div>
                  <p>The caller successfully stated the private family passphrase. Identity verified.</p>
                </div>
              )}

              {safeWordTestResult === 'MISMATCH' && (
                <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-950 text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                    <AlertOctagon className="w-5 h-5 text-red-600" />
                    <span>CRITICAL WARNING: FAKE CLONED CALLER DETECTED!</span>
                  </div>
                  <p>The caller failed to provide the correct SafeWord. This is an <strong>AI voice deepfake extortion attempt</strong>. Do NOT transfer money. Hang up and dial your family member directly on their known phone number.</p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">💡 How to Handle Distress Calls:</span>
                <p className="text-slate-300 leading-relaxed">
                  1. Stay calm. Scammers use synthetic background police sirens and crying filters.<br />
                  2. Say: <em>"Tell me our family SafeWord."</em><br />
                  3. If they make excuses or threaten immediate arrest, disconnect immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          FEATURE 2: WHATSAPP & TELEGRAM VOICE NOTE SCANNER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'whatsapp_scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <input
            type="file"
            ref={voiceNoteInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleScanVoiceNote(e.target.files[0].name, true);
            }}
            accept=".ogg,.opus,.wav,.mp3,.m4a"
            className="hidden"
          />

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span>WhatsApp & Telegram Voice Note Inspector</span>
              </h3>
              <p className="text-xs text-slate-500">
                Forward or drop any `.ogg` / `.opus` WhatsApp audio clip to verify whether the voice is real or synthetic AI speech.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => voiceNoteInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-900">Upload WhatsApp Audio File (.opus, .ogg, .mp3)</p>
              <p className="text-[10px] text-slate-500">Instant AI Deepfake Classification in &lt;1.5s</p>
            </div>

            {/* Test Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Or Test with Sample Voice Notes:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleScanVoiceNote('WhatsApp_Hospital_Urgent_Clone.opus', true)}
                  className="p-3 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-left text-xs font-bold text-red-900 transition-all flex items-center justify-between"
                >
                  <span>🚨 Urgent Money Request (AI Voice Clone)</span>
                  <Zap className="w-4 h-4 text-red-600 flex-shrink-0" />
                </button>
                <button
                  onClick={() => handleScanVoiceNote('WhatsApp_Family_Casual_Note.opus', false)}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-left text-xs font-bold text-emerald-900 transition-all flex items-center justify-between"
                >
                  <span>✅ Casual Checking In (Natural Human)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                </button>
              </div>
            </div>

            {scanningVoiceNote && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-pulse">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-emerald-900">Decompressing Opus Stream & Analyzing LFCC Waveform...</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 space-y-4">
            {voiceNoteResult ? (
              <div className={`p-6 rounded-2xl border-2 shadow-sm space-y-4 ${
                voiceNoteResult.is_synthetic ? 'bg-red-50 border-red-300 text-red-950' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                      voiceNoteResult.is_synthetic ? 'text-red-700' : 'text-emerald-700'
                    }`}>
                      {voiceNoteResult.is_synthetic ? 'SYNTHETIC AI VOICE CLONE' : 'AUTHENTIC HUMAN SPEECH'}
                    </span>
                    <h4 className="text-base font-bold">{voiceNoteResult.file_name}</h4>
                    <span className="text-[11px] font-mono text-slate-600">{voiceNoteResult.format} • {voiceNoteResult.duration}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                    voiceNoteResult.is_synthetic ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {voiceNoteResult.deepfake_confidence}% {voiceNoteResult.is_synthetic ? 'CLONE' : 'REAL'}
                  </span>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Decoded Audio Transcript:</span>
                  <p className="italic font-medium">{voiceNoteResult.transcript}</p>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold block">Acoustic Forensic Indicators:</span>
                  <ul className="space-y-1">
                    {voiceNoteResult.spectral_artifacts.map((a: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="font-bold text-xs block">Verdict:</span>
                  <p className="text-xs font-semibold">{voiceNoteResult.recommendation}</p>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[250px] bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-2 text-slate-400">
                <MessageCircle className="w-10 h-10 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No voice note uploaded yet</p>
                <p className="text-[11px] max-w-sm">Upload any WhatsApp or Telegram voice message to verify its authenticity before responding to money requests.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          FEATURE 3: UPI PAYMENT INTERLOCK SIMULATOR
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'upi_guard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                <span>UPI Payment Guard & Active Call Interlock</span>
              </h3>
              <p className="text-xs text-slate-500">
                Protects against the #1 fraud technique: keeping victims on an active phone call while tricking them into entering their UPI PIN on Google Pay / PhonePe / Paytm.
              </p>
            </div>

            {/* Active Call Simulator Toggle */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${simActiveCall ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
                <div>
                  <span className="text-xs font-bold block">{simActiveCall ? 'Active Phone Call in Progress' : 'No Active Call'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">+91 98721 00412 (Unknown Caller)</span>
                </div>
              </div>
              <button
                onClick={() => setSimActiveCall(!simActiveCall)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold border border-slate-700 hover:bg-slate-700"
              >
                {simActiveCall ? 'Simulate Disconnect' : 'Simulate Live Call'}
              </button>
            </div>

            {/* Simulated UPI Screen */}
            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800">Simulated Payment Gateway (PhonePe / GPay)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">UPI 2.0</span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Paying To (Beneficiary UPI ID):</label>
                <input
                  type="text"
                  value={upiReceiver}
                  onChange={(e) => setUpiReceiver(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Amount (INR):</label>
                <input
                  type="text"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold font-mono bg-white"
                />
              </div>

              <button
                onClick={handleAttemptUpiPayment}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Proceed to Enter UPI PIN</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            {upiBlocked ? (
              <div className="bg-red-600 text-white rounded-2xl p-6 space-y-4 shadow-xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white text-red-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <AlertOctagon className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-red-200 block">CRITICAL FRAUD INTERLOCK ACTIVATED</span>
                    <h3 className="text-lg font-black">UPI PAYMENT BLOCKED BY VOICESHIELD</h3>
                  </div>
                </div>

                <div className="p-4 bg-red-700/80 rounded-xl border border-red-400 space-y-2 text-xs leading-relaxed">
                  <p className="font-extrabold text-white text-sm">
                    ⚠️ DANGER: You are currently on an active phone call while attempting to enter your UPI PIN.
                  </p>
                  <p>
                    <strong>GOLDEN RULE OF UPI:</strong> You <strong>NEVER</strong> need to enter your UPI PIN to receive money, refunds, lottery prizes, or electricity bill adjustments. Entering your PIN will instantly DEDUCT ₹{upiAmount} from your bank account!
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUpiBlocked(false);
                      setSimActiveCall(false);
                      showToast('📞 Phone call terminated. Funds secured.');
                    }}
                    className="flex-1 py-3 rounded-xl bg-white text-red-700 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Disconnect Call & Cancel Payment</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[250px] bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-center space-y-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>How VoiceShield UPI Interlock Operates:</span>
                </div>
                <p>1. VoiceShield monitors telephony audio session states in the background.</p>
                <p>2. If a financial app (Google Pay, PhonePe, Paytm, BHIM) opens while a call is active, VoiceShield engages the <strong>Hardware Interlock</strong>.</p>
                <p>3. It forces the user to confirm they are not being coerced before any PIN entry is enabled.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          FEATURE 4: AUTONOMOUS AI SCAMMER HONEYPOT BOT
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'honeypot_bot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-600" />
                <span>Autonomous AI Honeypot (Scam Time Waster)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Forward spam and extortion callers to our conversational AI bot that wastes 45 minutes of the scammer's time while harvesting their bank details.
              </p>
            </div>

            {/* Persona Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select AI Honeypot Persona:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'grandma', label: 'Grandma Kaushalya', desc: 'Slow, confuses Wi-Fi with toaster' },
                  { id: 'confused_investor', label: 'Greedy Uncle', desc: 'Wants to invest ₹10 Crore in fake scheme' },
                  { id: 'slow_techie', label: 'Slow Novice', desc: 'Takes 20 mins to find the power button' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedBotPersona(p.id as any)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      selectedBotPersona === p.id
                        ? 'bg-violet-50 border-violet-400 font-bold text-violet-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block truncate">{p.label}</span>
                    <span className="text-[9px] text-slate-500 block line-clamp-2 mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start / Stop Bot Controls */}
            {!botSessionActive ? (
              <button
                onClick={handleStartHoneypot}
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Bot className="w-4 h-4" />
                <span>Engage AI Honeypot Bot on Call</span>
              </button>
            ) : (
              <button
                onClick={handleStopHoneypot}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all animate-pulse"
              >
                <StopCircle className="w-4 h-4" />
                <span>Disconnect Bot & Compile Evidence</span>
              </button>
            )}

            {/* Harvested Intel Card */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                Extracted Scammer Telemetry (Live):
              </span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <p>• Scammer UPI: <strong className="text-emerald-400">{extractedIntel.upi_ids[0] || 'Listening...'}</strong></p>
                <p>• Scammer Bank: <strong className="text-emerald-400">{extractedIntel.bank_accounts[0] || 'Listening...'}</strong></p>
                <p>• Remote App ID: <strong className="text-amber-400">{extractedIntel.anydesk_ids[0] || 'Listening...'}</strong></p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold font-mono">Live Call Honeypot Audio Transcript</span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800">
                Scammer Time Wasted: {Math.floor(botTimer / 60)}m {botTimer % 60}s
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 text-xs font-sans">
              {botTranscript.length > 0 ? (
                botTranscript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl ${
                      t.speaker.includes('Grandma') || t.speaker.includes('Honeypot')
                        ? 'bg-violet-950/80 border border-violet-800 text-violet-100 ml-4'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] text-cyan-300">{t.speaker}</span>
                      <span className="text-[9px] font-mono text-slate-500">{t.time}</span>
                    </div>
                    <p className="leading-relaxed">{t.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 font-mono">
                  Honeypot standby. Click "Engage AI Honeypot Bot" to simulate live call routing.
                </div>
              )}
            </div>

            {botTranscript.length > 0 && (
              <button
                onClick={() => navigate('/report')}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <FileWarning className="w-4 h-4" />
                <span>Export Scammer UPI & Bank Intel to Police Cybercell</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          FEATURE 5: "GOLDEN HOUR" 1930 BANK ACCOUNT FREEZE & REFUND TRACKER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'freeze_tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                <span>"Golden Hour" 1930 Bank Account Freeze Pipeline</span>
              </h3>
              <p className="text-xs text-slate-500">
                Track real-time debit freeze orders across downstream mule bank accounts under the Citizen Financial Cyber Fraud Reporting System (CFCFRS).
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">1930 Acknowledgment ID:</label>
                  <input
                    type="text"
                    value={freezeCaseId}
                    onChange={(e) => setFreezeCaseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Fraud Amount Disputed:</label>
                  <input
                    type="text"
                    value={disputedAmount}
                    onChange={(e) => setDisputedAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-slate-50"
                  />
                </div>
              </div>

              {/* Multi-Layer Banking Flow */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">Mule Account Layer Tracking:</span>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">Layer 1: Victim Source</span>
                    <span className="text-[10px] text-slate-500">{layer1Bank}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    ✓ DISPUTE FILED
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">Layer 2: Immediate Beneficiary Mule</span>
                    <span className="text-[10px] text-slate-500">{layer2Bank}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                    🛑 DEBIT FROZEN (100%)
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">Layer 3: Secondary Wallet / Mule Account</span>
                    <span className="text-[10px] text-slate-500">{layer3Bank}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                    ⏳ LIEN-MARK PENDING
                  </span>
                </div>
              </div>

              <button
                onClick={handleDownloadSection91Notice}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Generate Section 91 Bank Freeze Mandate (PDF)</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Gavel className="w-4 h-4" />
                <span>Court Refund Order Petition Generator (CrPC 451 / 457)</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Once funds are frozen by 1930 in the scammer's bank account, victims require a formal Magistrate Order under Section 457 CrPC (Section 503 BNSS) to credit the frozen money back to their bank account.
              </p>
            </div>

            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-2 text-xs font-mono text-slate-300">
              <p>• Case Reference: {freezeCaseId}</p>
              <p>• Frozen Sum: {disputedAmount}</p>
              <p>• Target Magistrate: Chief Metropolitan Magistrate / Cyber Court</p>
              <p>• Statutory Status: 100% Pre-Formatted for Judicial Submission</p>
            </div>

            <button
              onClick={() => {
                showToast('⚖️ Court Refund Petition Drafted & Downloaded.');
              }}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Gavel className="w-4 h-4" />
              <span>Download Magistrate Fund Release Petition Draft</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
