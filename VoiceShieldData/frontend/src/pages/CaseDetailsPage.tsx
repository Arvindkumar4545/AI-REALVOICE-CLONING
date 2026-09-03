import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { investigationApi } from '../services/api';
import { useAlert } from '../store/AlertContext';
import {
  ShieldAlert,
  ArrowLeft,
  MapPin,
  FileText,
  Clock,
  Download,
  AlertTriangle,
  Lock,
  Search,
  Database,
  Shield,
  Network,
  Banknote,
  Gavel,
  Briefcase,
  CheckCircle2
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export const CaseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [chainOfCustody, setChainOfCustody] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [authRef, setAuthRef] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestingLoc, setRequestingLoc] = useState(false);
  const [requestingEvd, setRequestingEvd] = useState(false);
  const [escalatingBank, setEscalatingBank] = useState(false);
  const [escalatingLe, setEscalatingLe] = useState(false);
  const [verifyingEvidenceId, setVerifyingEvidenceId] = useState<string | null>(null);

  const { addAlert } = useAlert();

  const fetchDetails = async () => {
    try {
      if (!id) return;
      const res = await investigationApi.getCaseDetails(id);
      if (res.success) {
        setCaseData(res.case);
        setEvidence(res.evidence);
        setChainOfCustody(res.chain_of_custody);
      }
    } catch (err: any) {
      addAlert({ type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'Failed to load case details' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRequestLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authRef) {
       return addAlert({ type: 'error', title: 'Error', message: 'Legal Authorization Reference is required.' });
    }
    setRequestingLoc(true);
    try {
      const res = await investigationApi.getAuthorizedLocation({
        case_id: id!,
        phone_number: phoneNumber,
        authorization_reference: authRef
      });
      if (res.success && res.location) {
        addAlert({ type: 'success', title: 'Success', message: 'Authorized suspect location retrieved successfully.' });
        fetchDetails(); // Refresh evidence/timeline
      } else {
        addAlert({ type: 'warning', title: 'Warning', message: 'Location retrieved, but no data available.' });
      }
    } catch (err: any) {
      addAlert({ type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'Failed to request location' });
    } finally {
      setRequestingLoc(false);
    }
  };

  const handleRequestEvidence = async (type: string) => {
     if (!authRef) {
       return addAlert({ type: 'error', title: 'Error', message: 'Legal Authorization Reference is required before requesting evidence.' });
    }
    setRequestingEvd(true);
    try {
      const res = await investigationApi.getAuthorizedEvidence({
        case_id: id!,
        evidence_type: type,
        authorization_reference: authRef
      });
      if (res.success && res.evidence) {
        addAlert({ type: 'success', title: 'Success', message: `Authorized ${type} evidence retrieved successfully.` });
        fetchDetails();
      }
    } catch (err: any) {
      addAlert({ type: 'error', title: 'Error', message: err.response?.data?.error?.message || `Failed to request ${type}` });
    } finally {
      setRequestingEvd(false);
    }
  };

  const generatePDF = async () => {
    if (!caseData) return;
    try {
       // Log to backend
       await investigationApi.generatePoliceReport(id!);
       
       // Generate PDF on client
       const doc = new jsPDF();
       
       doc.setFontSize(22);
       doc.setTextColor(200, 0, 0);
       doc.text("OFFICIAL INVESTIGATION REPORT", 20, 20);
       
       doc.setFontSize(12);
       doc.setTextColor(0, 0, 0);
       doc.text(`Case ID: ${caseData.case_id}`, 20, 35);
       doc.text(`Status: ${caseData.status}`, 20, 42);
       doc.text(`Timestamp: ${new Date(caseData.timestamp).toLocaleString()}`, 20, 49);
       doc.text(`Risk Score: ${caseData.risk_score}/100`, 20, 56);
       
       doc.setFontSize(16);
       doc.text("Evidence Log", 20, 70);
       
       let yPos = 80;
       doc.setFontSize(10);
       evidence.forEach((ev, i) => {
          if (yPos > 270) {
              doc.addPage();
              yPos = 20;
          }
          doc.text(`${i+1}. ${ev.evidence_type} - [${ev.source}]`, 20, yPos);
          doc.text(`   Hash: ${ev.sha256_hash}`, 20, yPos + 5);
          doc.text(`   Auth Ref: ${ev.authorization_reference || 'N/A'}`, 20, yPos + 10);
          yPos += 20;
       });

       doc.save(`Police_Report_Case_${caseData.case_id}.pdf`);
       addAlert({ type: 'success', title: 'Success', message: 'Official report generated and downloaded.' });
       fetchDetails(); // Refresh to show EXPORT event in timeline
    } catch (err: any) {
       addAlert({ type: 'error', title: 'Error', message: 'Failed to generate report.' });
    }
  };

  const handleEscalateBank = async () => {
    if (!caseData) return;
    setEscalatingBank(true);
    try {
      const res = await investigationApi.escalateToBank(caseData.case_id);
      if (res.success) {
        addAlert({ type: 'success', title: 'Escalated', message: res.message });
        fetchDetails();
      }
    } catch (err: any) {
      addAlert({ type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'Failed to escalate to bank' });
    } finally {
      setEscalatingBank(false);
    }
  };

  const handleVerifyEvidence = async (ev: any) => {
    setVerifyingEvidenceId(ev.evidence_id);
    try {
      const res = await investigationApi.verifyEvidence(id!, ev.evidence_id, ev.sha256_hash);
      if (res.success && res.verified) {
        addAlert({ type: 'success', title: 'Cryptographic Match', message: 'SHA-256 fingerprint verified against vault master register.' });
        fetchDetails();
      } else {
        addAlert({ type: 'error', title: 'Tamper Alert', message: 'Cryptographic hash mismatch detected!' });
      }
    } catch (err: any) {
      addAlert({ type: 'error', title: 'Error', message: 'Verification query failed' });
    } finally {
      setVerifyingEvidenceId(null);
    }
  };

  const handleEscalateCybercrime = async () => {
    if (!caseData) return;
    setEscalatingLe(true);
    try {
      const res = await investigationApi.escalateToCybercrime(caseData.case_id);
      if (res.success) {
        addAlert({ type: 'success', title: 'Filed with Authority', message: res.message });
        fetchDetails();
      }
    } catch (err: any) {
      addAlert({ type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'Failed to file with cybercrime.' });
    } finally {
      setEscalatingLe(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-sm font-mono">Loading Case Data...</div>;
  }

  if (!caseData) {
    return <div className="p-20 text-center font-bold text-red-600">Case not found.</div>;
  }

  return (
    <div className="min-h-screen pt-10 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <Link to="/investigation" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-4 font-semibold">
             <ArrowLeft className="w-3.5 h-3.5" /> Back to Investigation Center
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300 text-[11px] font-mono text-red-700 font-semibold shadow-sm mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>CASE: {caseData.case_id}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            CASE DOSSIER
          </h1>
        </div>
        
        <button
          onClick={generatePDF}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded shadow-sm flex items-center gap-2 transition-colors"
        >
          <FileText className="w-4 h-4" /> Generate Police Report PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Left Column: Case Details & Data Request */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Case Details */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 font-mono mb-4 border-b pb-2">Analysis Results</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Risk Score</div>
                      <div className="text-2xl font-black text-red-600 mt-1">{caseData.risk_score}/100</div>
                   </div>
                   <div className="p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">AI Probability</div>
                      <div className="text-2xl font-black text-orange-600 mt-1">{Math.round(caseData.voice_ai_probability)}%</div>
                   </div>
                </div>
                <div className="mt-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Fraud Indicators</div>
                    <div className="flex flex-wrap gap-2">
                      {caseData.fraud_indicators?.map((ind: string) => (
                        <span key={ind} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold border border-red-200">
                           {ind.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                </div>
            </div>

            {/* Request Authorized Data */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 font-mono mb-4 border-b pb-2 flex items-center gap-2">
                   <Database className="w-4 h-4 text-blue-600" /> Request Authorized Data
                </h3>
                
                <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6 text-xs text-blue-800">
                   <strong>IMPORTANT:</strong> Requests for authorized location or evidence MUST be accompanied by a valid legal authorization reference (e.g. Warrant ID, Court Order #, Subpoena). All requests are logged in the immutable chain of custody.
                </div>

                <form onSubmit={handleRequestLocation} className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Authorization Reference *</label>
                      <input 
                         type="text" 
                         required
                         value={authRef}
                         onChange={(e) => setAuthRef(e.target.value)}
                         placeholder="e.g. WARRANT-2026-991A" 
                         className="w-full text-sm border-gray-300 rounded px-3 py-2 bg-gray-50" 
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Try 'INVALID' or 'UNAVAILABLE' to test failure states.</p>
                   </div>
                   
                   <div className="pt-4 border-t border-gray-100">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Target Phone Number</label>
                      <input 
                         type="text" 
                         value={phoneNumber}
                         onChange={(e) => setPhoneNumber(e.target.value)}
                         placeholder="+1 (555) 000-0000" 
                         className="w-full text-sm border-gray-300 rounded px-3 py-2 bg-gray-50 mb-3" 
                      />
                      <button 
                         type="submit" 
                         disabled={requestingLoc}
                         className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                         <MapPin className="w-3.5 h-3.5" /> 
                         {requestingLoc ? 'Requesting...' : 'Request Authorized Suspect Location'}
                      </button>
                   </div>
                </form>

                <div className="pt-4 border-t border-gray-100 mt-6">
                    <label className="block text-xs font-bold text-gray-700 mb-3">Request Authorized Device Evidence</label>
                    <div className="flex gap-3">
                       <button 
                         type="button" 
                         onClick={() => handleRequestEvidence('DEVICE_LOGS')}
                         disabled={requestingEvd}
                         className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
                       >
                         <Download className="w-3 h-3" /> Device Logs
                       </button>
                       <button 
                         type="button" 
                         onClick={() => handleRequestEvidence('NETWORK_METADATA')}
                         disabled={requestingEvd}
                         className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
                       >
                         <Search className="w-3 h-3" /> Network Metadata
                       </button>
                    </div>
                </div>
            </div>

            {/* Network Attribution Card */}
            {caseData.network_metadata && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 font-mono mb-4 border-b pb-2 flex items-center gap-2">
                       <Network className="w-4 h-4 text-purple-600" /> Network Attribution
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded">
                            <span className="text-gray-500 font-bold block mb-1">Carrier ISP / Trunk</span>
                            <span className="font-mono text-gray-900">{caseData.network_metadata.carrier || 'Unknown'}</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded">
                            <span className="text-gray-500 font-bold block mb-1">IP Address / ASN</span>
                            <span className="font-mono text-gray-900">{caseData.network_metadata.ip_address || 'N/A'}</span>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded">
                        <span className="text-gray-500 font-bold block mb-1">SIP Headers (Intercepted)</span>
                        <div className="font-mono text-[10px] text-gray-800 break-all bg-gray-200 p-2 rounded">
                            {caseData.network_metadata.sip_headers || 'No SIP metadata captured.'}
                        </div>
                    </div>
                </div>
            )}

            {/* Case Packaging & Escalation */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 font-mono mb-4 border-b pb-2 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" /> Case Packaging & Escalation
                   </div>
                   <span className="px-2 py-1 bg-gray-100 text-gray-800 border border-gray-200 rounded text-[10px] font-bold">
                       Status: {caseData.escalation_status || 'Draft'}
                   </span>
                </h3>
                
                <p className="text-xs text-gray-600 mb-4">
                  Compile evidence and request external institutional action. <strong className="text-red-600">Note:</strong> VoiceShield AI does not unilaterally freeze accounts; final action rests with the financial institution.
                </p>

                <div className="flex flex-col gap-3">
                   <button 
                     onClick={generatePDF}
                     className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
                   >
                     <FileText className="w-4 h-4" /> Generate Incident Packet (PDF/JSON Bundle)
                   </button>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                       <button 
                         onClick={handleEscalateBank}
                         disabled={escalatingBank}
                         className="px-4 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                       >
                         <Banknote className="w-4 h-4" /> 
                         {escalatingBank ? 'Requesting...' : 'Request Account Freeze Review'}
                       </button>

                       <button 
                         onClick={handleEscalateCybercrime}
                         disabled={escalatingLe}
                         className="px-4 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                       >
                         <Gavel className="w-4 h-4" /> 
                         {escalatingLe ? 'Filing...' : 'File with Cybercrime Authority'}
                       </button>
                   </div>
                </div>

                {caseData.law_enforcement_ref && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800 font-mono flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                       <span>Filed successfully. External Reference: <strong>{caseData.law_enforcement_ref}</strong></span>
                    </div>
                )}
            </div>

            {/* Evidence List */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 font-mono mb-4 border-b pb-2 flex items-center gap-2">
                   <Shield className="w-4 h-4 text-green-600" /> Cryptographic Evidence Log
                </h3>
                
                {evidence.length > 0 ? (
                   <div className="space-y-4">
                      {evidence.map(ev => (
                         <div key={ev.evidence_id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex flex-col gap-2">
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-900 uppercase bg-gray-200 px-2 py-0.5 rounded">{ev.evidence_type}</span>
                                <span className="text-[10px] font-mono text-gray-500">{new Date(ev.timestamp).toLocaleString()}</span>
                             </div>
                             
                             <div className="text-xs text-gray-700">
                                <span className="font-semibold">Source:</span> {ev.source}
                                {ev.evidence_type === 'LOCATION' && <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-1 py-0.5 rounded font-bold border border-red-200">AUTHORIZED SUSPECT LOCATION</span>}
                                {ev.evidence_type === 'ML_ANALYSIS' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold border border-blue-200">REPORTING DEVICE</span>}
                             </div>
                             
                             {ev.authorization_reference && (
                                <div className="text-[11px] text-gray-600 font-mono bg-yellow-50 p-1.5 rounded border border-yellow-200">
                                   Auth Ref: {ev.authorization_reference}
                                </div>
                             )}

                             <div className="mt-2 text-[10px] font-mono text-gray-500 bg-gray-900 text-gray-300 p-2 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                                SHA256: {ev.sha256_hash}
                             </div>

                             <div className="flex justify-end pt-1">
                               <button
                                 onClick={() => handleVerifyEvidence(ev)}
                                 disabled={verifyingEvidenceId === ev.evidence_id}
                                 className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 border border-gray-300 text-[11px] font-mono font-bold text-gray-700 flex items-center gap-1 transition-colors"
                               >
                                 <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                 {verifyingEvidenceId === ev.evidence_id ? 'Verifying...' : 'Verify Cryptographic Integrity'}
                               </button>
                             </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="text-xs text-gray-500 text-center py-4">No evidence collected yet.</div>
                )}
            </div>
         </div>

         {/* Right Column: Chain of Custody Timeline */}
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
             <h3 className="text-sm font-bold text-gray-900 font-mono mb-6 border-b pb-2 flex items-center gap-2">
               <Clock className="w-4 h-4 text-purple-600" /> Immutable Timeline
             </h3>

             <div className="relative border-l border-gray-300 ml-3 space-y-6">
                {chainOfCustody.map((event, i) => (
                   <div key={event.id} className="relative pl-6">
                      <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                         event.action === 'EVIDENCE_CREATED' ? 'bg-green-500' :
                         event.action === 'EXPORT' ? 'bg-blue-500' :
                         'bg-gray-400'
                      }`} />
                      
                      <div className="text-[10px] font-mono text-gray-500 mb-0.5">
                         {new Date(event.timestamp).toLocaleString()}
                      </div>
                      
                      <div className="text-xs font-bold text-gray-900">
                         {event.action.replace(/_/g, ' ')}
                      </div>
                      
                      <div className="text-[11px] text-gray-600 mt-1">
                         {event.reason}
                      </div>
                      
                      <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                         <span>By: {event.actor_id.substring(0, 8)}...</span>
                         {event.ip_address && <span>IP: {event.ip_address}</span>}
                      </div>
                   </div>
                ))}
             </div>
             
             <div className="mt-8 pt-4 border-t border-gray-100 flex items-start gap-2 text-[10px] text-gray-500">
                <Lock className="w-3 h-3 flex-shrink-0" />
                <p>This timeline is an immutable chain of custody record. All accesses and exports are cryptographically logged.</p>
             </div>
         </div>
      </div>
    </div>
  );
};
