import { User } from '../models/User';
import { PassengerLocation } from '../models/PassengerLocation';
import { DriverLocation } from '../models/DriverLocation';
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
}

export const passengerLocationService = new PassengerLocationService();
