import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditRecord extends Document {
  actorId?: Types.ObjectId; // User or System actor
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const AuditRecordSchema = new Schema<IAuditRecord>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    ipAddress: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

export const AuditRecord = model<IAuditRecord>('AuditRecord', AuditRecordSchema);
