import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Vehicle';

export type RideStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface IRide extends Document {
  rideId: string;
  passengerId: Types.ObjectId;
  driverId?: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  garageId?: Types.ObjectId;
  status: RideStatus;
  pickupLocation: IGeoPoint;
  pickupAddress?: string;
  dropoffLocation: IGeoPoint;
  dropoffAddress?: string;
  currentLocation?: IGeoPoint;
  fareAmount?: number;
  currency: string;
  acceptedAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RideSchema = new Schema<IRide>(
  {
    rideId: { type: String, required: true, unique: true, index: true },
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', index: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'REQUESTED',
      index: true,
    },
    pickupLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    pickupAddress: { type: String },
    dropoffLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    dropoffAddress: { type: String },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    fareAmount: { type: Number },
    currency: { type: String, default: 'BDT' },
    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ passengerId: 1, status: 1 });

export const Ride = model<IRide>('Ride', RideSchema);
