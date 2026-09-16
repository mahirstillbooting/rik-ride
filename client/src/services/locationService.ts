import { env } from '../config/env';
import { AuthStorage } from '../context/AuthStorage';

export type SharingStatus = 'LOCATION_OFF' | 'LOCATION_ACTIVE' | 'LOCATION_ERROR' | 'LOCATION_STALE';

export interface LocationStatusResponse {
  success: boolean;
  eligible?: boolean;
  eligibilityReason?: string;
  sharingStatus?: SharingStatus;
  vehicleId?: string | null;
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    source?: string;
    timestamp: string;
  } | null;
  error?: string;
}

export interface LocationStartResponse {
  success: boolean;
  message?: string;
  sharingStatus?: SharingStatus;
  vehicle?: {
    id: string;
    vehicleId: string;
    shortVehicleNumber: string;
    registrationNumber: string;
    ownershipType: string;
  };
  error?: string;
}

class LocationApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }

  public async getStatus(): Promise<LocationStatusResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/location/status`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching location status' };
    }
  }

  public async startSharing(): Promise<LocationStartResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/location/start`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error starting location sharing' };
    }
  }

  public async updateLocation(payload: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: number | string;
    source?: 'DEVICE_GPS' | 'SIMULATED';
  }): Promise<{ success: boolean; message?: string; vehicleId?: string; timestamp?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/location/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error sending location update' };
    }
  }

  public async stopSharing(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/location/stop`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error stopping location sharing' };
    }
  }
}

export const locationApiService = new LocationApiService();
