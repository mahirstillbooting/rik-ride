import { Schema, model, Document, Types } from 'mongoose';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IGarage extends Document {
  ownerId: Types.ObjectId;
  name: string;
  address: string;
  phone: string;
  verificationStatus: VerificationStatus;
  capacity?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const GarageSchema = new Schema<IGarage>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    capacity: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const Garage = model<IGarage>('Garage', GarageSchema);
