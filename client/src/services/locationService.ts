import { TelemetryPayload, LocationPoint } from '../types/telemetry';

/**
 * Abstract Location Service Interface
 * Decouples location acquisition logic from UI components.
 * Will connect to Expo Location API for mobile/web devices,
 * or process incoming telemetry streams from external hardware.
 */
export interface ILocationService {
  getCurrentLocation(): Promise<LocationPoint>;
  startTracking(onUpdate: (payload: TelemetryPayload) => void): Promise<void>;
  stopTracking(): Promise<void>;
}

export class LocationService implements ILocationService {
  async getCurrentLocation(): Promise<LocationPoint> {
    return {
      latitude: 0,
      longitude: 0,
      timestamp: Date.now(),
    };
  }

  async startTracking(onUpdate: (payload: TelemetryPayload) => void): Promise<void> {
    // Tracking pipeline placeholder
  }

  async stopTracking(): Promise<void> {
    // Stop pipeline placeholder
  }
}
