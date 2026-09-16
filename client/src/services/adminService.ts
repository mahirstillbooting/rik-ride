import { AuthStorage } from '../context/AuthStorage';
import { env } from '../config/env';

export interface AdminStats {
  totalUsers: number;
  passengers: number;
  garageOwners: number;
  drivers: number;
  garageRegisteredDrivers: number;
  selfOwnedDrivers: number;
  garages: number;
  vehicles: number;
  pendingApprovals: number;
  activeEntities: number;
  suspendedEntities: number;
  breakdown: {
    pendingUsers: number;
    pendingGarages: number;
    pendingVehicles: number;
  };
}

export interface PendingQueueItem {
  id: string;
  garageId?: string;
  vehicleId?: string;
  garageCustomId?: string;
  nidNumber?: string;
  city?: string;
  area?: string;
  entityType: 'USER' | 'GARAGE' | 'VEHICLE';
  title: string;
  subtitle: string;
  phone?: string;
  address?: string;
  driverName?: string;
  garageName?: string;
  status: string;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  actorId?: { name: string; phone: string; role: string };
  action: string;
  entity: string;
  entityId?: string;
  metadata?: {
    targetEntityName?: string;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
  };
  timestamp: string;
}

async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = await AuthStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${env.apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server request failed');
  }
  return data;
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const data = await authFetch('/api/admin/stats');
    return data.stats;
  },

  async getPendingQueue(): Promise<PendingQueueItem[]> {
    const data = await authFetch('/api/admin/pending');
    return data.queue || [];
  },

  async getUsers(params: { role?: string; status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const data = await authFetch(`/api/admin/users?${query.toString()}`);
    return data.users || [];
  },

  async getGarages(status?: string) {
    const query = status ? `?status=${status}` : '';
    const data = await authFetch(`/api/admin/garages${query}`);
    return data.garages || [];
  },

  async getDrivers(params: { driverMode?: string; status?: string } = {}) {
    const query = new URLSearchParams();
    if (params.driverMode) query.append('driverMode', params.driverMode);
    if (params.status) query.append('status', params.status);
    const data = await authFetch(`/api/admin/drivers?${query.toString()}`);
    return data.drivers || [];
  },

  async getVehicles(params: { status?: string; ownershipType?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.ownershipType) query.append('ownershipType', params.ownershipType);
    const data = await authFetch(`/api/admin/vehicles?${query.toString()}`);
    return data.vehicles || [];
  },

  async processApproval(
    entityType: 'USER' | 'GARAGE' | 'VEHICLE',
    entityId: string,
    action: 'APPROVE' | 'REJECT' | 'SUSPEND',
    reason?: string
  ) {
    return await authFetch('/api/admin/approval', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, action, reason }),
    });
  },

  async getAuditLogs(page = 1, limit = 50): Promise<AuditLogItem[]> {
    const data = await authFetch(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
    return data.logs || [];
  },

  async getFleetAndPassengerLocations(): Promise<{
    drivers: Array<{ id: string; type: string; lat: number; lng: number; accuracy?: number; label: string; sublabel: string }>;
    passengers: Array<{ id: string; type: string; lat: number; lng: number; accuracy?: number; label: string; sublabel: string }>;
  }> {
    const data = await authFetch('/api/admin/locations');
    return {
      drivers: data.drivers || [],
      passengers: data.passengers || [],
    };
  },
};
