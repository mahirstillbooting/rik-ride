import { Schema, model, Document, Types } from 'mongoose';

export type DriverOwnershipMode = 'GARAGE_REGISTERED' | 'SELF_OWNED';
export type VehicleStatus = 'AVAILABLE' | 'ON_RIDE' | 'OFFLINE';
export type VehicleVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IVehicle extends Document {
  registrationNumber: string;
  qrIdentifier: string; // Cryptographically signed token (HMAC), not raw _id
  ownershipType: DriverOwnershipMode;
  garageId?: Types.ObjectId;
  assignedDriverId?: Types.ObjectId;
  verificationStatus: VehicleVerificationStatus;
  status: VehicleStatus;
  location: IGeoPoint;
  modelName?: string;
  manufacturingYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    registrationNumber: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    qrIdentifier: { type: String, required: true, unique: true, index: true },
    ownershipType: {
      type: String,
      enum: ['GARAGE_REGISTERED', 'SELF_OWNED'],
      required: true,
      index: true,
    },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', index: true },
    assignedDriverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ON_RIDE', 'OFFLINE'],
      default: 'OFFLINE',
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [90.4125, 23.8103], // Default Dhaka coordinates [lng, lat]
      },
    },
    modelName: { type: String },
    manufacturingYear: { type: Number },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for nearby vehicle discovery
VehicleSchema.index({ location: '2dsphere' });

export const Vehicle = model<IVehicle>('Vehicle', VehicleSchema);
