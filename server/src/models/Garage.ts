import { Schema, model, Document, Types } from 'mongoose';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface IGarage extends Document {
  garageId: string; // Structured human-readable ID (e.g. DH-GAR-0001)
  ownerId: Types.ObjectId;
  name: string;
  city: string;
  cityCode: string;
  area?: string;
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
    garageId: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
      sparse: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, default: 'Dhaka', trim: true, index: true },
    cityCode: { type: String, default: 'DH', uppercase: true, trim: true },
    area: { type: String, default: 'General', trim: true },
    address: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index: true,
    },
    capacity: { type: Number, default: 10 },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const Garage = model<IGarage>('Garage', GarageSchema);
