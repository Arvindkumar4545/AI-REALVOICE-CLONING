import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { reportsApi } from '../services/api';
import {
  FileWarning,
  MapPin,
  Shield,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Send,
  Upload,
  Camera,
  FileCheck
} from 'lucide-react';

export const ReportScamPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [category, setCategory] = useState<string>('BANK_IMPERSONATION');
  const [description, setDescription] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [threatSeverity, setThreatSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [detectionRequestId, setDetectionRequestId] = useState<string>('');

  // Geolocation state
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evidence state
  const [evidenceFiles, setEvidenceFiles] = useState<{name: string, hash: string, timestamp: string}[]>([]);
  const [consentGiven, setConsentGiven] = useState(false);

  // Read requestId passed from DetectionPage
  useEffect(() => {
    if (location.state && (location.state as any).requestId) {
      setDetectionRequestId((location.state as any).requestId);
    }
  }, [location.state]);

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy);
        setLocationEnabled(true);
        setLocating(false);
      },
      (err) => {
        setLocError(err.message || 'Permission denied or unable to fetch coordinates.');
        setLocationEnabled(false);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Mock SHA-256 for the demo
      const mockHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setEvidenceFiles(prev => [...prev, {
        name: file.name,
        hash: mockHash,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        category,
        description,
        phone_number: phoneNumber || undefined,
        threat_severity: threatSeverity,
        detection_request_id: detectionRequestId || undefined,
      };

      if (locationEnabled && latitude !== null && longitude !== null) {
        payload.latitude = latitude;
        payload.longitude = longitude;
        payload.accuracy_meters = accuracy || undefined;
      }

      if (evidenceFiles.length > 0) {
        payload.evidence_files = evidenceFiles;
        payload.consent_given = consentGiven;
        payload.network_metadata = {
            carrier: 'Unknown ISP',
            sip_headers: 'SIP/2.0 200 OK',
            ip_address: '203.0.113.45'
        }; // Mock network attribution generated on report creation
      }

      await reportsApi.submitReport(payload);
      setSuccessMsg('Incident report successfully dispatched to Threat Intelligence registry.');
      setDescription('');
      setPhoneNumber('');
      setEvidenceFiles([]);
      setConsentGiven(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to submit report. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-10 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 cyber-grid-bg">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6 space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-xs font-mono text-[#EF4444] font-semibold">
          <FileWarning className="w-3.5 h-3.5 text-[#EF4444]" />
          <span>Threat Intelligence Intake</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          REPORT VOICE SCAM & IMPERSONATION
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Contribute verified deepfake audio incidents to the decentralized VoiceShield global defense registry.
        </p>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10B981] text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-200 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-600 font-semibold block">Scam Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#3B82F6] font-mono"
            >
              <option value="IRS_TAX">IRS / Tax Authority Threat</option>
              <option value="BANK_IMPERSONATION">Bank & Wire Authorization Scam</option>
              <option value="FAMILY_EMERGENCY">Family / Kidnapping Emergency Clone</option>
              <option value="CEO_FRAUD">CEO / Executive Impersonation</option>
              <option value="TECH_SUPPORT">Tech Support / Remote Access Scam</option>
              <option value="TELEMARKETING">Telemarketing / Voice Spam</option>
              <option value="OTHER">Other AI Synthetic Voice Attack</option>
            </select>
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-600 font-semibold block">Observed Severity</label>
            <select
              value={threatSeverity}
              onChange={(e) => setThreatSeverity(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#3B82F6] font-mono"
            >
              <option value="low">Low (Nuisance Robocall)</option>
              <option value="medium">Medium (Unverified Caller Attempt)</option>
              <option value="high">High (Targeted Voice Clone Attempt)</option>
              <option value="critical">Critical (Severe Financial Fraud In Progress)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Caller Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-600 font-semibold block">Originating Caller Number (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="+1 (555) 019-2834"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
              />
            </div>
          </div>

          {/* Linked Detection ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-600 font-semibold block">Associated Request ID (Optional)</label>
            <div className="relative">
              <Shield className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="req_1725120000000"
                value={detectionRequestId}
                onChange={(e) => setDetectionRequestId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Evidence Capture Panel */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Lock className="w-4 h-4 text-gray-900" />
            <span className="text-xs font-mono text-gray-900 font-bold">Consented Evidence Capture</span>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <label className="cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-800 rounded text-xs font-bold flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" /> Attach Screenshot
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
             </label>
             <label className="cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-800 rounded text-xs font-bold flex items-center gap-2 transition-colors">
                <Camera className="w-4 h-4" /> Take Photo
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
             </label>
          </div>

          {evidenceFiles.length > 0 && (
             <div className="space-y-2 mt-4">
               {evidenceFiles.map((ev, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex flex-col gap-1">
                     <div className="flex items-center gap-2">
                       <FileCheck className="w-4 h-4 text-green-600" />
                       <span className="text-xs font-bold text-gray-900">{ev.name}</span>
                     </div>
                     <div className="text-[10px] font-mono text-gray-500 truncate mt-1 bg-gray-900 text-gray-300 p-1.5 rounded">
                       SHA-256: {ev.hash}
                     </div>
                  </div>
               ))}
             </div>
          )}

          {evidenceFiles.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
               <label className="flex items-start gap-3 cursor-pointer">
                 <input 
                    type="checkbox" 
                    required
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-1 flex-shrink-0" 
                  />
                 <span className="text-[11px] text-gray-600 leading-relaxed font-mono">
                   <strong>Recording Consent & Authorization:</strong> I voluntarily submit this evidence from my own device. I confirm I have the legal right to share this recording/screenshot, and grant authorization per local wiretap and electronic communication laws to utilize this for fraud investigation.
                 </span>
               </label>
            </div>
          )}
        </div>

        {/* Incident Narrative */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-gray-600 font-semibold block">Incident Forensic Narrative</label>
          <textarea
            required
            rows={4}
            placeholder="Describe caller demands, vocal characteristics, spoofed identity, and any wire instructions provided..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] font-mono leading-relaxed"
          />
        </div>

        {/* Geolocation Telemetry */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-900" />
              <span className="text-xs font-mono text-gray-900 font-semibold">Incident Threat Geolocation</span>
            </div>
            <button
              type="button"
              onClick={requestGeolocation}
              disabled={locating}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 hover:border-blue-400 border border-gray-200 text-xs font-mono text-gray-900 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : 'Pin Current Coordinates'}</span>
            </button>
          </div>

          {locationEnabled && latitude && longitude ? (
            <div className="flex items-center gap-4 text-xs font-mono text-[#10B981]">
              <span>Lat: {latitude.toFixed(4)}�</span>
              <span>Long: {longitude.toFixed(4)}�</span>
              <span className="text-[#64748B]">Acc: �{accuracy ? Math.round(accuracy) : 10}m</span>
            </div>
          ) : (
            <p className="text-[11px] text-[#64748B] font-mono">
              Attaching GPS coordinates correlates threats with regional VoIP scam outbreaks on the global Threat Map.
            </p>
          )}

          {locError && <p className="text-[11px] text-[#EF4444] font-mono">{locError}</p>}
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#2563EB] text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all hover:scale-[1.01]"
        >
          {submitting ? (
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Dispatch Threat Report to SOC Registry</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
