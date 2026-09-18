import { AuthStorage } from '../context/AuthStorage';
import { env } from '../config/env';

export interface ResolvedDriverData {
  _id: string;
  name: string;
  phone: string;
  driverMode?: string;
  accountStatus?: string;
  avgRating?: number;
  totalRatings?: number;
}

export interface ResolvedGarageData {
  _id: string;
  garageId?: string;
  name: string;
  phone: string;
  address: string;
}

export interface ResolvedQRVehicleData {
  _id: string;
  vehicleId: string;
  shortVehicleNumber: string;
  registrationNumber: string;
  ownershipType: 'GARAGE_REGISTERED' | 'SELF_OWNED';
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  status: 'AVAILABLE' | 'ON_RIDE' | 'OFFLINE';
  qrIdentifier: string;
  qrStatus: 'ACTIVE' | 'REVOKED' | 'REPLACED' | 'DISABLED';
  modelName?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  garage?: ResolvedGarageData | null;
  driver?: ResolvedDriverData | null;
  isDriverVerifiedForVehicle: boolean;
  driverVerificationReason: string;
}

export interface ResolveQRResponse {
  success: boolean;
  vehicle?: ResolvedQRVehicleData;
  error?: string;
  qrStatus?: string;
}

export interface DriverScanQRResponse {
  success: boolean;
  message?: string;
  vehicle?: any;
  error?: string;
}

async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = await AuthStorage.getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${env.apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.details || `API request failed: ${response.status}`);
  }
  return data;
}

export const clientQRService = {
  /**
   * Resolves a scanned QR code payload, Vehicle ID, or Car Number via backend server verification.
   */
  async resolveQR(params: { qrPayload?: string; vehicleId?: string; shortVehicleNumber?: string }): Promise<ResolveQRResponse> {
    try {
      return await authFetch('/api/qr/resolve', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to resolve QR code' };
    }
  },

  /**
   * Driver QR Scan Confirmation Endpoint
   */
  async driverConfirmScanQR(qrPayload: string): Promise<DriverScanQRResponse> {
    try {
      return await authFetch('/api/qr/driver/scan-qr', {
        method: 'POST',
        body: JSON.stringify({ qrPayload }),
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Driver scan confirmation failed' };
    }
  },

  /**
   * Admin QR Revocation Endpoint
   */
  async revokeVehicleQR(vehicleId: string, reason?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await authFetch(`/api/admin/vehicles/${vehicleId}/revoke-qr`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to revoke QR code' };
    }
  },

  /**
   * Admin QR Replacement Endpoint
   */
  async replaceVehicleQR(vehicleId: string, reason?: string): Promise<{ success: boolean; message?: string; vehicle?: any; error?: string }> {
    try {
      return await authFetch(`/api/admin/vehicles/${vehicleId}/replace-qr`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to replace QR code' };
    }
  },
};
