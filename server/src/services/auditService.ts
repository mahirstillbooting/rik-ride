import { AuditRecord, IAuditRecord } from '../models/AuditRecord';
import { Types } from 'mongoose';

export interface AuditLogOptions {
  actorId?: string | Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async logAction(options: AuditLogOptions): Promise<IAuditRecord> {
    const record = new AuditRecord({
      actorId: options.actorId ? new Types.ObjectId(options.actorId.toString()) : undefined,
      action: options.action,
      entity: options.entity,
      entityId: options.entityId,
      ipAddress: options.ipAddress,
      metadata: options.metadata,
      timestamp: new Date(),
    });

    return await record.save();
  }

  async getRecentLogs(limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditRecord.find()
        .populate('actorId', 'name phone role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditRecord.countDocuments(),
    ]);

    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
}

export const auditService = new AuditService();