import { AuthStorage } from '../context/AuthStorage';
import { env } from '../config/env';

export interface SafetyEventData {
  _id: string;
  eventId: string;
  rideId?: any;
  passengerId?: any;
  driverId?: any;
  vehicleId?: any;
  severity: 'YELLOW' | 'RED';
  eventType: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  passengerLatitude?: number;
  passengerLongitude?: number;
  driverLatitude?: number;
  driverLongitude?: number;
  isEmergency: boolean;
  smsStatus: string;
  nearbyUsersCount: number;
  description?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  timestamp: string;
}

export interface SafetyResponse {
  success: boolean;
  message?: string;
  error?: string;
  event?: SafetyEventData;
  nearbyUsersCount?: number;
  totalActiveEvents?: number;
  redCount?: number;
  yellowCount?: number;
  events?: SafetyEventData[];
}

export class ClientSafetyService {
  private getBaseUrl(): string {
    return env.apiUrl || 'http://localhost:5000/api';
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AuthStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Passenger: Trigger Yellow Safety Alert
   */
  public async triggerYellowAlert(payload?: { rideId?: string; latitude?: number; longitude?: number; accuracy?: number }): Promise<SafetyResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/safety/yellow`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error triggering Yellow Safety Alert' };
    }
  }

  /**
   * Passenger: Trigger Red Emergency SOS
   */
  public async triggerRedSOS(payload?: { rideId?: string; latitude?: number; longitude?: number; accuracy?: number }): Promise<SafetyResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/safety/red`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error triggering Red Emergency SOS' };
    }
  }

  /**
   * Passenger: Unilateral Safety Override & Ride Termination
   */
  public async passengerOverrideTerminate(rideId?: string, reason?: string): Promise<SafetyResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/safety/override-terminate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rideId, reason }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error processing safety override' };
    }
  }

  /**
   * Admin: Get Active Safety Events
   */
  public async getActiveSafetyEvents(): Promise<SafetyResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/safety/active`, {
        method: 'GET',
        headers,
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching active safety events' };
    }
  }

  /**
   * Admin: Acknowledge Safety Event
   */
  public async acknowledgeSafetyEvent(eventId: string): Promise<SafetyResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/safety/${eventId}/acknowledge`, {
        method: 'POST',
        headers,
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error acknowledging safety event' };
    }
  }

  /**
   * Admin: Resolve Safety Event
   */
  public async resolveSafetyEvent(eventId: string, notes?: string): Promise<SafetyResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.getBaseUrl()}/safety/${eventId}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notes }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error resolving safety event' };
    }
  }
}

export const clientSafetyService = new ClientSafetyService();
