import { AuditRepository } from '../models/repository.js';

export class AuditService {
  static async log(params: {
    userId?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
  }): Promise<void> {
    try {
      await AuditRepository.log({
        user_id: params.userId,
        action: params.action,
        resource: params.resource,
        resource_id: params.resourceId,
        metadata_json: params.metadata,
        ip_address: params.ipAddress,
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }
}

export class EmailService {
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    console.log(`[EmailService] Verification token for ${email}: ${token}`);
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    console.log(`[EmailService] Password reset token for ${email}: ${token}`);
  }
}
