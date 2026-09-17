import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { GarageDriver } from '../models/GarageDriver';
import { DriverLocation, LocationSource, LocationSharingStatus } from '../models/DriverLocation';

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: string | number | Date;
  source?: LocationSource;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  driver?: any;
  vehicle?: any;
}

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes staleness threshold

export class LocationService {
  /**
   * Validate coordinate ranges and numbers
   */
  public validateCoordinates(latitude: number, longitude: number, accuracy?: number): { valid: boolean; error?: string } {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { valid: false, error: 'Latitude and longitude must be valid numeric values.' };
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return { valid: false, error: 'Coordinates cannot be NaN.' };
    }

    if (latitude < -90 || latitude > 90) {
      return { valid: false, error: `Invalid latitude [${latitude}]. Must be between -90 and 90.` };
    }

    if (longitude < -180 || longitude > 180) {
      return { valid: false, error: `Invalid longitude [${longitude}]. Must be between -180 and 180.` };
    }

    if (accuracy !== undefined && (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 10000)) {
      return { valid: false, error: `Invalid accuracy reading [${accuracy}]. Must be between 0 and 10000 meters.` };
    }

    return { valid: true };
  }

  /**
   * Verify driver eligibility & authorized vehicle relationship on the server side
   */
  public async verifyDriverEligibility(driverId: string): Promise<EligibilityResult> {
    const driver = await User.findById(driverId);

    if (!driver || driver.role !== 'DRIVER') {
      return { eligible: false, reason: 'Authenticated user is not a valid driver.' };
    }

    if (driver.accountStatus !== 'ACTIVE') {
      return { eligible: false, reason: `Driver account status is [${driver.accountStatus}]. ACTIVE platform status is required.` };
    }

    const driverMode = driver.driverMode || 'GARAGE_REGISTERED';

    if (driverMode === 'GARAGE_REGISTERED') {
      // 1. Check Garage Driver confirmation status
      const garageRel = await GarageDriver.findOne({ driverId, status: 'ACTIVE' });
      if (!garageRel) {
        return { eligible: false, reason: 'Garage-Registered Driver is not active or confirmed by a Garage Owner.' };
      }

      // 2. Check assigned vehicle
      const vehicle = await Vehicle.findOne({ assignedDriverId: driverId, ownershipType: 'GARAGE_REGISTERED' });
      if (!vehicle) {
        return { eligible: false, reason: 'No Garage-Owned Rickshaw currently assigned to this driver.' };
      }

      if (vehicle.verificationStatus !== 'APPROVED') {
        return { eligible: false, reason: `Assigned Vehicle [${vehicle.shortVehicleNumber}] status is [${vehicle.verificationStatus}]. Admin approval is required.` };
      }

      return { eligible: true, driver, vehicle };
    } else {
      // Self-Owned Driver
      const vehicle = await Vehicle.findOne({ assignedDriverId: driverId, ownershipType: 'SELF_OWNED' });
      if (!vehicle) {
        return { eligible: false, reason: 'Self-Owned Driver has no registered self-owned rickshaw.' };
      }

      if (vehicle.verificationStatus !== 'APPROVED') {
        return { eligible: false, reason: `Self-Owned Rickshaw status is [${vehicle.verificationStatus}]. Admin approval is required.` };
      }

      return { eligible: true, driver, vehicle };
    }
  }

  /**
   * Update driver current location with stale protection and single-document upsert
   */
  public async updateLocation(driverId: string, payload: LocationUpdatePayload) {
    // 1. Verify Driver & Vehicle eligibility server-side
    const eligibility = await this.verifyDriverEligibility(driverId);
    if (!eligibility.eligible || !eligibility.vehicle) {
      return { success: false, statusCode: 403, error: eligibility.reason };
    }

    // 2. Validate coordinates
    const coordValidation = this.validateCoordinates(payload.latitude, payload.longitude, payload.accuracy);
    if (!coordValidation.valid) {
      return { success: false, statusCode: 400, error: coordValidation.error };
    }

    // 3. Process timestamp & stale location protection
    const incomingTime = payload.timestamp ? new Date(payload.timestamp) : new Date();
    if (isNaN(incomingTime.getTime())) {
      return { success: false, statusCode: 400, error: 'Invalid timestamp provided.' };
    }

    // Reject future timestamps > 5 minutes
    if (incomingTime.getTime() > Date.now() + 5 * 60 * 1000) {
      return { success: false, statusCode: 400, error: 'Invalid timestamp: timestamp cannot be far in the future.' };
    }

    const existingLoc = await DriverLocation.findOne({ driverId });
    if (existingLoc && existingLoc.timestamp && incomingTime.getTime() < existingLoc.timestamp.getTime()) {
      return {
        success: false,
        statusCode: 409,
        error: 'Stale location update rejected: incoming GPS timestamp is older than current stored location.',
      };
    }

    const vehicle = eligibility.vehicle;

    // 4. Single-document upsert for current location
    const updatedLocation = await DriverLocation.findOneAndUpdate(
      { driverId },
      {
        driverId,
        vehicleId: vehicle._id,
        vehicleCustomId: vehicle.vehicleId || vehicle.shortVehicleNumber,
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

    // 5. Update vehicle location point
    await Vehicle.updateOne(
      { _id: vehicle._id },
      {
        location: {
          type: 'Point',
          coordinates: [payload.longitude, payload.latitude],
        },
      }
    );

    // 6. Process active ride telemetry if driver is currently on an ACTIVE trip
    try {
      const { rideService } = require('./rideService');
      await rideService.processActiveRideTelemetry(driverId, payload);
    } catch (err) {
      console.error('Error processing ride telemetry:', err);
    }

    return {
      success: true,
      statusCode: 200,
      location: updatedLocation,
      vehicleId: vehicle.vehicleId || vehicle.shortVehicleNumber,
    };
  }

  /**
   * Stop location sharing for driver
   */
  public async stopLocation(driverId: string) {
    const loc = await DriverLocation.findOne({ driverId });
    if (loc) {
      loc.status = 'LOCATION_OFF';
      await loc.save();
    }
    return { success: true, message: 'Location sharing stopped.' };
  }

  /**
   * Get current location status & staleness check
   */
  public async getStatus(driverId: string) {
    const eligibility = await this.verifyDriverEligibility(driverId);
    const loc = await DriverLocation.findOne({ driverId }).lean();

    let computedStatus: LocationSharingStatus = 'LOCATION_OFF';

    if (loc) {
      computedStatus = loc.status as LocationSharingStatus;
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
      vehicleId: eligibility.vehicle ? (eligibility.vehicle.vehicleId || eligibility.vehicle.shortVehicleNumber) : null,
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
}

export const locationService = new LocationService();
