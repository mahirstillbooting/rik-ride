import { env } from '../config/env';
import { AuthStorage } from '../context/AuthStorage';

export type DateRangePreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';
export type OwnershipFilter = 'ALL' | 'GARAGE_REGISTERED' | 'SELF_OWNED';

export interface AdminAnalyticsQueryParams {
  range?: DateRangePreset;
  startDate?: string;
  endDate?: string;
  garageId?: string;
  ownershipType?: OwnershipFilter;
  vehicleId?: string;
  driverId?: string;
}

export interface LiveSnapshotData {
  totalVehicles: number;
  approvedVehicles: number;
  availableVehicles: number;
  onRideVehicles: number;
  offlineVehicles: number;
  staleVehiclesCount: number;
  selfOwnedVehicles: number;
  garageVehicles: number;
  activeGarages: number;
  approvedDrivers: number;
  garageDriversCount: number;
  selfOwnedDriversCount: number;
}

export interface RideAnalyticsData {
  totalRequests: number;
  acceptedCount: number;
  activeCount: number;
  completedCount: number;
  declinedCount: number;
  cancelledCount: number;
  expiredCount: number;
  orphanedCount: number;
  completionRate: number;
  totalDistanceKm: number;
  avgDistanceKm: number;
  avgFareAmount: number;
}

export interface PaymentMethodBreakdown {
  count: number;
  totalFare: number;
}

export interface SettlementAnalyticsData {
  totalRecordedFare: number;
  settledRidesCount: number;
  avgRecordedFare: number;
  paymentMethods: Record<string, PaymentMethodBreakdown>;
}

export interface RatingAnalyticsData {
  avgRating: number;
  totalRatings: number;
  starDistribution: Record<number, number>;
}

export interface SafetyAnalyticsData {
  totalEvents: number;
  yellowAlertsCount: number;
  redSosCount: number;
  resolvedSafetyCount: number;
  openSafetyCount: number;
}

export interface DailyActivityPoint {
  date: string;
  completedRides: number;
  recordedFare: number;
  distanceKm: number;
  safetyEvents: number;
}

export interface TimeSlotData {
  count: number;
  totalFare: number;
}

export interface AdminAnalyticsResponse {
  success: boolean;
  meta?: {
    range: string;
    startDate: string;
    endDate: string;
    garageIdFilter: string;
    ownershipFilter: string;
  };
  liveSnapshot?: LiveSnapshotData;
  rideAnalytics?: RideAnalyticsData;
  settlementAnalytics?: SettlementAnalyticsData;
  ratingAnalytics?: RatingAnalyticsData;
  safetyAnalytics?: SafetyAnalyticsData;
  dailyActivitySeries?: DailyActivityPoint[];
  peakActivitySlots?: Record<string, TimeSlotData>;
  error?: string;
}

class ClientAnalyticsService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    };
  }

  public async getAdminAnalytics(params: AdminAnalyticsQueryParams = {}): Promise<AdminAnalyticsResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const query = new URLSearchParams();

      if (params.range) query.append('range', params.range);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.garageId && params.garageId !== 'ALL') query.append('garageId', params.garageId);
      if (params.ownershipType && params.ownershipType !== 'ALL') query.append('ownershipType', params.ownershipType);
      if (params.vehicleId) query.append('vehicleId', params.vehicleId);
      if (params.driverId) query.append('driverId', params.driverId);

      const res = await fetch(`${env.apiUrl}/api/admin/analytics?${query.toString()}`, { headers });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Failed to fetch admin analytics',
      };
    }
  }
}

export const clientAnalyticsService = new ClientAnalyticsService();
