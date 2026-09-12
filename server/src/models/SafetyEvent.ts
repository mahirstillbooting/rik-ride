import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Vehicle';

export type SafetyEventType = 'SOS_ALERT' | 'ROUTE_DEVIATION' | 'UNUSUALLY_LONG_STOP' | 'SPEEDING';
export type SafetyEventStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_ALARM';

export interface ISafetyEvent extends Document {
  rideId?: Types.ObjectId;
  reportedBy: Types.ObjectId;
  eventType: SafetyEventType;
  status: SafetyEventStatus;
  location?: IGeoPoint;
  description?: string;
  timestamp: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SafetyEventSchema = new Schema<ISafetyEvent>(
  {
    rideId: { type: Schema.Types.ObjectId, ref: 'Ride', index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: {
      type: String,
      enum: ['SOS_ALERT', 'ROUTE_DEVIATION', 'UNUSUALLY_LONG_STOP', 'SPEEDING'],
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM'],
      default: 'OPEN',
      index: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    description: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const SafetyEvent = model<ISafetyEvent>('SafetyEvent', SafetyEventSchema);
