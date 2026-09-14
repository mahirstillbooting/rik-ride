import { env } from '../config/env';
import { AuthStorage } from '../context/AuthStorage';

export interface DriverProfileData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  driverMode: 'GARAGE_REGISTERED' | 'SELF_OWNED';
  accountStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'DISABLED';
  createdAt: string;
}

export interface DriverGarageRelation {
  relationId: string;
  garageId: string | null;
  garageName: string;
  garagePhone: string;
  garageAddress: string;
  garageVerificationStatus: string;
  garageConfirmationStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  assignedAt?: string;
}

export interface DriverVehicleData {
  id: string;
  shortVehicleNumber: string;
  registrationNumber: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  status: 'AVAILABLE' | 'ON_RIDE' | 'OFFLINE';
  modelName?: string;
  manufacturingYear?: number;
  ownershipType: 'GARAGE_REGISTERED' | 'SELF_OWNED';
  qrIdentifier: string;
  garageName?: string;
}

export interface DriverHistoryRecord {
  _id: string;
  vehicleId: {
    _id: string;
    shortVehicleNumber: string;
    registrationNumber: string;
    ownershipType: string;
    modelName?: string;
  };
  assignedAt: string;
  unassignedAt?: string;
  isCurrent: boolean;
}

class DriverService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }

  public async getDriverProfile(): Promise<{
    success: boolean;
    driver?: DriverProfileData;
    garageRelation?: DriverGarageRelation | null;
    vehicle?: DriverVehicleData | null;
    operationalState?: string;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/me`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching driver profile' };
    }
  }

  public async getVehicleInfo(): Promise<{
    success: boolean;
    hasVehicle: boolean;
    vehicle?: DriverVehicleData | null;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/vehicle`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, hasVehicle: false, error: e.message || 'Network error fetching vehicle info' };
    }
  }

  public async getGarageInfo(): Promise<{
    success: boolean;
    isSelfOwned?: boolean;
    count?: number;
    associations?: any[];
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/garage`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching garage info' };
    }
  }

  public async getDriverHistory(): Promise<{
    success: boolean;
    assignmentHistoryCount?: number;
    assignmentHistory?: DriverHistoryRecord[];
    ridesCount?: number;
    ratingsCount?: number;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/history`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error fetching driver history' };
    }
  }

  public async registerSelfOwnedVehicle(payload: {
    shortVehicleNumber: string;
    registrationNumber: string;
    modelName?: string;
    manufacturingYear?: number;
  }): Promise<{ success: boolean; message?: string; vehicle?: DriverVehicleData; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/driver/self-owned-vehicle`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error registering self-owned vehicle' };
    }
  }
}

export const driverService = new DriverService();
