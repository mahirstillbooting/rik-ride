import { User } from '../models/User';
import { PassengerLocation } from '../models/PassengerLocation';
import { DriverLocation } from '../models/DriverLocation';
import { Rating } from '../models/Rating';
import { Ride } from '../models/Ride';
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
   * Admin monitoring endpoint: Fetch all active driver & passenger location markers
   */
  public async getActiveFleetAndPassengerLocations() {
    const [driverLocations, passengerLocations] = await Promise.all([
      DriverLocation.find({ status: 'LOCATION_ACTIVE' })
        .populate('driverId', 'name phone')
        .populate('vehicleId', 'shortVehicleNumber registrationNumber')
        .lean(),
      PassengerLocation.find({ status: 'LOCATION_ACTIVE' })
        .populate('passengerId', 'name phone')
        .lean(),
    ]);

    const drivers = driverLocations.map((d: any) => ({
      id: d._id.toString(),
      type: 'DRIVER',
      lat: d.latitude,
      lng: d.longitude,
      accuracy: d.accuracy,
      speed: d.speed,
      status: d.status,
      timestamp: d.timestamp,
      label: d.vehicleId ? `Rickshaw ${d.vehicleId.shortVehicleNumber}` : 'Driver Unit',
      sublabel: `Driver: ${d.driverId ? d.driverId.name : 'Authorized Driver'}`,
    }));

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
      drivers,
      passengers,
      totalActive: drivers.length + passengers.length,
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
        select: 'vehicleId shortVehicleNumber registrationNumber qrIdentifier verificationStatus status ownershipType modelName',
      })
      .lean();

    // Filter strictly for active drivers and approved & available vehicles
    const validRickshaws: any[] = [];

    for (const loc of locations) {
      const driver = loc.driverId as any;
      const vehicle = loc.vehicleId as any;

      if (!driver || driver.accountStatus !== 'ACTIVE') continue;
      if (!vehicle || vehicle.verificationStatus !== 'APPROVED' || vehicle.status !== 'AVAILABLE') continue;

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
