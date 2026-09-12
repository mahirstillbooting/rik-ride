/**
 * Hardware-Independent Location & Telemetry Interface
 * Supports device GPS (Expo Location) and future IoT/hardware trackers.
 */

export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type TelemetrySourceType = 'DEVICE_GPS' | 'HARDWARE_TRACKER' | 'SIMULATED';

export interface TelemetryPayload {
  sourceId: string;
  sourceType: TelemetrySourceType;
  location: LocationPoint;
  batteryLevel?: number;
  metadata?: Record<string, unknown>;
}
