import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Vehicle';

export type RideStatus =
  | 'INITIATED'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'WAITING_PASSENGER_CONFIRM'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'OTHER_MFS';

export interface IRide extends Document {
  rideId: string; // Short human-readable identifier e.g. RIDE-8042
  passengerId: Types.ObjectId;
  passengerPseudonym: string; // e.g. "Trip #09"
  driverId?: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  garageId?: Types.ObjectId;
  status: RideStatus;
  
  // Pickup telemetry
  pickupLocation: IGeoPoint; // [longitude, latitude] GeoJSON
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAccuracy?: number;
  approximatePickupArea: string; // Privacy protected area displayed to drivers before acceptance

  // Optional typed destination (NOT the official endCoordinates)
  destinationText?: string;

  // Official completion telemetry (Set only on passenger drop-off confirmation from real GPS)
  endCoordinates?: IGeoPoint; // [longitude, latitude] GeoJSON
  endLatitude?: number;
  endLongitude?: number;

  // Speed check for completion request
  lastValidatedSpeed?: number; // km/h

  // Extensible payment & rating fields
  fareAmount?: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  passengerRating?: number;

  // Timestamps
  requestedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completionRequestedAt?: Date;
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
    passengerPseudonym: { type: String, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', index: true },
    status: {
      type: String,
      enum: [
        'INITIATED',
        'ACCEPTED',
        'ACTIVE',
        'WAITING_PASSENGER_CONFIRM',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'INITIATED',
      index: true,
    },
    pickupLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    pickupLatitude: { type: Number, required: true },
    pickupLongitude: { type: Number, required: true },
    pickupAccuracy: { type: Number },
    approximatePickupArea: { type: String, required: true },

    destinationText: { type: String },

    endCoordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    endLatitude: { type: Number },
    endLongitude: { type: Number },

    lastValidatedSpeed: { type: Number },

    fareAmount: { type: Number },
    currency: { type: String, default: 'BDT' },
    paymentMethod: { type: String, enum: ['CASH', 'BKASH', 'NAGAD', 'OTHER_MFS'] },
    passengerRating: { type: Number, min: 1, max: 5 },

    requestedAt: { type: Date, default: Date.now, index: true },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    completionRequestedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

RideSchema.index({ pickupLocation: '2dsphere' });
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ passengerId: 1, status: 1 });
RideSchema.index({ requestedAt: -1 });

export const Ride = model<IRide>('Ride', RideSchema);
