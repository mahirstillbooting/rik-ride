import { Types } from 'mongoose';
import { Ride, IRide, RideStatus } from '../models/Ride';
import { User } from '../models/User';
import { DriverLocation } from '../models/DriverLocation';
import { PassengerLocation } from '../models/PassengerLocation';
import { locationService } from './locationService';
import { passengerLocationService } from './passengerLocationService';

export const ACCEPTANCE_TIMEOUT_MS = 15000; // 15 seconds acceptance window
export const MAX_COMPLETION_SPEED_KMH = 10; // 10 km/h speed threshold for completion request

export interface RideRequestPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  destinationText?: string;
}

export class RideService {
  /**
   * Helper: Generate human-readable short ride ID
   */
  private generateRideId(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `RIDE-${randomNum}`;
  }

  /**
   * Helper: Generate daily sequential passenger pseudonym e.g. "Trip #09"
   */
  private async generateDailyPseudonym(): Promise<string> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const countToday = await Ride.countDocuments({
      requestedAt: { $gte: startOfDay },
    });

    const tripNum = String(countToday + 1).padStart(2, '0');
    return `Trip #${tripNum}`;
  }

  /**
   * Helper: Derive privacy-protected approximate pickup area
   */
  private getApproximatePickupArea(lat: number, lng: number): string {
    const roundedLat = lat.toFixed(2);
    const roundedLng = lng.toFixed(2);
    return `Dhaka Zone [${roundedLat}°N, ${roundedLng}°E]`;
  }

  /**
   * Create a new ride request for an authenticated passenger
   */
  public async createRideRequest(passengerId: string, payload: RideRequestPayload) {
    // 1. Verify passenger eligibility
    const eligibility = await passengerLocationService.verifyPassengerEligibility(passengerId);
    if (!eligibility.eligible) {
      return { success: false, statusCode: 403, error: eligibility.reason };
    }

    // 2. Check if passenger already has an active ride in progress
    const activeRide = await Ride.findOne({
      passengerId,
      status: { $in: ['INITIATED', 'ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    });

    if (activeRide) {
      return {
        success: false,
        statusCode: 409,
        error: `Active ride [${activeRide.rideId}] is already in progress. Complete or resolve current trip first.`,
        ride: activeRide,
      };
    }

    // 3. Validate coordinates
    const coordValidation = locationService.validateCoordinates(payload.latitude, payload.longitude, payload.accuracy);
    if (!coordValidation.valid) {
      return { success: false, statusCode: 400, error: coordValidation.error };
    }

    // 4. Generate identifiers & pseudonym
    const rideId = this.generateRideId();
    const passengerPseudonym = await this.generateDailyPseudonym();
    const approximatePickupArea = this.getApproximatePickupArea(payload.latitude, payload.longitude);

    // 5. Create new Ride document
    const newRide = new Ride({
      rideId,
      passengerId: new Types.ObjectId(passengerId),
      passengerPseudonym,
      status: 'INITIATED',
      pickupLocation: {
        type: 'Point',
        coordinates: [payload.longitude, payload.latitude],
      },
      pickupLatitude: payload.latitude,
      pickupLongitude: payload.longitude,
      pickupAccuracy: payload.accuracy,
      approximatePickupArea,
      destinationText: payload.destinationText?.trim() || undefined,
      requestedAt: new Date(),
    });

    await newRide.save();

    return {
      success: true,
      statusCode: 201,
      message: 'Ride request created successfully.',
      ride: {
        id: newRide._id.toString(),
        rideId: newRide.rideId,
        passengerPseudonym: newRide.passengerPseudonym,
        status: newRide.status,
        approximatePickupArea: newRide.approximatePickupArea,
        pickupLatitude: newRide.pickupLatitude,
        pickupLongitude: newRide.pickupLongitude,
        pickupAccuracy: newRide.pickupAccuracy,
        destinationText: newRide.destinationText,
        requestedAt: newRide.requestedAt,
      },
    };
  }

  /**
   * Get pending ride requests for eligible drivers with privacy protection
   */
  public async getPendingRequestsForDriver(driverId: string) {
    // 1. Verify driver eligibility
    const eligibility = await locationService.verifyDriverEligibility(driverId);
    if (!eligibility.eligible) {
      return { success: false, statusCode: 403, error: eligibility.reason, requests: [] };
    }

    // 2. Automatically expire stale requests older than 15s timeout
    const timeoutCutoff = new Date(Date.now() - ACCEPTANCE_TIMEOUT_MS);
    await Ride.updateMany(
      { status: 'INITIATED', requestedAt: { $lt: timeoutCutoff } },
      { status: 'EXPIRED', cancellationReason: 'Acceptance window timed out (15s)' }
    );

    // 3. Fetch active pending requests
    const pendingRides = await Ride.find({
      status: 'INITIATED',
      requestedAt: { $gte: timeoutCutoff },
    })
      .sort({ requestedAt: -1 })
      .lean();

    // 4. Transform to privacy-protected view (approximate area only, no exact GPS before acceptance)
    const requests = pendingRides.map((r) => {
      const elapsedMs = Date.now() - new Date(r.requestedAt).getTime();
      const remainingMs = Math.max(0, ACCEPTANCE_TIMEOUT_MS - elapsedMs);

      return {
        id: r._id.toString(),
        rideId: r.rideId,
        passengerPseudonym: r.passengerPseudonym,
        approximatePickupArea: r.approximatePickupArea,
        destinationText: r.destinationText || 'Standard Drop-off',
        requestedAt: r.requestedAt,
        timeoutRemainingMs: Math.round(remainingMs),
      };
    });

    return {
      success: true,
      statusCode: 200,
      driverMode: eligibility.driver.driverMode,
      assignedVehicle: eligibility.vehicle ? eligibility.vehicle.shortVehicleNumber : null,
      requests,
    };
  }

  /**
   * Atomic First-Trigger-Wins Dispatch
   * Atomically assigns ride to first driver whose request arrives at backend
   */
  public async acceptRideAtomically(driverId: string, rideId: string) {
    // 1. Verify driver eligibility
    const eligibility = await locationService.verifyDriverEligibility(driverId);
    if (!eligibility.eligible || !eligibility.vehicle) {
      return { success: false, statusCode: 403, error: eligibility.reason };
    }

    const vehicle = eligibility.vehicle;
    const timeoutCutoff = new Date(Date.now() - ACCEPTANCE_TIMEOUT_MS);

    // 2. ATOMIC FIND & UPDATE: Must be INITIATED and within 15s window
    const acceptedRide = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        status: 'INITIATED',
        requestedAt: { $gte: timeoutCutoff },
      },
      {
        status: 'ACCEPTED',
        driverId: new Types.ObjectId(driverId),
        vehicleId: vehicle._id,
        garageId: vehicle.garageId || undefined,
        acceptedAt: new Date(),
      },
      { new: true }
    ).populate('driverId', 'name phone').lean();

    // 3. Handle race conditions or timeouts
    if (!acceptedRide) {
      const existing = await Ride.findById(rideId).lean();
      if (!existing) {
        return { success: false, statusCode: 404, error: 'Ride request not found.' };
      }
      if (existing.status === 'ACCEPTED' || existing.status === 'ACTIVE') {
        return {
          success: false,
          statusCode: 409,
          error: 'Ride dispatch claimed: another driver accepted this trip first.',
        };
      }
      return {
        success: false,
        statusCode: 410,
        error: 'Ride request expired: 15-second driver acceptance window elapsed.',
      };
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Ride successfully accepted!',
      ride: {
        id: acceptedRide._id.toString(),
        rideId: acceptedRide.rideId,
        passengerPseudonym: acceptedRide.passengerPseudonym,
        status: acceptedRide.status,
        pickupLatitude: acceptedRide.pickupLatitude,
        pickupLongitude: acceptedRide.pickupLongitude,
        pickupAccuracy: acceptedRide.pickupAccuracy,
        approximatePickupArea: acceptedRide.approximatePickupArea,
        destinationText: acceptedRide.destinationText,
        vehicleNumber: vehicle.shortVehicleNumber,
        acceptedAt: acceptedRide.acceptedAt,
      },
    };
  }

  /**
   * Driver starts active trip
   */
  public async startRide(driverId: string, rideId: string) {
    const ride = await Ride.findOne({
      _id: rideId,
      driverId,
      status: 'ACCEPTED',
    });

    if (!ride) {
      return { success: false, statusCode: 404, error: 'Accepted ride not found for this driver.' };
    }

    ride.status = 'ACTIVE';
    ride.startedAt = new Date();
    await ride.save();

    return {
      success: true,
      statusCode: 200,
      message: 'Trip is now ACTIVE.',
      ride,
    };
  }

  /**
   * Driver requests completion (Validated against vehicle GPS speed <= 10 km/h)
   */
  public async requestCompletion(driverId: string, rideId: string) {
    const ride = await Ride.findOne({
      _id: rideId,
      driverId,
      status: 'ACTIVE',
    });

    if (!ride) {
      return { success: false, statusCode: 404, error: 'Active trip not found for this driver.' };
    }

    // Check latest driver/vehicle GPS speed
    const driverLoc = await DriverLocation.findOne({ driverId }).lean();
    let currentSpeedKmh = 0;

    if (driverLoc && driverLoc.speed !== undefined) {
      currentSpeedKmh = driverLoc.speed * 3.6; // m/s to km/h
    }

    // Speed Validation Check: Must be <= 10 km/h
    if (currentSpeedKmh > MAX_COMPLETION_SPEED_KMH) {
      return {
        success: false,
        statusCode: 400,
        error: `Cannot request completion while moving. Vehicle speed is ${currentSpeedKmh.toFixed(1)} km/h (Must be ≤ 10 km/h).`,
      };
    }

    ride.status = 'WAITING_PASSENGER_CONFIRM';
    ride.completionRequestedAt = new Date();
    ride.lastValidatedSpeed = currentSpeedKmh;
    await ride.save();

    return {
      success: true,
      statusCode: 200,
      message: 'Completion requested. Waiting for passenger drop-off confirmation.',
      ride,
    };
  }

  /**
   * Passenger confirms drop-off (Official endCoordinates set from latest valid real-time GPS)
   */
  public async confirmCompletionByPassenger(passengerId: string, rideId: string) {
    const ride = await Ride.findOne({
      _id: rideId,
      passengerId,
      status: 'WAITING_PASSENGER_CONFIRM',
    });

    if (!ride) {
      return { success: false, statusCode: 404, error: 'Ride awaiting passenger confirmation not found.' };
    }

    // Get latest valid GPS coordinates from PassengerLocation or DriverLocation for official endCoordinates
    const passLoc = await PassengerLocation.findOne({ passengerId }).lean();
    const drivLoc = ride.driverId ? await DriverLocation.findOne({ driverId: ride.driverId }).lean() : null;

    const endLat = passLoc?.latitude ?? drivLoc?.latitude ?? ride.pickupLatitude;
    const endLng = passLoc?.longitude ?? drivLoc?.longitude ?? ride.pickupLongitude;

    ride.endCoordinates = {
      type: 'Point',
      coordinates: [endLng, endLat],
    };
    ride.endLatitude = endLat;
    ride.endLongitude = endLng;
    ride.status = 'COMPLETED';
    ride.completedAt = new Date();

    await ride.save();

    return {
      success: true,
      statusCode: 200,
      message: 'Trip completed successfully! Final GPS endCoordinates recorded.',
      ride: {
        id: ride._id.toString(),
        rideId: ride.rideId,
        status: ride.status,
        endLatitude: ride.endLatitude,
        endLongitude: ride.endLongitude,
        completedAt: ride.completedAt,
      },
    };
  }

  /**
   * Get active ride for authenticated passenger
   */
  public async getPassengerActiveRide(passengerId: string) {
    const ride = await Ride.findOne({
      passengerId,
      status: { $in: ['INITIATED', 'ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    })
      .populate('driverId', 'name phone')
      .populate('vehicleId', 'shortVehicleNumber registrationNumber modelName')
      .lean();

    return {
      success: true,
      ride: ride || null,
    };
  }

  /**
   * Get active ride for authenticated driver
   */
  public async getDriverActiveRide(driverId: string) {
    const ride = await Ride.findOne({
      driverId,
      status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    })
      .populate('passengerId', 'name phone')
      .populate('vehicleId', 'shortVehicleNumber registrationNumber')
      .lean();

    return {
      success: true,
      ride: ride || null,
    };
  }

  /**
   * Admin monitoring: Fetch all active rides
   */
  public async getAdminActiveRides() {
    const activeRides = await Ride.find({
      status: { $in: ['INITIATED', 'ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    })
      .populate('passengerId', 'name phone')
      .populate('driverId', 'name phone')
      .populate('vehicleId', 'shortVehicleNumber registrationNumber')
      .sort({ requestedAt: -1 })
      .lean();

    return {
      success: true,
      activeRides,
      totalActiveRides: activeRides.length,
    };
  }
}

export const rideService = new RideService();
