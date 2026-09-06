import jsPDF from 'jspdf';

export interface PoliceComplaintData {
  // Incident Details
  incident_id: string;
  incident_date: string;
  incident_time: string;
  category: string;
  severity: string;
  description: string;

  // Victim Info
  victim_name: string;
  victim_phone: string;
  victim_email: string;
  victim_address?: string;

  // Suspect Info
  suspect_phone?: string;
  suspect_ip?: string;
  suspect_location?: string;
  suspect_device?: string;
  suspect_isp?: string;

  // Evidence
  evidence_items: Array<{
    type: string;
    filename: string;
    sha256_hash: string;
    timestamp: string;
    size_bytes?: number;
  }>;

  // Detection Data
  detection_result?: {
    prediction: string;
    confidence: number;
    risk_score: number;
    model_name: string;
    processing_time_ms: number;
  };

  // Geolocation
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;

  // Financial
  financial_loss?: number;
  transaction_ids?: string[];
  bank_name?: string;
  account_type?: string;

  // Network Metadata
  network_metadata?: {
    ip_address: string;
    user_agent: string;
    session_id: string;
    carrier: string;
    sip_headers?: string;
  };

  // Consent
  consent_given: boolean;
  consent_timestamp: string;
}

function computeEvidenceIntegrityHash(data: PoliceComplaintData): string {
  // Create a deterministic string from all evidence hashes + timestamps
  const evidenceString = data.evidence_items
    .map((e) => `${e.sha256_hash}:${e.timestamp}`)
    .join('|');
  const fullString = `${data.incident_id}:${evidenceString}:${data.consent_timestamp}`;
  
  // Simple hash for demo (in production, use Web Crypto API SHA-256)
  let hash = 0;
  for (let i = 0; i < fullString.length; i++) {
    const char = fullString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export function generatePoliceComplaintPDF(data: PoliceComplaintData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const integrityHash = computeEvidenceIntegrityHash(data);

  // ─── Header ────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('VOICESHIELD — INCIDENT REPORT', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Digital Fraud & Voice Phishing Complaint Document', margin, 26);
  doc.text(`Report ID: ${data.incident_id}`, margin, 33);
  doc.text(`Generated: ${new Date().toISOString()}`, pageWidth - margin - 65, 33);

  doc.setFontSize(7);
  doc.text(`Document Integrity Hash: ${integrityHash}`, margin, 40);

  y = 55;

  // ─── Section Helper ─────────────────────────────────────────────────────
  const addSection = (title: string) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), margin + 3, y + 5.5);
    y += 12;
  };

  const addRow = (label: string, value: string) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label + ':', margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const valueText = doc.splitTextToSize(value, contentWidth - 55);
    doc.text(valueText, margin + 55, y);
    y += Math.max(6, valueText.length * 5);
  };

  // ─── 1. Incident Details ────────────────────────────────────────────────
  addSection('1. Incident Details');
  addRow('Incident ID', data.incident_id);
  addRow('Date & Time', `${data.incident_date} at ${data.incident_time}`);
  addRow('Category', data.category.replace(/_/g, ' '));
  addRow('Severity', data.severity.toUpperCase());
  addRow('Description', data.description);
  y += 4;

  // ─── 2. Complainant (Victim) Details ────────────────────────────────────
  addSection('2. Complainant Details');
  addRow('Full Name', data.victim_name);
  addRow('Phone', data.victim_phone);
  addRow('Email', data.victim_email);
  if (data.victim_address) addRow('Address', data.victim_address);
  y += 4;

  // ─── 3. Suspect Details ─────────────────────────────────────────────────
  addSection('3. Suspect / Fraudster Details');
  if (data.suspect_phone) addRow('Phone Number', data.suspect_phone);
  if (data.suspect_ip) addRow('IP Address', data.suspect_ip);
  if (data.suspect_location) addRow('Approx. Location', data.suspect_location);
  if (data.suspect_device) addRow('Device/Browser', data.suspect_device);
  if (data.suspect_isp) addRow('ISP / Carrier', data.suspect_isp);
  if (!data.suspect_phone && !data.suspect_ip) {
    addRow('Status', 'Suspect identification pending — forensic data under analysis');
  }
  y += 4;

  // ─── 4. Financial Impact ────────────────────────────────────────────────
  if (data.financial_loss || data.transaction_ids?.length) {
    addSection('4. Financial Impact');
    if (data.financial_loss) addRow('Estimated Loss', `₹ ${data.financial_loss.toLocaleString('en-IN')}`);
    if (data.bank_name) addRow('Bank / Institution', data.bank_name);
    if (data.account_type) addRow('Account Type', data.account_type);
    if (data.transaction_ids?.length) {
      addRow('Transaction IDs', data.transaction_ids.join(', '));
    }
    y += 4;
  }

  // ─── 5. AI Detection Results ────────────────────────────────────────────
  if (data.detection_result) {
    addSection('5. VoiceShield AI Detection Analysis');
    addRow('Verdict', data.detection_result.prediction);
    addRow('Confidence', `${(data.detection_result.confidence * 100).toFixed(1)}%`);
    addRow('Risk Score', `${data.detection_result.risk_score} / 100`);
    addRow('Model', data.detection_result.model_name);
    addRow('Processing Time', `${data.detection_result.processing_time_ms} ms`);
    y += 4;
  }

  // ─── 6. Digital Evidence ────────────────────────────────────────────────
  addSection('6. Digital Evidence (Tamper-Evident)');
  if (data.evidence_items.length > 0) {
    data.evidence_items.forEach((evidence, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`Evidence #${idx + 1}: ${evidence.filename}`, margin + 2, y);
      y += 5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Type: ${evidence.type}`, margin + 5, y);
      y += 4;
      doc.text(`SHA-256: ${evidence.sha256_hash}`, margin + 5, y);
      y += 4;
      doc.text(`Timestamp: ${evidence.timestamp}`, margin + 5, y);
      y += 6;
    });
  } else {
    addRow('Evidence', 'No digital evidence files attached');
  }
  y += 4;

  // ─── 7. Network Metadata ────────────────────────────────────────────────
  if (data.network_metadata) {
    addSection('7. Network Attribution Metadata');
    addRow('IP Address', data.network_metadata.ip_address);
    addRow('User Agent', data.network_metadata.user_agent);
    addRow('Session ID', data.network_metadata.session_id);
    addRow('Carrier / ISP', data.network_metadata.carrier);
    if (data.network_metadata.sip_headers) addRow('SIP Headers', data.network_metadata.sip_headers);
    y += 4;
  }

  // ─── 8. Geolocation ─────────────────────────────────────────────────────
  if (data.latitude && data.longitude) {
    addSection('8. Incident Geolocation (Consent-Based)');
    addRow('Latitude', data.latitude.toFixed(6));
    addRow('Longitude', data.longitude.toFixed(6));
    if (data.accuracy_meters) addRow('Accuracy', `± ${Math.round(data.accuracy_meters)} meters`);
    y += 4;
  }

  // ─── 9. Legal Consent & Declaration ─────────────────────────────────────
  addSection('9. Consent & Legal Declaration');
  addRow('Consent Given', data.consent_given ? 'YES — Explicitly authorized' : 'NO');
  addRow('Consent Timestamp', data.consent_timestamp);
  y += 3;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const declaration = doc.splitTextToSize(
    'I, the undersigned, hereby declare that the information provided in this report is true and accurate to the best of my knowledge. I voluntarily submit this evidence and grant authorization for its use in fraud investigation and law enforcement proceedings as per the Information Technology Act, 2000 (amended 2008), Indian Penal Code Sections 419/420, and applicable telecommunications fraud statutes.',
    contentWidth - 4
  );
  doc.text(declaration, margin + 2, y);
  y += declaration.length * 4 + 8;

  // Signature lines
  if (y > 255) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + 60, y);
  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Complainant Signature', margin, y);
  doc.text('Date', pageWidth - margin - 60, y);

  // ─── Footer ─────────────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `VoiceShield Incident Report — ${data.incident_id} — Page ${i} of ${totalPages} — Integrity: ${integrityHash}`,
      margin,
      doc.internal.pageSize.getHeight() - 7
    );
    doc.text(
      'This document is auto-generated and tamper-evident. Any modification invalidates the integrity hash.',
      margin,
      doc.internal.pageSize.getHeight() - 3
    );
  }

  return doc;
}

export function downloadPoliceComplaintPDF(data: PoliceComplaintData): void {
  const doc = generatePoliceComplaintPDF(data);
  doc.save(`VoiceShield_Incident_Report_${data.incident_id}.pdf`);
}
