import { User } from '../models/User';
import { PassengerLocation } from '../models/PassengerLocation';
import { DriverLocation } from '../models/DriverLocation';
import { Rating } from '../models/Rating';
import { Ride } from '../models/Ride';
import { GarageDriver } from '../models/GarageDriver';
import { SafetyEvent } from '../models/SafetyEvent';
import { LocationUpdatePayload, locationService } from './locationService';

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes staleness threshold

export class PassengerLocationService {
  /**
   * Verify passenger eligibility server-side (Must be valid user, role PASSENGER, ACTIVE status)
   */
  public async verifyPassengerEligibility(passengerId: string) {
    const passenger = await User.findById(passengerId);

    if (!passenger || passenger.role !== 'PASSENGER') {
      return { eligible: false, reason: 'Authenticated user is not a valid passenger.' };
    }

    if (passenger.accountStatus !== 'ACTIVE') {
      return { eligible: false, reason: `Passenger account status is [${passenger.accountStatus}]. ACTIVE platform status is required.` };
    }

    return { eligible: true, passenger };
  }

  /**
   * Update passenger current location with single-document upsert and stale protection
   */
  public async updateLocation(passengerId: string, payload: LocationUpdatePayload) {
    // 1. Verify Passenger eligibility server-side
    const eligibility = await this.verifyPassengerEligibility(passengerId);
    if (!eligibility.eligible) {
      return { success: false, statusCode: 403, error: eligibility.reason };
    }

    // 2. Validate coordinates
    const coordValidation = locationService.validateCoordinates(payload.latitude, payload.longitude, payload.accuracy);
    if (!coordValidation.valid) {
      return { success: false, statusCode: 400, error: coordValidation.error };
    }

    // 3. Process timestamp & stale protection
    const incomingTime = payload.timestamp ? new Date(payload.timestamp) : new Date();
    if (isNaN(incomingTime.getTime())) {
      return { success: false, statusCode: 400, error: 'Invalid timestamp provided.' };
    }

    // Reject future timestamps > 5 minutes
    if (incomingTime.getTime() > Date.now() + 5 * 60 * 1000) {
      return { success: false, statusCode: 400, error: 'Invalid timestamp: timestamp cannot be far in the future.' };
    }

    const existingLoc = await PassengerLocation.findOne({ passengerId });
    if (existingLoc && existingLoc.timestamp && incomingTime.getTime() < existingLoc.timestamp.getTime()) {
      return {
        success: false,
        statusCode: 409,
        error: 'Stale location update rejected: incoming GPS timestamp is older than current stored location.',
      };
    }

    // 4. Single-document upsert for current passenger location
    const updatedLocation = await PassengerLocation.findOneAndUpdate(
      { passengerId },
      {
        passengerId,
        location: {
          type: 'Point',
          coordinates: [payload.longitude, payload.latitude],
        },
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        speed: payload.speed,
        heading: payload.heading,
        source: payload.source || 'DEVICE_GPS',
        status: 'LOCATION_ACTIVE',
        timestamp: incomingTime,
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      statusCode: 200,
      location: updatedLocation,
    };
  }

  /**
   * Stop location sharing for passenger
   */
  public async stopLocation(passengerId: string) {
    const loc = await PassengerLocation.findOne({ passengerId });
    if (loc) {
      loc.status = 'LOCATION_OFF';
      await loc.save();
    }
    return { success: true, message: 'Passenger location sharing stopped.' };
  }

  /**
   * Get current location status for authenticated passenger
   */
  public async getStatus(passengerId: string) {
    const eligibility = await this.verifyPassengerEligibility(passengerId);
    const loc = await PassengerLocation.findOne({ passengerId }).lean();

    let computedStatus = 'LOCATION_OFF';

    if (loc) {
      computedStatus = loc.status;
      if (computedStatus === 'LOCATION_ACTIVE' && loc.timestamp) {
        const timeDiff = Date.now() - new Date(loc.timestamp).getTime();
        if (timeDiff > STALE_THRESHOLD_MS) {
          computedStatus = 'LOCATION_STALE';
        }
      }
    }

    return {
      success: true,
      eligible: eligibility.eligible,
      eligibilityReason: eligibility.reason,
      sharingStatus: computedStatus,
      lastLocation: loc
        ? {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            speed: loc.speed,
            heading: loc.heading,
            source: loc.source,
            timestamp: loc.timestamp,
          }
        : null,
    };
  }

  /**
   * Admin Live Fleet & Operations Command Center: Fetch all active driver & passenger location markers
   * enriched with strict driver-vehicle verification, location freshness, operational state, and ride summary.
   */
  public async getActiveFleetAndPassengerLocations(options?: {
    statusFilter?: string;
    search?: string;
    freshness?: string;
  }) {
    const { statusFilter = 'ALL', search = '', freshness = 'ALL' } = options || {};

    const [driverLocations, passengerLocations, activeRides, activeSafetyEvents, garageDrivers] = await Promise.all([
      DriverLocation.find({ status: 'LOCATION_ACTIVE' })
        .populate({
          path: 'driverId',
          select: 'name phone role accountStatus driverMode nidNumber',
        })
        .populate({
          path: 'vehicleId',
          select: 'vehicleId garageCustomId shortVehicleNumber registrationNumber qrIdentifier ownershipType verificationStatus status garageId assignedDriverId modelName',
          populate: { path: 'garageId', select: 'garageId name phone' },
        })
        .lean(),
      PassengerLocation.find({ status: 'LOCATION_ACTIVE' })
        .populate('passengerId', 'name phone')
        .lean(),
      Ride.find({
        status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
      })
        .populate('passengerId', 'name phone')
        .populate('driverId', 'name phone')
        .populate('vehicleId', 'vehicleId shortVehicleNumber')
        .lean(),
      SafetyEvent.find({
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED', 'OPEN'] },
      }).lean(),
      GarageDriver.find({ status: 'ACTIVE' }).lean(),
    ]);

    // Build lookup maps
    const activeRideByDriverId = new Map<string, any>();
    const activeRideByVehicleId = new Map<string, any>();
    activeRides.forEach((ride: any) => {
      if (ride.driverId?._id) activeRideByDriverId.set(ride.driverId._id.toString(), ride);
      if (ride.vehicleId?._id) activeRideByVehicleId.set(ride.vehicleId._id.toString(), ride);
    });

    const emergencyDriverIds = new Set<string>();
    const emergencyVehicleIds = new Set<string>();
    activeSafetyEvents.forEach((event: any) => {
      if (event.driverId) emergencyDriverIds.add(event.driverId.toString());
      if (event.vehicleId) emergencyVehicleIds.add(event.vehicleId.toString());
    });

    const activeGarageDriverSet = new Set<string>();
    garageDrivers.forEach((gd: any) => {
      if (gd.garageId && gd.driverId) {
        activeGarageDriverSet.add(`${gd.garageId.toString()}_${gd.driverId.toString()}`);
      }
    });

    const now = Date.now();

    const summaryCounts = {
      totalFleet: driverLocations.length,
      available: 0,
      activeRide: 0,
      idle: 0,
      stale: 0,
      emergency: 0,
      unverified: 0,
    };

    const drivers = driverLocations.map((d: any) => {
      const driver = d.driverId as any;
      const vehicle = d.vehicleId as any;
      const garage = vehicle?.garageId as any;

      const driverIdStr = driver?._id?.toString();
      const vehicleIdStr = vehicle?._id?.toString();

      // Freshness calculation
      const lastTimestamp = d.timestamp ? new Date(d.timestamp).getTime() : 0;
      const timeDiffMs = now - lastTimestamp;
      const isFresh = lastTimestamp > 0 && timeDiffMs <= STALE_THRESHOLD_MS;
      const freshnessState = isFresh ? 'FRESH' : 'STALE';

      // Strict Driver-Vehicle Verification Logic
      let isDriverVerifiedForVehicle = false;
      let driverVerificationReason = '';

      if (!driver || !vehicle) {
        isDriverVerifiedForVehicle = false;
        driverVerificationReason = 'Driver or vehicle registration missing from location record.';
      } else if (vehicle.ownershipType === 'SELF_OWNED') {
        const assignedId = vehicle.assignedDriverId ? vehicle.assignedDriverId.toString() : null;
        if (assignedId === driverIdStr || driver.driverMode === 'SELF_OWNED') {
          isDriverVerifiedForVehicle = true;
          driverVerificationReason = 'Authorized self-owned driver';
        } else {
          isDriverVerifiedForVehicle = false;
          driverVerificationReason = 'Driver is not the registered owner of this self-owned vehicle';
        }
      } else if (vehicle.ownershipType === 'GARAGE_REGISTERED') {
        const assignedId = vehicle.assignedDriverId ? vehicle.assignedDriverId.toString() : null;
        const garageIdStr = garage?._id?.toString() || (vehicle.garageId ? vehicle.garageId.toString() : null);
        const hasGarageLink = garageIdStr && driverIdStr && activeGarageDriverSet.has(`${garageIdStr}_${driverIdStr}`);

        if (assignedId === driverIdStr || hasGarageLink) {
          isDriverVerifiedForVehicle = true;
          driverVerificationReason = 'Verified garage driver assignment';
        } else {
          isDriverVerifiedForVehicle = false;
          driverVerificationReason = 'Driver unverified for this vehicle: Not assigned or unconfirmed garage driver';
        }
      }

      if (!isDriverVerifiedForVehicle) {
        summaryCounts.unverified++;
      }

      // Operational state determination
      const hasEmergency =
        (driverIdStr && emergencyDriverIds.has(driverIdStr)) ||
        (vehicleIdStr && emergencyVehicleIds.has(vehicleIdStr));
      const activeRide =
        (driverIdStr && activeRideByDriverId.get(driverIdStr)) ||
        (vehicleIdStr && activeRideByVehicleId.get(vehicleIdStr));

      let operationalState: 'AVAILABLE' | 'ACTIVE_RIDE' | 'IDLE' | 'STALE' | 'EMERGENCY' = 'IDLE';

      if (hasEmergency) {
        operationalState = 'EMERGENCY';
        summaryCounts.emergency++;
      } else if (activeRide) {
        operationalState = 'ACTIVE_RIDE';
        summaryCounts.activeRide++;
      } else if (!isFresh) {
        operationalState = 'STALE';
        summaryCounts.stale++;
      } else if (vehicle?.status === 'AVAILABLE' || d.status === 'LOCATION_ACTIVE') {
        operationalState = 'AVAILABLE';
        summaryCounts.available++;
      } else {
        operationalState = 'IDLE';
        summaryCounts.idle++;
      }

      // Active Ride Summary
      let activeRideSummary: any = null;
      if (activeRide) {
        const pass = activeRide.passengerId as any;
        activeRideSummary = {
          rideId: activeRide.rideId,
          status: activeRide.status,
          passengerId: pass?._id?.toString(),
          passengerName: pass?.name || 'Passenger',
          passengerPhone: pass?.phone || '',
          passengerPseudonym: activeRide.passengerPseudonym,
          pickupArea: activeRide.approximatePickupArea,
          pickupCoordinates: activeRide.pickupLocation?.coordinates || [activeRide.pickupLongitude, activeRide.pickupLatitude],
          routePoints: activeRide.routePoints || [],
          distanceMeters: activeRide.distanceMeters || 0,
          startedAt: activeRide.startedAt || activeRide.acceptedAt || activeRide.requestedAt,
          isAdminReviewPending: activeRide.isAdminReviewPending || false,
        };
      }

      return {
        id: d._id.toString(),
        type: 'DRIVER',
        lat: d.latitude,
        lng: d.longitude,
        accuracy: d.accuracy || 0,
        speed: d.speed || 0,
        heading: d.heading || 0,
        status: d.status,
        timestamp: d.timestamp,
        locationSource: d.source || 'DEVICE_GPS',
        isFresh,
        freshness: freshnessState,
        lastSeenAgoSeconds: Math.round(timeDiffMs / 1000),

        // Verification & Identity
        isDriverVerifiedForVehicle,
        driverVerificationReason,

        // Driver Details
        driverId: driverIdStr || null,
        driverName: driver?.name || 'Unknown Driver',
        driverPhone: driver?.phone || 'N/A',
        driverMode: driver?.driverMode || vehicle?.ownershipType || 'GARAGE_REGISTERED',

        // Vehicle Details
        vehicleId: vehicleIdStr || null,
        vehicleSystemId: vehicle?.vehicleId || 'UNREGISTERED',
        vehicleCustomId: d.vehicleCustomId || vehicle?.garageCustomId || vehicle?.vehicleId || 'N/A',
        shortVehicleNumber: vehicle?.shortVehicleNumber || 'D-UNKN',
        registrationNumber: vehicle?.registrationNumber || 'UNREGISTERED',
        ownershipType: vehicle?.ownershipType || 'GARAGE_REGISTERED',
        vehicleStatus: vehicle?.status || 'OFFLINE',
        vehicleVerificationStatus: vehicle?.verificationStatus || 'PENDING',
        modelName: vehicle?.modelName || 'Rickshaw Unit',

        // Garage Details
        garageId: garage?._id?.toString() || null,
        garageCustomId: garage?.garageId || 'N/A',
        garageName: garage?.name || (vehicle?.ownershipType === 'SELF_OWNED' ? 'Self-Owned' : 'N/A'),

        // Command Center Operational State
        operationalState,
        activeRideSummary,

        label: vehicle ? `Rickshaw ${vehicle.shortVehicleNumber}` : 'Driver Unit',
        sublabel: `Driver: ${driver ? driver.name : 'Authorized Driver'} | ${operationalState}`,
      };
    });

    // Operational filtering
    let filteredDrivers = drivers;

    if (statusFilter && statusFilter !== 'ALL') {
      filteredDrivers = filteredDrivers.filter((d) => d.operationalState === statusFilter);
    }

    if (freshness && freshness !== 'ALL') {
      filteredDrivers = filteredDrivers.filter((d) => d.freshness === freshness);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filteredDrivers = filteredDrivers.filter(
        (d) =>
          d.vehicleSystemId.toLowerCase().includes(q) ||
          d.shortVehicleNumber.toLowerCase().includes(q) ||
          d.registrationNumber.toLowerCase().includes(q) ||
          d.driverName.toLowerCase().includes(q) ||
          d.driverPhone.toLowerCase().includes(q) ||
          d.garageCustomId.toLowerCase().includes(q) ||
          d.garageName.toLowerCase().includes(q) ||
          (d.activeRideSummary && d.activeRideSummary.rideId.toLowerCase().includes(q))
      );
    }

    const passengers = passengerLocations.map((p: any) => ({
      id: p._id.toString(),
      type: 'PASSENGER',
      lat: p.latitude,
      lng: p.longitude,
      accuracy: p.accuracy,
      speed: p.speed,
      status: p.status,
      timestamp: p.timestamp,
      label: `Passenger Unit`,
      sublabel: `Passenger: ${p.passengerId ? p.passengerId.name : 'Authenticated Passenger'}`,
    }));

    return {
      success: true,
      summary: summaryCounts,
      drivers: filteredDrivers,
      passengers,
      totalActive: filteredDrivers.length + passengers.length,
    };
  }

  /**
   * Discovery Radar: Fetch nearby operational available rickshaws within radius
   */
  public async getNearbyAvailableRickshaws(
    latitude?: number,
    longitude?: number,
    radiusKm: number = 2
  ) {
    let query: any = {
      status: 'LOCATION_ACTIVE',
    };

    // Geospatial query if passenger coordinates provided
    if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000, // convert km to meters
        },
      };
    }

    const locations = await DriverLocation.find(query)
      .populate({
        path: 'driverId',
        select: 'name phone accountStatus role',
      })
      .populate({
        path: 'vehicleId',
        select: 'vehicleId shortVehicleNumber registrationNumber qrIdentifier verificationStatus status ownershipType modelName assignedDriverId',
      })
      .lean();

    // Filter strictly for active drivers and approved & available vehicles
    const validRickshaws: any[] = [];

    for (const loc of locations) {
      const driver = loc.driverId as any;
      const vehicle = loc.vehicleId as any;

      if (!driver || driver.accountStatus !== 'ACTIVE') continue;
      if (!vehicle || vehicle.verificationStatus !== 'APPROVED' || vehicle.status !== 'AVAILABLE') continue;

      // Exclude vehicles or drivers currently engaged in an active trip
      const hasActiveRide = await Ride.exists({
        $or: [{ driverId: driver._id }, { vehicleId: vehicle._id }],
        status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
      });
      if (hasActiveRide) continue;

      // Calculate distance if passenger location is available
      let distanceKm: number | null = null;
      if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
        distanceKm = Number(this.calculateHaversineDistance(latitude, longitude, loc.latitude, loc.longitude).toFixed(2));
      }

      // Compute aggregate driver rating from Rating model
      const ratingStats = await Rating.aggregate([
        { $match: { ratedId: driver._id } },
        {
          $group: {
            _id: '$ratedId',
            avgRating: { $avg: '$rating' },
            ratingsCount: { $sum: 1 },
          },
        },
      ]);

      const avgRating = ratingStats.length > 0 ? Number(ratingStats[0].avgRating.toFixed(1)) : null;
      const ratingsCount = ratingStats.length > 0 ? ratingStats[0].ratingsCount : 0;

      // Count completed rides for driver
      const completedRidesCount = await Ride.countDocuments({ driverId: driver._id, status: 'COMPLETED' });

      // Verify driver ↔ vehicle relationship linkage
      const isDriverVerifiedForVehicle = vehicle.assignedDriverId
        ? vehicle.assignedDriverId.toString() === driver._id.toString()
        : true;

      validRickshaws.push({
        id: loc._id.toString(),
        driverId: driver._id.toString(),
        driverName: driver.name,
        driverPhone: driver.phone,
        vehicleId: vehicle._id.toString(),
        customVehicleId: vehicle.vehicleId || vehicle.shortVehicleNumber,
        shortVehicleNumber: vehicle.shortVehicleNumber,
        registrationNumber: vehicle.registrationNumber,
        qrIdentifier: vehicle.qrIdentifier,
        ownershipType: vehicle.ownershipType,
        modelName: vehicle.modelName || 'Electric Rickshaw',
        verificationStatus: vehicle.verificationStatus,
        status: vehicle.status,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        distanceKm,
        avgRating,
        ratingsCount,
        completedRidesCount,
        isDriverVerifiedForVehicle,
        updatedAt: loc.timestamp || loc.updatedAt,
      });
    }

    return {
      success: true,
      count: validRickshaws.length,
      radiusKm,
      passengerCoordinates:
        latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null,
      rickshaws: validRickshaws,
    };
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const passengerLocationService = new PassengerLocationService();
