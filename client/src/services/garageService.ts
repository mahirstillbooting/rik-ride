import { env } from '../config/env';
import { AuthStorage } from '../context/AuthStorage';

export interface GarageProfile {
  _id: string;
  garageId?: string;
  ownerId: string;
  name: string;
  city?: string;
  cityCode?: string;
  area?: string;
  address: string;
  phone: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  capacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GarageStats {
  totalRickshaws: number;
  activeRickshaws: number;
  availableRickshaws: number;
  assignedDrivers: number;
  unassignedRickshaws: number;
  pendingDriverConfirmations: number;
  pendingVehicleApprovals: number;
}

export interface GarageVehicle {
  _id: string;
  vehicleId?: string;
  garageCustomId?: string;
  shortVehicleNumber: string;
  registrationNumber: string;
  qrIdentifier: string;
  ownershipType: 'GARAGE_REGISTERED' | 'SELF_OWNED';
  city?: string;
  cityCode?: string;
  area?: string;
  garageId?: { _id: string; garageId?: string; name: string };
  assignedDriverId?: {
    _id: string;
    name: string;
    phone: string;
    driverMode?: string;
    accountStatus?: string;
  };
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  status: 'AVAILABLE' | 'ON_RIDE' | 'OFFLINE';
  modelName?: string;
  manufacturingYear?: number;
  qrStatus?: string;
  createdAt: string;
}

export interface GarageDriverItem {
  relationId: string;
  driverId: string;
  name: string;
  phone: string;
  email?: string;
  driverMode: string;
  adminAccountStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'DISABLED';
  garageConfirmationStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  assignedAt?: string;
  terminatedAt?: string;
  assignedVehicle?: {
    id: string;
    vehicleId?: string;
    shortVehicleNumber: string;
    registrationNumber: string;
    status: string;
    verificationStatus: string;
  } | null;
}

export interface DriverHistoryItem {
  _id: string;
  vehicleId: {
    _id: string;
    vehicleId?: string;
    shortVehicleNumber: string;
    registrationNumber: string;
    modelName?: string;
  };
  assignedAt: string;
  unassignedAt?: string;
  isCurrent: boolean;
}

class GarageService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }

  public async getMyGarage(): Promise<{ success: boolean; hasGarage: boolean; garage?: GarageProfile; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/my-garage`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, hasGarage: false, error: e.message || 'Network error fetching garage profile' };
    }
  }

  public async createGarage(payload: {
    name: string;
    address: string;
    phone: string;
    capacity?: number;
    city?: string;
    area?: string;
  }): Promise<{ success: boolean; garage?: GarageProfile; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error creating garage' };
    }
  }

  public async updateProfile(payload: {
    name?: string;
    address?: string;
    phone?: string;
    capacity?: number;
    city?: string;
    area?: string;
  }): Promise<{ success: boolean; garage?: GarageProfile; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error updating garage profile' };
    }
  }

  public async getDashboardStats(): Promise<{
    success: boolean;
    hasGarage: boolean;
    garageStatus?: string;
    garageName?: string;
    stats?: GarageStats;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/dashboard-stats`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, hasGarage: false, error: e.message || 'Network error fetching stats' };
    }
  }

  public async getVehicles(filters?: {
    status?: string;
    verificationStatus?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; vehicles: GarageVehicle[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const query = new URLSearchParams();
      if (filters?.status) query.append('status', filters.status);
      if (filters?.verificationStatus) query.append('verificationStatus', filters.verificationStatus);
      if (filters?.search) query.append('search', filters.search);

      const res = await fetch(`${env.apiUrl}/api/garage/vehicles?${query.toString()}`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, count: 0, vehicles: [], error: e.message || 'Network error fetching vehicles' };
    }
  }

  public async registerVehicle(payload: {
    shortVehicleNumber: string;
    registrationNumber: string;
    modelName?: string;
    manufacturingYear?: number;
    city?: string;
    area?: string;
  }): Promise<{ success: boolean; message?: string; vehicle?: GarageVehicle; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/vehicles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error registering vehicle' };
    }
  }

  public async getDrivers(filters?: {
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; drivers: GarageDriverItem[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const query = new URLSearchParams();
      if (filters?.status) query.append('status', filters.status);
      if (filters?.search) query.append('search', filters.search);

      const res = await fetch(`${env.apiUrl}/api/garage/drivers?${query.toString()}`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, count: 0, drivers: [], error: e.message || 'Network error fetching drivers' };
    }
  }

  public async confirmDriver(
    driverId: string,
    action: 'CONFIRM' | 'REJECT'
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/drivers/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ driverId, action }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error processing driver confirmation' };
    }
  }

  public async assignVehicle(
    vehicleId: string,
    driverId: string
  ): Promise<{ success: boolean; message?: string; shortVehicleNumber?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/assign-vehicle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vehicleId, driverId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error assigning vehicle' };
    }
  }

  public async unassignVehicle(
    vehicleId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/unassign-vehicle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vehicleId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error unassigning vehicle' };
    }
  }

  public async terminateDriver(
    driverId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/terminate-driver`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ driverId }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error terminating driver' };
    }
  }

  public async getDriverHistory(
    driverId: string
  ): Promise<{ success: boolean; history: DriverHistoryItem[]; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${env.apiUrl}/api/garage/driver-history/${driverId}`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, history: [], error: e.message || 'Network error fetching driver history' };
    }
  }
}

export const garageService = new GarageService();
