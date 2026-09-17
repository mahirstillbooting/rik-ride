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

export type FleetOperationalState = 'AVAILABLE' | 'ACTIVE_RIDE' | 'IDLE' | 'STALE' | 'EMERGENCY';

export interface AdminActiveRideSummary {
  rideId: string;
  status: string;
  passengerId?: string;
  passengerName: string;
  passengerPhone: string;
  passengerPseudonym: string;
  pickupArea: string;
  pickupCoordinates: [number, number];
  routePoints?: Array<{
    coordinates: [number, number];
    timestamp: string;
    speed?: number;
    accuracy?: number;
  }>;
  distanceMeters?: number;
  startedAt?: string;
  isAdminReviewPending?: boolean;
}

export interface AdminFleetDriverLocation {
  id: string;
  type: 'DRIVER';
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  status: string;
  timestamp: string;
  locationSource: string;
  isFresh: boolean;
  freshness: 'FRESH' | 'STALE';
  lastSeenAgoSeconds: number;

  // Verification & Identity
  isDriverVerifiedForVehicle: boolean;
  driverVerificationReason: string;

  // Driver Details
  driverId: string | null;
  driverName: string;
  driverPhone: string;
  driverMode: 'GARAGE_REGISTERED' | 'SELF_OWNED';

  // Vehicle Details
  vehicleId: string | null;
  vehicleSystemId: string;
  vehicleCustomId: string;
  shortVehicleNumber: string;
  registrationNumber: string;
  ownershipType: 'GARAGE_REGISTERED' | 'SELF_OWNED';
  vehicleStatus: string;
  vehicleVerificationStatus: string;
  modelName: string;

  // Garage Details
  garageId: string | null;
  garageCustomId: string;
  garageName: string;

  // Command Center Operational State
  operationalState: FleetOperationalState;
  activeRideSummary?: AdminActiveRideSummary | null;

  label: string;
  sublabel: string;
}

export interface AdminFleetPassengerLocation {
  id: string;
  type: 'PASSENGER';
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  status: string;
  timestamp: string;
  label: string;
  sublabel: string;
}

export interface AdminFleetSummary {
  totalFleet: number;
  available: number;
  activeRide: number;
  idle: number;
  stale: number;
  emergency: number;
  unverified: number;
}

export interface AdminFleetLocationsResponse {
  success: boolean;
  summary: AdminFleetSummary;
  drivers: AdminFleetDriverLocation[];
  passengers: AdminFleetPassengerLocation[];
  totalActive: number;
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

  async getFleetAndPassengerLocations(params: {
    statusFilter?: string;
    search?: string;
    freshness?: string;
  } = {}): Promise<AdminFleetLocationsResponse> {
    const query = new URLSearchParams();
    if (params.statusFilter) query.append('statusFilter', params.statusFilter);
    if (params.search) query.append('search', params.search);
    if (params.freshness) query.append('freshness', params.freshness);

    const data = await authFetch(`/api/admin/locations?${query.toString()}`);
    return {
      success: data.success ?? true,
      summary: data.summary || {
        totalFleet: data.drivers?.length || 0,
        available: 0,
        activeRide: 0,
        idle: 0,
        stale: 0,
        emergency: 0,
        unverified: 0,
      },
      drivers: data.drivers || [],
      passengers: data.passengers || [],
      totalActive: data.totalActive || 0,
    };
  },
};
