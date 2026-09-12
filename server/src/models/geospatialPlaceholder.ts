import { Schema } from 'mongoose';

/**
 * MongoDB Geospatial Schema Foundation (2dsphere Ready)
 * Schema structure prepared for high-performance spatial queries ($near, $geoWithin).
 * Collections will NOT be instantiated until application features are implemented.
 */

export interface ILocationDocument {
  trackerId: string;
  sourceType: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export const LocationSchemaDefinition = new Schema<ILocationDocument>({
  trackerId: { type: String, required: true, index: true },
  sourceType: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  speed: { type: Number },
  heading: { type: Number },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Index definition prepared for MongoDB geospatial queries
LocationSchemaDefinition.index({ location: '2dsphere' });
