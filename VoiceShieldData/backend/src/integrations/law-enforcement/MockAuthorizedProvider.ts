import { 
  AuthorizedInvestigationProvider, 
  AuthorizedLocation, 
  AuthorizedSubscriberInfo, 
  AuthorizedEvidence 
} from './AuthorizedInvestigationProvider.js';
import crypto from 'crypto';

export class MockAuthorizedProvider implements AuthorizedInvestigationProvider {
  getProviderName(): string {
    return 'MOCK_GOV_TELECOM_API (TEST DATA)';
  }

  async getAuthorizedDeviceLocation(
    caseId: string, 
    authorizationReference: string, 
    investigatorId: string, 
    phoneNumber: string
  ): Promise<AuthorizedLocation | null> {
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!authorizationReference || authorizationReference === 'INVALID') {
      throw new Error("LEGAL AUTHORIZATION REQUIRED");
    }
    
    if (authorizationReference === 'UNAVAILABLE') {
      throw new Error("AUTHORIZED DATA SOURCE UNAVAILABLE");
    }

    if (authorizationReference === 'NO_LOCATION') {
      return null;
    }

    return {
      latitude: 40.7128 + (Math.random() * 0.01 - 0.005),
      longitude: -74.0060 + (Math.random() * 0.01 - 0.005),
      accuracy: 50 + Math.random() * 100,
      timestamp: new Date(),
      provider: this.getProviderName(),
      authorization_reference: authorizationReference,
      confidence: 0.95
    };
  }

  async getAuthorizedSubscriberInformation(
    caseId: string,
    authorizationReference: string,
    investigatorId: string,
    phoneNumber: string
  ): Promise<AuthorizedSubscriberInfo | null> {
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    if (!authorizationReference || authorizationReference === 'INVALID') {
      throw new Error("LEGAL AUTHORIZATION REQUIRED");
    }

    return {
      name: "JOHN DOE (TEST DATA)",
      address: "123 MOCK STREET, TEST CITY (TEST DATA)",
      phone_number: phoneNumber,
      carrier: "TEST_TELECOM",
      status: "ACTIVE",
      authorization_reference: authorizationReference
    };
  }

  async getAuthorizedEvidence(
    caseId: string,
    authorizationReference: string,
    investigatorId: string,
    evidenceType: 'CAMERA' | 'MICROPHONE' | 'DEVICE_LOGS' | 'NETWORK_METADATA'
  ): Promise<AuthorizedEvidence | null> {
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (!authorizationReference || authorizationReference === 'INVALID') {
      throw new Error("LEGAL AUTHORIZATION REQUIRED");
    }
    
    if (authorizationReference === 'NO_EVIDENCE') {
      throw new Error("DEVICE EVIDENCE NOT AVAILABLE");
    }

    const mockData = `MOCK_EVIDENCE_DATA_FOR_${evidenceType}_CASE_${caseId}`;
    const hash = crypto.createHash('sha256').update(mockData).digest('hex');

    return {
      evidence_id: `evd_mock_${Date.now()}`,
      source: `MOCK_${evidenceType}_SOURCE`,
      provider: this.getProviderName(),
      authorization_reference: authorizationReference,
      case_id: caseId,
      timestamp: new Date(),
      integrity_hash: hash,
      data_base64: Buffer.from(mockData).toString('base64'),
      mime_type: 'application/octet-stream'
    };
  }
}
