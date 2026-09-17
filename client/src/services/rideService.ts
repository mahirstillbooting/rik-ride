import { env } from '../config/env';
import { AuthStorage } from '../context/AuthStorage';

export interface RideData {
  id: string;
  rideId: string;
  passengerPseudonym: string;
  approximatePickupArea?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupAccuracy?: number;
  status: 'INITIATED' | 'ACCEPTED' | 'ACTIVE' | 'WAITING_PASSENGER_CONFIRM' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED' | 'ORPHANED';
  startCoordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  endCoordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  destinationText?: string;
  requestedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  driverId?: {
    _id: string;
    name: string;
    phone: string;
  };
  passengerId?: {
    _id: string;
    name: string;
    phone: string;
  };
  vehicleId?: {
    _id: string;
    shortVehicleNumber: string;
    registrationNumber: string;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    status?: string;
    updatedAt?: string;
  } | null;
  passengerLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    status?: string;
    updatedAt?: string;
  } | null;
  lastValidatedSpeed?: number;
  acceptanceDeadline?: string;
  remainingSeconds?: number;
}

class ClientRideService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }

  // --- PASSENGER ---

  public async createRideRequest(payload: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    destinationText?: string;
    targetVehicleId?: string;
    targetDriverId?: string;
  }): Promise<{ success: boolean; message?: string; ride?: RideData; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error requesting ride' };
    }
  }

  public async getPassengerActiveRide(): Promise<{
    success: boolean;
    ride: RideData | null;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/passenger/active`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, ride: null, error: e.message || 'Network error fetching active ride' };
    }
  }

  public async cancelPassengerRide(rideId: string, reason?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/passenger/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rideId, reason }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error cancelling ride request' };
    }
  }

  public async confirmPassengerCompletion(rideId: string): Promise<{
    success: boolean;
    message?: string;
    ride?: RideData;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/passenger/confirm-completion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rideId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error confirming ride drop-off' };
    }
  }

  // --- DRIVER ---

  public async getDriverPendingRequests(): Promise<{
    success: boolean;
    rides?: RideData[];
    count?: number;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/driver/pending`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching pending rides' };
    }
  }

  public async declineDriverRide(rideId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/driver/decline`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rideId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error declining ride request' };
    }
  }

  public async acceptDriverRide(rideId: string): Promise<{
    success: boolean;
    message?: string;
    ride?: RideData;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/driver/accept`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rideId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error accepting ride' };
    }
  }

  public async startDriverRide(rideId: string): Promise<{
    success: boolean;
    message?: string;
    ride?: RideData;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/driver/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rideId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error starting trip' };
    }
  }

  public async requestDriverCompletion(rideId: string): Promise<{
    success: boolean;
    message?: string;
    speedKmh?: number;
    ride?: RideData;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/driver/request-completion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rideId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error requesting completion' };
    }
  }

  public async getDriverActiveRide(): Promise<{
    success: boolean;
    ride: RideData | null;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/driver/active`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, ride: null, error: e.message || 'Network error fetching driver active trip' };
    }
  }

  // --- ADMIN ---

  public async getAdminActiveRides(): Promise<{
    success: boolean;
    rides?: RideData[];
    activeCount?: number;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/admin/rides`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching admin active rides' };
    }
  }
}

export const clientRideService = new ClientRideService();
