import { env } from '../config/env';
import { AuthStorage } from '../context/AuthStorage';
import { SharingStatus } from './locationService';

export interface PassengerLocationStatusResponse {
  success: boolean;
  eligible?: boolean;
  eligibilityReason?: string;
  sharingStatus?: SharingStatus;
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

export interface NearbyRickshaw {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleId: string;
  customVehicleId: string;
  shortVehicleNumber: string;
  registrationNumber: string;
  qrIdentifier: string;
  ownershipType: string;
  modelName: string;
  verificationStatus: string;
  status: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  distanceKm: number | null;
  avgRating: number | null;
  ratingsCount: number;
  completedRidesCount: number;
  updatedAt: string;
}

class PassengerLocationApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }

  public async getStatus(): Promise<PassengerLocationStatusResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/passenger/location/status`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching passenger location status' };
    }
  }

  public async getNearbyAvailableRickshaws(
    latitude?: number,
    longitude?: number,
    radiusKm: number = 2
  ): Promise<{
    success: boolean;
    count?: number;
    radiusKm?: number;
    rickshaws?: NearbyRickshaw[];
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (latitude !== undefined && !isNaN(latitude)) queryParams.append('latitude', latitude.toString());
      if (longitude !== undefined && !isNaN(longitude)) queryParams.append('longitude', longitude.toString());
      queryParams.append('radiusKm', radiusKm.toString());

      const res = await fetch(`${env.apiUrl}/api/passenger/location/nearby-rickshaws?${queryParams.toString()}`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching nearby rickshaws' };
    }
  }

  public async startSharing(): Promise<{ success: boolean; message?: string; sharingStatus?: SharingStatus; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/passenger/location/start`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error starting passenger location sharing' };
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
  }): Promise<{ success: boolean; message?: string; timestamp?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/passenger/location/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error sending passenger location update' };
    }
  }

  public async stopSharing(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/passenger/location/stop`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error stopping passenger location sharing' };
    }
  }
}

export const passengerLocationApiService = new PassengerLocationApiService();
