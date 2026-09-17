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
  targetVehicleId?: string;
  targetDriverId?: string;
}

export const MIN_ROUTE_DISTANCE_METERS = 15; // Minimum distance from last persisted point (15 meters)
export const MIN_HEADING_CHANGE_DEG = 25; // Minimum heading change for turn detection (25 degrees)
export const MIN_TURN_DISTANCE_METERS = 8; // Minimum distance required to record a turn (8 meters)
export const MAX_TIME_WITHOUT_UPDATE_MS = 30 * 1000; // Time threshold to persist point during movement (30 seconds)
export const MIN_TIME_DISTANCE_METERS = 5; // Minimum movement required even if 30s elapsed (5 meters)
export const MAX_GPS_ACCURACY_METERS = 30; // Max allowed GPS inaccuracy threshold (30 meters)
export const MAX_ROUTE_POINTS_PER_RIDE = 500; // Hard cap boundary to protect MongoDB document size limits

export class RideService {
  /**
   * Helper: Calculate Haversine distance in meters between two lat/lng points
   */
  public calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
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

  /**
   * Process & filter incoming driver GPS frame for active ride route history
   * Deterministic Filtering Strategy:
   * 1. Accuracy Filter: Ignores GPS readings > 30 meters accuracy.
   * 2. First Point: Start point persisted immediately.
   * 3. Distance Threshold: Persists if distance >= 15m from last point.
   * 4. Heading/Turn Threshold: Persists if heading change >= 25 deg AND distance >= 8m.
   * 5. Time Threshold: Persists if time elapsed >= 30s AND distance >= 5m.
   * 6. Stationary Noise Suppression: Ignores micro-drift < 5m when stationary.
   * 7. Duplicate/Out-of-Order: Rejects incoming timestamp <= last point timestamp.
   * 8. Max Safety Boundary: Caps routePoints array at 500 points (~20 KB max).
   */
  public async processActiveRideTelemetry(driverId: string, payload: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: Date | string;
  }) {
    // 1. Accuracy Filter
    if (payload.accuracy !== undefined && payload.accuracy > MAX_GPS_ACCURACY_METERS) {
      return { persisted: false, reason: `Accuracy [${payload.accuracy}m] exceeds max threshold [${MAX_GPS_ACCURACY_METERS}m]` };
    }

    // 2. Find active ride for driver
    const ride = await Ride.findOne({
      driverId,
      status: 'ACTIVE',
    });

    if (!ride) {
      return { persisted: false, reason: 'No active ride found for driver.' };
    }

    const incomingTs = payload.timestamp ? new Date(payload.timestamp) : new Date();
    if (isNaN(incomingTs.getTime())) return { persisted: false, error: 'Invalid timestamp' };

    const routePoints = ride.routePoints || [];

    // Rule 1: First point (start of active trip) -> Persist immediately
    if (routePoints.length === 0) {
      const startPoint = {
        coordinates: [payload.longitude, payload.latitude] as [number, number],
        timestamp: incomingTs,
        accuracy: payload.accuracy,
        speed: payload.speed,
        heading: payload.heading,
      };
      ride.routePoints = [startPoint];
      ride.routePointCount = 1;
      ride.distanceMeters = 0;
      await ride.save();
      return { persisted: true, reason: 'Trip start point persisted', routePointCount: 1, distanceMeters: 0 };
    }

    // Rule 8: Safety boundary cap
    if (routePoints.length >= MAX_ROUTE_POINTS_PER_RIDE) {
      return { persisted: false, reason: 'Max route points safety cap reached (500 points max)' };
    }

    const lastPoint = routePoints[routePoints.length - 1];
    const lastLng = lastPoint.coordinates[0];
    const lastLat = lastPoint.coordinates[1];

    // Rule 7: Duplicate / Out-of-order timestamp protection
    const lastTs = new Date(lastPoint.timestamp).getTime();
    if (incomingTs.getTime() <= lastTs) {
      return { persisted: false, reason: 'Out-of-order or duplicate timestamp rejected' };
    }

    // Calculate distance from last persisted point
    const distMeters = this.calculateHaversineDistanceMeters(lastLat, lastLng, payload.latitude, payload.longitude);

    // Rule 6: Stationary noise filter -> Ignore micro-drift < 5 meters
    if (distMeters < 5) {
      return { persisted: false, reason: 'Stationary GPS noise filtered (< 5m)' };
    }

    // Check heading change for turn detection
    let headingDiff = 0;
    if (payload.heading !== undefined && lastPoint.heading !== undefined) {
      headingDiff = Math.abs(payload.heading - lastPoint.heading);
      if (headingDiff > 180) headingDiff = 360 - headingDiff;
    }

    const timeDiffMs = incomingTs.getTime() - lastTs;

    // Evaluate Deterministic Filtering Criteria
    const isSignificantMove = distMeters >= MIN_ROUTE_DISTANCE_METERS;
    const isSignificantTurn = headingDiff >= MIN_HEADING_CHANGE_DEG && distMeters >= MIN_TURN_DISTANCE_METERS;
    const isTimeThresholdMet = timeDiffMs >= MAX_TIME_WITHOUT_UPDATE_MS && distMeters >= MIN_TIME_DISTANCE_METERS;

    if (!isSignificantMove && !isSignificantTurn && !isTimeThresholdMet) {
      return { persisted: false, reason: 'Telemetry point does not satisfy movement/heading/time criteria' };
    }

    // Persist new route point & update accumulated distance
    const newPoint = {
      coordinates: [payload.longitude, payload.latitude] as [number, number],
      timestamp: incomingTs,
      accuracy: payload.accuracy,
      speed: payload.speed,
      heading: payload.heading,
    };

    const newDistance = Math.round((ride.distanceMeters || 0) + distMeters);
    routePoints.push(newPoint);
    ride.routePoints = routePoints;
    ride.routePointCount = routePoints.length;
    ride.distanceMeters = newDistance;
    await ride.save();

    return {
      persisted: true,
      reason: isSignificantTurn ? 'Significant turn detected' : isSignificantMove ? 'Significant movement detected' : 'Time threshold met',
      routePointCount: routePoints.length,
      distanceMeters: newDistance,
      addedDistanceMeters: Math.round(distMeters),
    };
  }
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

    // 5. Handle targeted request vehicle & driver validation
    let targetVehicleObjectId: Types.ObjectId | undefined;
    let targetDriverObjectId: Types.ObjectId | undefined;
    let isTargeted = false;

    if (payload.targetVehicleId && Types.ObjectId.isValid(payload.targetVehicleId)) {
      targetVehicleObjectId = new Types.ObjectId(payload.targetVehicleId);
      isTargeted = true;
    }
    if (payload.targetDriverId && Types.ObjectId.isValid(payload.targetDriverId)) {
      targetDriverObjectId = new Types.ObjectId(payload.targetDriverId);
      isTargeted = true;
    }

    // 6. Create new Ride document
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
      targetVehicleId: targetVehicleObjectId,
      targetDriverId: targetDriverObjectId,
      isTargeted,
      requestedAt: new Date(),
    });

    await newRide.save();

    return {
      success: true,
      statusCode: 201,
      message: isTargeted ? 'Targeted ride request sent to selected rickshaw driver.' : 'Ride request created successfully.',
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
        isTargeted: newRide.isTargeted,
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

    // 3. Fetch active pending requests (filtering targeted requests to ONLY the targeted driver)
    const driverObjectId = new Types.ObjectId(driverId);
    const pendingRides = await Ride.find({
      status: 'INITIATED',
      requestedAt: { $gte: timeoutCutoff },
      $or: [
        { isTargeted: { $ne: true } },
        { targetDriverId: driverObjectId },
        { targetDriverId: { $exists: false } },
      ],
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
        isTargeted: r.isTargeted,
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
   * Driver declines a pending ride dispatch request
   */
  public async declineDriverRide(driverId: string, rideId: string) {
    const ride = await Ride.findOne({
      _id: rideId,
      status: 'INITIATED',
    });

    if (!ride) {
      return { success: false, statusCode: 404, error: 'Pending ride request not found.' };
    }

    ride.status = 'DECLINED';
    ride.declinedAt = new Date();
    ride.cancellationReason = 'Declined by targeted driver';
    await ride.save();

    return {
      success: true,
      statusCode: 200,
      message: 'Ride request declined.',
    };
  }

  /**
   * Passenger cancels an initiated or accepted ride request before active trip
   */
  public async cancelPassengerRide(passengerId: string, rideId: string, reason?: string) {
    const ride = await Ride.findOne({
      _id: rideId,
      passengerId,
      status: { $in: ['INITIATED', 'ACCEPTED'] },
    });

    if (!ride) {
      return { success: false, statusCode: 404, error: 'Active ride request eligible for cancellation not found.' };
    }

    ride.status = 'CANCELLED';
    ride.cancelledAt = new Date();
    ride.cancellationReason = reason || 'Cancelled by passenger';
    await ride.save();

    return {
      success: true,
      statusCode: 200,
      message: 'Ride request cancelled successfully.',
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

    // Check if driver is already engaged in an active trip
    const existingDriverActiveRide = await Ride.findOne({
      driverId,
      status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    });

    if (existingDriverActiveRide) {
      return {
        success: false,
        statusCode: 409,
        error: `Driver is already engaged in active trip [${existingDriverActiveRide.rideId}]. Finish current trip before accepting new rides.`,
      };
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

    // Finalize journey route telemetry: append official dropoff point as closing point
    const routePoints = ride.routePoints || [];
    if (routePoints.length > 0) {
      const lastPoint = routePoints[routePoints.length - 1];
      const dist = this.calculateHaversineDistanceMeters(lastPoint.coordinates[1], lastPoint.coordinates[0], endLat, endLng);
      if (dist >= 1) {
        routePoints.push({
          coordinates: [endLng, endLat],
          timestamp: new Date(),
          accuracy: passLoc?.accuracy || drivLoc?.accuracy,
        });
        ride.routePoints = routePoints;
        ride.routePointCount = routePoints.length;
        ride.distanceMeters = Math.round((ride.distanceMeters || 0) + dist);
      }
    }

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
   * Get active ride for authenticated passenger (with live driver location telemetry)
   */
  public async getPassengerActiveRide(passengerId: string) {
    const ride = await Ride.findOne({
      passengerId,
      status: { $in: ['INITIATED', 'ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    })
      .populate('driverId', 'name phone')
      .populate('vehicleId', 'shortVehicleNumber registrationNumber modelName')
      .lean();

    if (!ride) {
      return { success: true, ride: null };
    }

    let driverLocation: any = null;
    if (ride.driverId) {
      const driverId = (ride.driverId as any)._id || ride.driverId;
      const dLoc = await DriverLocation.findOne({ driverId }).lean();
      if (dLoc) {
        driverLocation = {
          latitude: dLoc.latitude,
          longitude: dLoc.longitude,
          accuracy: dLoc.accuracy,
          speed: dLoc.speed,
          heading: dLoc.heading,
          status: dLoc.status,
          updatedAt: dLoc.timestamp || dLoc.updatedAt,
        };
      }
    }

    return {
      success: true,
      ride: {
        ...ride,
        id: ride._id.toString(),
        driverLocation,
      },
    };
  }

  /**
   * Get active ride for authenticated driver (with live passenger location telemetry ONLY when trip is ACTIVE/ENDING)
   */
  public async getDriverActiveRide(driverId: string) {
    const ride = await Ride.findOne({
      driverId,
      status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    })
      .populate('passengerId', 'name phone')
      .populate('vehicleId', 'shortVehicleNumber registrationNumber')
      .lean();

    if (!ride) {
      return { success: true, ride: null };
    }

    let passengerLocation: any = null;
    // PRIVACY RULE: Share exact passenger live GPS ONLY when trip is ACTIVE or WAITING_PASSENGER_CONFIRM
    if (ride.status === 'ACTIVE' || ride.status === 'WAITING_PASSENGER_CONFIRM') {
      const passengerId = (ride.passengerId as any)._id || ride.passengerId;
      const pLoc = await PassengerLocation.findOne({ passengerId }).lean();
      if (pLoc) {
        passengerLocation = {
          latitude: pLoc.latitude,
          longitude: pLoc.longitude,
          accuracy: pLoc.accuracy,
          speed: pLoc.speed,
          heading: pLoc.heading,
          status: pLoc.status,
          updatedAt: pLoc.timestamp || pLoc.updatedAt,
        };
      }
    }

    return {
      success: true,
      ride: {
        ...ride,
        id: ride._id.toString(),
        passengerLocation,
      },
    };
  }

  /**
   * 3-Minute Admin Fallback: Check unconfirmed completion requests
   * If status is WAITING_PASSENGER_CONFIRM, completionRequestedAt > 3 mins ago, speed <= 10 km/h,
   * and no active safety alarm is present, flag ride with isAdminReviewPending: true.
   */
  public async checkUnconfirmedRidesFallback() {
    const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);
    const unconfirmedRides = await Ride.find({
      status: 'WAITING_PASSENGER_CONFIRM',
      completionRequestedAt: { $lte: threeMinsAgo },
      isAdminReviewPending: { $ne: true },
    });

    for (const ride of unconfirmedRides) {
      try {
        const { SafetyEvent } = require('../models/SafetyEvent');
        const activeSafety = await SafetyEvent.findOne({
          rideId: ride._id,
          status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
        });

        if (!activeSafety) {
          ride.isAdminReviewPending = true;
          ride.adminReviewReason = 'UNCONFIRMED_DROPOFF_3MIN_TIMEOUT';
          await ride.save();
        }
      } catch (err) {
        console.error('Error in checkUnconfirmedRidesFallback:', err);
      }
    }
  }

  /**
   * Admin monitoring: Fetch all active rides & fallback review rides
   */
  public async getAdminActiveRides() {
    await this.checkUnconfirmedRidesFallback();

    const activeRides = await Ride.find({
      $or: [
        { status: { $in: ['INITIATED', 'ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] } },
        { isAdminReviewPending: true },
      ],
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
