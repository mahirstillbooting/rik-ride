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
  routePoints?: Array<{
    coordinates: [number, number]; // [lng, lat]
    timestamp: string;
    accuracy?: number;
    speed?: number;
    heading?: number;
  }>;
  distanceMeters?: number;
  routePointCount?: number;
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

  // --- TRIP HISTORY & JOURNEY DETAIL ---

  public async getPassengerTripHistory(params: { page?: number; limit?: number; startDate?: string; endDate?: string } = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      const res = await fetch(`${env.apiUrl}/api/ride/passenger/history?${query.toString()}`, { headers });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch passenger trip history', trips: [] };
    }
  }

  public async getDriverTripHistory(params: { page?: number; limit?: number; startDate?: string; endDate?: string } = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      const res = await fetch(`${env.apiUrl}/api/ride/driver/history?${query.toString()}`, { headers });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch driver trip history', trips: [] };
    }
  }

  public async getGarageTripHistory(params: { vehicleId?: string; driverId?: string; startDate?: string; endDate?: string; page?: number; limit?: number } = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const query = new URLSearchParams();
      if (params.vehicleId) query.append('vehicleId', params.vehicleId);
      if (params.driverId) query.append('driverId', params.driverId);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      const res = await fetch(`${env.apiUrl}/api/ride/garage/history?${query.toString()}`, { headers });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch garage trip history', trips: [] };
    }
  }

  public async getAdminTripHistory(params: { search?: string; vehicleId?: string; driverId?: string; garageId?: string; status?: string; hasSafetyEvent?: string; startDate?: string; endDate?: string; page?: number; limit?: number } = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.vehicleId) query.append('vehicleId', params.vehicleId);
      if (params.driverId) query.append('driverId', params.driverId);
      if (params.garageId) query.append('garageId', params.garageId);
      if (params.status) query.append('status', params.status);
      if (params.hasSafetyEvent) query.append('hasSafetyEvent', params.hasSafetyEvent);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      const res = await fetch(`${env.apiUrl}/api/ride/admin/history?${query.toString()}`, { headers });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch admin trip history', trips: [] };
    }
  }

  public async getTripDetailById(rideId: string): Promise<{ success: boolean; trip?: DetailedTripRecord; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/ride/detail/${rideId}`, { headers });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch trip detail' };
    }
  }
}

export interface HistoricalTripSummary {
  id: string;
  rideId: string;
  status: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  passengerPseudonym?: string;
  passengerName?: string;
  passengerPhone?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleId?: string;
  shortVehicleNumber: string;
  registrationNumber: string;
  vehicleSystemId?: string;
  modelName?: string;
  garageName?: string;
  garageCustomId?: string;
  approximatePickupArea?: string;
  pickupLocation?: { type: string; coordinates: [number, number] };
  endCoordinates?: { type: string; coordinates: [number, number] };
  destinationText?: string;
  distanceMeters: number;
  durationSeconds: number;
  fareAmount?: number;
  currency?: string;
  paymentMethod?: string;
  passengerRating?: number;
  hasSafetyEvent?: boolean;
  safetyEventSummary?: any;
}

export interface DetailedTripRecord extends HistoricalTripSummary {
  driverMode?: string;
  ownershipType?: string;
  qrIdentifier?: string;
  garagePhone?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  routePoints?: Array<{
    coordinates: [number, number];
    timestamp: string;
    speed?: number;
    accuracy?: number;
    heading?: number;
  }>;
  routePointCount?: number;
  acceptedAt?: string;
  completionRequestedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  settlement?: {
    fareAmount: number;
    driverEarnings: number;
    platformCommission: number;
    status: string;
    settledAt?: string;
  } | null;
  ratingComment?: string;
  ratingTags?: string[];
  safetyEvent?: {
    eventId: string;
    severity: string;
    eventType: string;
    status: string;
    isEmergency?: boolean;
    description?: string;
    timestamp: string;
  } | null;
}

export const clientRideService = new ClientRideService();
