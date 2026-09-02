import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { 
  InvestigationRepository, 
  EvidenceRepository, 
  ChainOfCustodyRepository 
} from '../models/investigation_repository.js';
import { MockAuthorizedProvider } from '../integrations/law-enforcement/MockAuthorizedProvider.js';

const provider = new MockAuthorizedProvider();

export const getCases = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const investigatorId = req.user?.id;
    if (!investigatorId) throw new Error("Unauthorized");
    
    // In a real system, you might filter by investigator ID unless they are admin
    const { cases, total } = await InvestigationRepository.getAllCases(50, 0);
    
    res.json({ success: true, cases, total });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getCaseDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const caseData = await InvestigationRepository.getCaseById(id);
    
    if (!caseData) {
      return res.status(404).json({ success: false, error: { message: "Case not found" } });
    }

    const evidence = await EvidenceRepository.getEvidenceByCase(id);
    const chainOfCustody = await ChainOfCustodyRepository.getEventsByCase(id);

    // Log investigator access
    await ChainOfCustodyRepository.logEvent({
      case_id: id,
      action: 'INVESTIGATOR_ACCESS',
      actor_id: req.user?.id || 'UNKNOWN',
      reason: 'View case details',
      ip_address: req.ip
    });

    res.json({
      success: true,
      case: caseData,
      evidence,
      chain_of_custody: chainOfCustody
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getAuthorizedLocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { case_id, phone_number, authorization_reference } = req.body;
    
    const location = await provider.getAuthorizedDeviceLocation(
      case_id, 
      authorization_reference, 
      req.user?.id || '', 
      phone_number
    );

    if (location) {
      // Create evidence
      await EvidenceRepository.addEvidence({
        case_id,
        source: location.provider,
        collector: req.user?.id || 'SYSTEM',
        authorization_reference,
        sha256_hash: 'HASH_PLACEHOLDER', // Would be actual hash in production
        mime_type: 'application/json',
        size_bytes: JSON.stringify(location).length,
        storage_reference: 'DB_STORE',
        chain_of_custody_id: `coc_${Date.now()}`,
        evidence_type: 'LOCATION'
      });
    }

    res.json({ success: true, location });
  } catch (error: any) {
    if (error.message.includes('UNAVAILABLE') || error.message.includes('REQUIRED') || error.message.includes('NOT AVAILABLE')) {
       return res.status(403).json({ success: false, error: { message: error.message } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getAuthorizedEvidence = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { case_id, evidence_type, authorization_reference } = req.body;
    
    const evidenceItem = await provider.getAuthorizedEvidence(
      case_id, 
      authorization_reference, 
      req.user?.id || '', 
      evidence_type
    );

    if (evidenceItem) {
      await EvidenceRepository.addEvidence({
        case_id,
        source: evidenceItem.source,
        collector: req.user?.id || 'SYSTEM',
        authorization_reference,
        sha256_hash: evidenceItem.integrity_hash,
        mime_type: evidenceItem.mime_type,
        size_bytes: evidenceItem.data_base64?.length || 0,
        storage_reference: evidenceItem.storage_url || 'INLINE',
        chain_of_custody_id: `coc_${Date.now()}`,
        evidence_type: evidence_type as any
      });
    }

    res.json({ success: true, evidence: evidenceItem });
  } catch (error: any) {
     if (error.message.includes('UNAVAILABLE') || error.message.includes('REQUIRED') || error.message.includes('NOT AVAILABLE')) {
       return res.status(403).json({ success: false, error: { message: error.message } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const generatePoliceReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const caseData = await InvestigationRepository.getCaseById(id);
    
    if (!caseData) {
      return res.status(404).json({ success: false, error: { message: "Case not found" } });
    }

    // Log the export action
    await ChainOfCustodyRepository.logEvent({
      case_id: id,
      action: 'EXPORT',
      actor_id: req.user?.id || 'UNKNOWN',
      reason: 'Generate PDF Report',
      ip_address: req.ip
    });

    // In a real system we would use jsPDF or Puppeteer here on the backend to generate the PDF Buffer.
    // For now we will return data indicating successful export, and let frontend generate the PDF 
    // or send a placeholder buffer.
    
    res.json({
      success: true,
      message: 'Report generation authorized and logged. PDF data attached.',
      // Provide JSON for client-side generation, or base64 PDF
      case: caseData
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const escalateToBank = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const caseData = await InvestigationRepository.getCaseById(id);
    
    if (!caseData) {
      return res.status(404).json({ success: false, error: { message: "Case not found" } });
    }

    // Mock API call to bank fraud desk webhook
    // In reality, this would use axios to hit a configured endpoint

    // Update status
    const updatedCase = await InvestigationRepository.updateCaseEscalation(id, 'Under Review');

    // Log the escalation action
    await ChainOfCustodyRepository.logEvent({
      case_id: id,
      action: 'STATUS_CHANGED',
      actor_id: req.user?.id || 'UNKNOWN',
      reason: 'Escalated to Bank for Account Freeze Review',
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Escalation request sent to financial institution successfully.',
      case: updatedCase
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const escalateToCybercrime = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const caseData = await InvestigationRepository.getCaseById(id);
    
    if (!caseData) {
      return res.status(404).json({ success: false, error: { message: "Case not found" } });
    }

    // Mock API call to Cybercrime Authority portal
    // In reality, this would integrate with IC3 or Action Fraud API
    const mockRef = `CYBER-${Math.floor(Math.random() * 1000000)}`;

    // Update status
    const updatedCase = await InvestigationRepository.updateCaseEscalation(id, 'Submitted to Authority', mockRef);

    // Log the escalation action
    await ChainOfCustodyRepository.logEvent({
      case_id: id,
      action: 'STATUS_CHANGED',
      actor_id: req.user?.id || 'UNKNOWN',
      reason: `Filed with Cybercrime Authority. Ref: ${mockRef}`,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: `Successfully filed with Cybercrime Authority. Reference: ${mockRef}`,
      case: updatedCase
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
