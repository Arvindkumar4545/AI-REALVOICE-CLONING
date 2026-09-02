export interface AuthorizedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  provider: string;
  authorization_reference: string;
  confidence: number;
}

export interface AuthorizedSubscriberInfo {
  name: string;
  address: string;
  phone_number: string;
  carrier: string;
  status: string;
  authorization_reference: string;
}

export interface AuthorizedEvidence {
  evidence_id: string;
  source: string;
  provider: string;
  authorization_reference: string;
  case_id: string;
  timestamp: Date;
  integrity_hash: string;
  data_base64?: string;
  storage_url?: string;
  mime_type: string;
}

export interface AuthorizedInvestigationProvider {
  /**
   * Identifies the specific law enforcement or telecom provider
   */
  getProviderName(): string;

  /**
   * Request authorized device location (e.g. from telecom towers)
   */
  getAuthorizedDeviceLocation(
    caseId: string, 
    authorizationReference: string, 
    investigatorId: string, 
    phoneNumber: string
  ): Promise<AuthorizedLocation | null>;

  /**
   * Request authorized subscriber information
   */
  getAuthorizedSubscriberInformation(
    caseId: string,
    authorizationReference: string,
    investigatorId: string,
    phoneNumber: string
  ): Promise<AuthorizedSubscriberInfo | null>;

  /**
   * Request authorized device evidence (e.g., from an authorized system)
   */
  getAuthorizedEvidence(
    caseId: string,
    authorizationReference: string,
    investigatorId: string,
    evidenceType: 'CAMERA' | 'MICROPHONE' | 'DEVICE_LOGS' | 'NETWORK_METADATA'
  ): Promise<AuthorizedEvidence | null>;
}
