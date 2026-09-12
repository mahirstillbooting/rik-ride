import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Vehicle';

export type ShiftStatus = 'ACTIVE' | 'COMPLETED';

export interface IShiftSession extends Document {
  driverId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  garageId?: Types.ObjectId;
  status: ShiftStatus;
  startTime: Date;
  endTime?: Date;
  startLocation?: IGeoPoint;
  endLocation?: IGeoPoint;
  totalDistanceMeters?: number;
  totalRidesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSessionSchema = new Schema<IShiftSession>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
      index: true,
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    startLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    endLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    totalDistanceMeters: { type: Number, default: 0 },
    totalRidesCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

ShiftSessionSchema.index({ driverId: 1, status: 1 });

export const ShiftSession = model<IShiftSession>('ShiftSession', ShiftSessionSchema);
