import { Schema, model, Document } from 'mongoose';
import { IGeoPoint } from './Vehicle';

export type TelemetrySourceType = 'DEVICE_GPS' | 'HARDWARE_TRACKER' | 'SIMULATED';

export interface IGpsTelemetry extends Document {
  trackerId: string; // Driver ID or Vehicle ID
  sourceType: TelemetrySourceType;
  location: IGeoPoint;
  speed?: number;
  heading?: number;
  accuracy?: number;
  batteryLevel?: number;
  timestamp: Date;
}

const GpsTelemetrySchema = new Schema<IGpsTelemetry>(
  {
    trackerId: { type: String, required: true, index: true },
    sourceType: {
      type: String,
      enum: ['DEVICE_GPS', 'HARDWARE_TRACKER', 'SIMULATED'],
      required: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    speed: { type: Number },
    heading: { type: Number },
    accuracy: { type: Number },
    batteryLevel: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

// 2dsphere index for geospatial location querying & history
GpsTelemetrySchema.index({ location: '2dsphere' });
GpsTelemetrySchema.index({ trackerId: 1, timestamp: -1 });

export const GpsTelemetry = model<IGpsTelemetry>('GpsTelemetry', GpsTelemetrySchema);
