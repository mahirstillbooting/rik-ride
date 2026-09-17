import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Vehicle';

export type SafetySeverity = 'YELLOW' | 'RED';
export type SafetyEventType = 'SAFETY_ALERT' | 'SOS_ALERT' | 'PASSENGER_ABORT' | 'ROUTE_DEVIATION' | 'UNUSUALLY_LONG_STOP' | 'SPEEDING';
export type SafetyEventStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'OPEN' | 'FALSE_ALARM';
export type SmsStatus = 'MOCK_SENT' | 'SENT' | 'FAILED' | 'NOT_CONFIGURED';

export interface ISafetyEvent extends Document {
  eventId: string; // e.g. SAFE-8910
  rideId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  passengerId: Types.ObjectId;
  driverId?: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  garageId?: Types.ObjectId;
  severity: SafetySeverity;
  eventType: SafetyEventType;
  status: SafetyEventStatus;
  
  passengerLocation?: IGeoPoint;
  passengerLatitude?: number;
  passengerLongitude?: number;
  
  driverLocation?: IGeoPoint;
  driverLatitude?: number;
  driverLongitude?: number;
  
  isEmergency: boolean;
  smsStatus: SmsStatus;
  nearbyUsersCount: number;
  description?: string;
  
  acknowledgedAt?: Date;
  acknowledgedBy?: Types.ObjectId;
  
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolutionNotes?: string;
  
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SafetyEventSchema = new Schema<ISafetyEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    rideId: { type: Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    garageId: { type: Schema.Types.ObjectId, ref: 'Garage', index: true },
    severity: {
      type: String,
      enum: ['YELLOW', 'RED'],
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['SAFETY_ALERT', 'SOS_ALERT', 'PASSENGER_ABORT', 'ROUTE_DEVIATION', 'UNUSUALLY_LONG_STOP', 'SPEEDING'],
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'OPEN', 'FALSE_ALARM'],
      default: 'ACTIVE',
      index: true,
    },
    passengerLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    passengerLatitude: { type: Number },
    passengerLongitude: { type: Number },
    driverLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    driverLatitude: { type: Number },
    driverLongitude: { type: Number },
    isEmergency: { type: Boolean, default: false },
    smsStatus: {
      type: String,
      enum: ['MOCK_SENT', 'SENT', 'FAILED', 'NOT_CONFIGURED'],
      default: 'NOT_CONFIGURED',
    },
    nearbyUsersCount: { type: Number, default: 0 },
    description: { type: String },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

SafetyEventSchema.index({ passengerLocation: '2dsphere' });
SafetyEventSchema.index({ severity: 1, status: 1 });
SafetyEventSchema.index({ timestamp: -1 });

export const SafetyEvent = model<ISafetyEvent>('SafetyEvent', SafetyEventSchema);
