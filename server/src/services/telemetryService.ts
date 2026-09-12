/**
 * Hardware-Independent Location & Telemetry Service Abstraction
 * Handles incoming location signals uniformly regardless of source device
 * (Expo Device GPS, Web Geolocation API, or programmable Hardware/IoT trackers).
 */

export interface LocationGeoJSON {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] for MongoDB 2dsphere indexing
}

export interface TelemetryIngestPayload {
  trackerId: string;
  sourceType: 'DEVICE_GPS' | 'HARDWARE_TRACKER' | 'SIMULATED';
  location: LocationGeoJSON;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export class TelemetryService {
  /**
   * Normalizes incoming location payloads into MongoDB geospatial 2dsphere ready objects.
   */
  public normalizePayload(
    trackerId: string,
    sourceType: 'DEVICE_GPS' | 'HARDWARE_TRACKER' | 'SIMULATED',
    latitude: number,
    longitude: number,
    speed?: number,
    heading?: number
  ): TelemetryIngestPayload {
    return {
      trackerId,
      sourceType,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      speed,
      heading,
      timestamp: new Date(),
    };
  }
}

export const telemetryService = new TelemetryService();
