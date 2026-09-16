import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Vehicle';

export type LocationSharingStatus =
  | 'LOCATION_OFF'
  | 'LOCATION_ACTIVE'
  | 'LOCATION_ERROR'
  | 'LOCATION_STALE';

export type LocationSource = 'DEVICE_GPS' | 'TRACKER_GPS' | 'OTHER_SUPPORTED_SOURCE';

export interface IDriverLocation extends Document {
  driverId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  vehicleCustomId?: string;
  location: IGeoPoint; // [longitude, latitude] GeoJSON Point
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  source: LocationSource;
  status: LocationSharingStatus;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DriverLocationSchema = new Schema<IDriverLocation>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    vehicleCustomId: { type: String, index: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true, // [longitude, latitude]
      },
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    speed: { type: Number },
    heading: { type: Number },
    source: {
      type: String,
      enum: ['DEVICE_GPS', 'TRACKER_GPS', 'OTHER_SUPPORTED_SOURCE'],
      default: 'DEVICE_GPS',
    },
    status: {
      type: String,
      enum: ['LOCATION_OFF', 'LOCATION_ACTIVE', 'LOCATION_ERROR', 'LOCATION_STALE'],
      default: 'LOCATION_OFF',
      index: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

// Geospatial 2dsphere index for spatial queries
DriverLocationSchema.index({ location: '2dsphere' });
DriverLocationSchema.index({ vehicleId: 1, timestamp: -1 });

export const DriverLocation = model<IDriverLocation>('DriverLocation', DriverLocationSchema);
