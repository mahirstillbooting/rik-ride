import { Types } from 'mongoose';
import { Vehicle } from '../models/Vehicle';
import { Ride } from '../models/Ride';
import { Rating } from '../models/Rating';
import { SafetyEvent } from '../models/SafetyEvent';
import { Garage } from '../models/Garage';
import { User } from '../models/User';

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

export class AnalyticsService {
  /**
   * Calculate date boundaries [start, end] based on preset or custom ISO strings
   */
  private getDateBoundaries(params: AdminAnalyticsQueryParams): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    const range = params.range || 'LAST_7_DAYS';

    if (range === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (range === 'LAST_7_DAYS') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'LAST_30_DAYS') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'CUSTOM' && params.startDate && params.endDate) {
      start = new Date(params.startDate);
      end = new Date(params.endDate);
    } else {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  /**
   * Main Admin Analytics Query Method
   */
  public async getAdminAnalytics(params: AdminAnalyticsQueryParams = {}) {
    const { start, end } = this.getDateBoundaries(params);

    // Build Match Criteria for Historical Queries
    const rideMatch: any = {
      requestedAt: { $gte: start, $lte: end },
    };

    const safetyMatch: any = {
      timestamp: { $gte: start, $lte: end },
    };

    const vehicleMatch: any = {};

    if (params.garageId && params.garageId !== 'ALL') {
      if (Types.ObjectId.isValid(params.garageId)) {
        const gId = new Types.ObjectId(params.garageId);
        rideMatch.garageId = gId;
        safetyMatch.garageId = gId;
        vehicleMatch.garageId = gId;
      }
    }

    if (params.ownershipType && params.ownershipType !== 'ALL') {
      if (params.ownershipType === 'GARAGE_REGISTERED') {
        rideMatch.garageId = { $ne: null };
        vehicleMatch.ownershipType = 'GARAGE_REGISTERED';
      } else if (params.ownershipType === 'SELF_OWNED') {
        rideMatch.garageId = null;
        vehicleMatch.ownershipType = 'SELF_OWNED';
      }
    }

    if (params.vehicleId && Types.ObjectId.isValid(params.vehicleId)) {
      const vId = new Types.ObjectId(params.vehicleId);
      rideMatch.vehicleId = vId;
      safetyMatch.vehicleId = vId;
      vehicleMatch._id = vId;
    }

    if (params.driverId && Types.ObjectId.isValid(params.driverId)) {
      const dId = new Types.ObjectId(params.driverId);
      rideMatch.driverId = dId;
      safetyMatch.driverId = dId;
    }

    // 1. LIVE CURRENT SNAPSHOT (Real-Time State)
    const [
      totalVehicles,
      approvedVehicles,
      availableVehicles,
      onRideVehicles,
      offlineVehicles,
      selfOwnedVehicles,
      garageVehicles,
      activeGarages,
      approvedDrivers,
      garageDriversCount,
      selfOwnedDriversCount,
    ] = await Promise.all([
      Vehicle.countDocuments(vehicleMatch),
      Vehicle.countDocuments({ ...vehicleMatch, verificationStatus: 'APPROVED' }),
      Vehicle.countDocuments({ ...vehicleMatch, verificationStatus: 'APPROVED', status: 'AVAILABLE' }),
      Vehicle.countDocuments({ ...vehicleMatch, verificationStatus: 'APPROVED', status: 'ON_RIDE' }),
      Vehicle.countDocuments({ ...vehicleMatch, status: 'OFFLINE' }),
      Vehicle.countDocuments({ ...vehicleMatch, ownershipType: 'SELF_OWNED' }),
      Vehicle.countDocuments({ ...vehicleMatch, ownershipType: 'GARAGE_REGISTERED' }),
      Garage.countDocuments({ verificationStatus: 'APPROVED' }),
      User.countDocuments({ role: { $in: ['DRIVER', 'GARAGE_DRIVER', 'INDEPENDENT_DRIVER'] }, accountStatus: 'APPROVED' }),
      User.countDocuments({ role: 'GARAGE_DRIVER', accountStatus: 'APPROVED' }),
      User.countDocuments({ role: 'INDEPENDENT_DRIVER', accountStatus: 'APPROVED' }),
    ]);

    // Calculate stale/offline location threshold (2 mins)
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
    const staleVehiclesCount = await Vehicle.countDocuments({
      ...vehicleMatch,
      verificationStatus: 'APPROVED',
      updatedAt: { $lt: twoMinsAgo },
    });

    // 2. HISTORICAL RIDE LIFECYCLE AGGREGATION
    const rideAggregationPipeline: any[] = [
      { $match: rideMatch },
      {
        $facet: {
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          completedTotals: [
            { $match: { status: 'COMPLETED' } },
            {
              $group: {
                _id: null,
                totalCompleted: { $sum: 1 },
                totalDistanceMeters: { $sum: { $ifNull: ['$distanceMeters', 0] } },
                avgDistanceMeters: { $avg: { $ifNull: ['$distanceMeters', 0] } },
                totalFareAmount: { $sum: { $ifNull: ['$fareAmount', 0] } },
                avgFareAmount: { $avg: { $ifNull: ['$fareAmount', 0] } },
              },
            },
          ],
          paymentMethodCounts: [
            { $match: { status: 'COMPLETED' } },
            {
              $group: {
                _id: { $ifNull: ['$paymentMethod', 'CASH'] },
                count: { $sum: 1 },
                totalAmount: { $sum: { $ifNull: ['$fareAmount', 0] } },
              },
            },
          ],
          dailyTrend: [
            { $match: { status: 'COMPLETED' } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$requestedAt' } },
                completedRides: { $sum: 1 },
                recordedFare: { $sum: { $ifNull: ['$fareAmount', 0] } },
                distanceMeters: { $sum: { $ifNull: ['$distanceMeters', 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ],
          peakTimeOfDay: [
            { $match: { status: 'COMPLETED' } },
            {
              $project: {
                hour: { $hour: '$requestedAt' },
                fareAmount: { $ifNull: ['$fareAmount', 0] },
              },
            },
            {
              $project: {
                timeSlot: {
                  $switch: {
                    branches: [
                      { case: { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 12] }] }, then: 'MORNING' },
                      { case: { $and: [{ $gte: ['$hour', 12] }, { $lt: ['$hour', 17] }] }, then: 'AFTERNOON' },
                      { case: { $and: [{ $gte: ['$hour', 17] }, { $lt: ['$hour', 22] }] }, then: 'EVENING' },
                    ],
                    default: 'NIGHT',
                  },
                },
                fareAmount: 1,
              },
            },
            {
              $group: {
                _id: '$timeSlot',
                count: { $sum: 1 },
                totalFare: { $sum: '$fareAmount' },
              },
            },
          ],
        },
      },
    ];

    const [rideFacetResult] = await Ride.aggregate(rideAggregationPipeline);

    // Format Ride Status Counts
    const statusMap: Record<string, number> = {};
    if (rideFacetResult?.statusCounts) {
      rideFacetResult.statusCounts.forEach((item: any) => {
        statusMap[item._id] = item.count;
      });
    }

    const totalRequests = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const acceptedCount = statusMap['ACCEPTED'] || 0;
    const activeCount = statusMap['ACTIVE'] || 0;
    const completedCount = statusMap['COMPLETED'] || 0;
    const declinedCount = statusMap['DECLINED'] || 0;
    const cancelledCount = statusMap['CANCELLED'] || 0;
    const expiredCount = statusMap['EXPIRED'] || 0;
    const orphanedCount = statusMap['ORPHANED'] || 0;

    const completionRate = totalRequests > 0 ? Number(((completedCount / totalRequests) * 100).toFixed(1)) : 0;

    const completedTotals = rideFacetResult?.completedTotals?.[0] || {
      totalCompleted: 0,
      totalDistanceMeters: 0,
      avgDistanceMeters: 0,
      totalFareAmount: 0,
      avgFareAmount: 0,
    };

    const totalDistanceKm = Number((completedTotals.totalDistanceMeters / 1000).toFixed(2));
    const avgDistanceKm = Number((completedTotals.avgDistanceMeters / 1000).toFixed(2));
    const totalRecordedFare = completedTotals.totalFareAmount || 0;
    const avgFareAmount = Number((completedTotals.avgFareAmount || 0).toFixed(2));

    // Format Payment Method Breakdown
    const paymentMethods: Record<string, { count: number; totalFare: number }> = {
      CASH: { count: 0, totalFare: 0 },
      BKASH: { count: 0, totalFare: 0 },
      NAGAD: { count: 0, totalFare: 0 },
      OTHER_MFS: { count: 0, totalFare: 0 },
    };

    if (rideFacetResult?.paymentMethodCounts) {
      rideFacetResult.paymentMethodCounts.forEach((item: any) => {
        if (paymentMethods[item._id]) {
          paymentMethods[item._id] = { count: item.count, totalFare: item.totalAmount };
        }
      });
    }

    // 3. RATING ANALYTICS
    const ratingAggregation = await Rating.aggregate([
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 },
              },
            },
          ],
          distribution: [
            {
              $group: {
                _id: '$rating',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const ratingOverview = ratingAggregation[0]?.overview?.[0] || { avgRating: 0, totalRatings: 0 };
    const starDistributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (ratingAggregation[0]?.distribution) {
      ratingAggregation[0].distribution.forEach((item: any) => {
        if (item._id >= 1 && item._id <= 5) {
          starDistributionMap[item._id] = item.count;
        }
      });
    }

    // 4. SAFETY INCIDENT ANALYTICS
    const safetyAggregation = await SafetyEvent.aggregate([
      { $match: safetyMatch },
      {
        $facet: {
          severityCounts: [
            { $group: { _id: '$severity', count: { $sum: 1 } } },
          ],
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          typeCounts: [
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
          ],
          dailySafetyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const safetyResult = safetyAggregation[0] || {};
    const severityMap: Record<string, number> = {};
    if (safetyResult.severityCounts) {
      safetyResult.severityCounts.forEach((i: any) => (severityMap[i._id] = i.count));
    }

    const safetyStatusMap: Record<string, number> = {};
    if (safetyResult.statusCounts) {
      safetyResult.statusCounts.forEach((i: any) => (safetyStatusMap[i._id] = i.count));
    }

    const totalSafetyEvents = Object.values(severityMap).reduce((a, b) => a + b, 0);
    const yellowAlertsCount = severityMap['YELLOW'] || 0;
    const redSosCount = severityMap['RED'] || 0;
    const resolvedSafetyCount = safetyStatusMap['RESOLVED'] || 0;
    const openSafetyCount = (safetyStatusMap['ACTIVE'] || 0) + (safetyStatusMap['ACKNOWLEDGED'] || 0) + (safetyStatusMap['OPEN'] || 0);

    // Merge Daily Trends for Time Series
    const dailyMap: Record<string, { date: string; completedRides: number; recordedFare: number; distanceKm: number; safetyEvents: number }> = {};

    if (rideFacetResult?.dailyTrend) {
      rideFacetResult.dailyTrend.forEach((d: any) => {
        dailyMap[d._id] = {
          date: d._id,
          completedRides: d.completedRides,
          recordedFare: d.recordedFare,
          distanceKm: Number((d.distanceMeters / 1000).toFixed(2)),
          safetyEvents: 0,
        };
      });
    }

    if (safetyResult?.dailySafetyTrend) {
      safetyResult.dailySafetyTrend.forEach((s: any) => {
        if (!dailyMap[s._id]) {
          dailyMap[s._id] = {
            date: s._id,
            completedRides: 0,
            recordedFare: 0,
            distanceKm: 0,
            safetyEvents: s.count,
          };
        } else {
          dailyMap[s._id].safetyEvents = s.count;
        }
      });
    }

    const dailyActivitySeries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Peak Activity Breakdown
    const timeSlotsMap: Record<string, { count: number; totalFare: number }> = {
      MORNING: { count: 0, totalFare: 0 },
      AFTERNOON: { count: 0, totalFare: 0 },
      EVENING: { count: 0, totalFare: 0 },
      NIGHT: { count: 0, totalFare: 0 },
    };

    if (rideFacetResult?.peakTimeOfDay) {
      rideFacetResult.peakTimeOfDay.forEach((slot: any) => {
        if (timeSlotsMap[slot._id]) {
          timeSlotsMap[slot._id] = { count: slot.count, totalFare: slot.totalFare };
        }
      });
    }

    return {
      success: true,
      meta: {
        range: params.range || 'LAST_7_DAYS',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        garageIdFilter: params.garageId || 'ALL',
        ownershipFilter: params.ownershipType || 'ALL',
      },
      liveSnapshot: {
        totalVehicles,
        approvedVehicles,
        availableVehicles,
        onRideVehicles,
        offlineVehicles,
        staleVehiclesCount,
        selfOwnedVehicles,
        garageVehicles,
        activeGarages,
        approvedDrivers,
        garageDriversCount,
        selfOwnedDriversCount,
      },
      rideAnalytics: {
        totalRequests,
        acceptedCount,
        activeCount,
        completedCount,
        declinedCount,
        cancelledCount,
        expiredCount,
        orphanedCount,
        completionRate,
        totalDistanceKm,
        avgDistanceKm,
        avgFareAmount,
      },
      settlementAnalytics: {
        totalRecordedFare,
        settledRidesCount: completedCount,
        avgRecordedFare: avgFareAmount,
        paymentMethods,
      },
      ratingAnalytics: {
        avgRating: Number((ratingOverview.avgRating || 0).toFixed(2)),
        totalRatings: ratingOverview.totalRatings || 0,
        starDistribution: starDistributionMap,
      },
      safetyAnalytics: {
        totalEvents: totalSafetyEvents,
        yellowAlertsCount,
        redSosCount,
        resolvedSafetyCount,
        openSafetyCount,
      },
      dailyActivitySeries,
      peakActivitySlots: timeSlotsMap,
    };
  }
}

export const analyticsService = new AnalyticsService();
