import { AuditRecord } from '../models/AuditRecord';
import { Types } from 'mongoose';

/**
 * Security Audit Logger Service
 * Logs critical platform actions, security events, and entity changes for compliance.
 */
export class AuditService {
  public async logAction(
    action: string,
    entity: string,
    actorId?: string | Types.ObjectId,
    entityId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string
  ): Promise<void> {
    try {
      await AuditRecord.create({
        actorId: actorId ? new Types.ObjectId(actorId) : undefined,
        action,
        entity,
        entityId,
        metadata,
        ipAddress,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[AuditService] Failed to write audit record:', error);
    }
  }
}

export const auditService = new AuditService();
