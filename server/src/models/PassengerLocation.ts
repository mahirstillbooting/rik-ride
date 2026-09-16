import { Schema, model, Document, Types } from 'mongoose';
import { IGeoPoint } from './Vehicle';
import { LocationSharingStatus, LocationSource } from './DriverLocation';

export interface IPassengerLocation extends Document {
  passengerId: Types.ObjectId;
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

const PassengerLocationSchema = new Schema<IPassengerLocation>(
  {
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
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
PassengerLocationSchema.index({ location: '2dsphere' });

export const PassengerLocation = model<IPassengerLocation>('PassengerLocation', PassengerLocationSchema);
