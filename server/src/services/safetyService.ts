import { Types } from 'mongoose';
import { SafetyEvent, ISafetyEvent, SafetySeverity, SafetyEventType } from '../models/SafetyEvent';
import { Ride } from '../models/Ride';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { DriverLocation } from '../models/DriverLocation';
import { PassengerLocation } from '../models/PassengerLocation';
import { passengerLocationService } from './passengerLocationService';
import { auditService } from './auditService';
import { smsService } from './smsService';

export interface LocationPayload {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export class SafetyService {
  /**
   * Helper: Generate short human-readable Safety Event ID e.g. SAFE-8910
   */
  private generateEventId(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `SAFE-${randomNum}`;
  }

  /**
   * Core verification helper: Validate authenticated passenger & legitimate active ride
   */
  public async verifyActivePassengerRide(passengerId: string, clientRideId?: string) {
    const eligibility = await passengerLocationService.verifyPassengerEligibility(passengerId);
    if (!eligibility.eligible) {
      return { valid: false, statusCode: 403, error: eligibility.reason };
    }

    const query: any = {
      passengerId: new Types.ObjectId(passengerId),
      status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
    };

    if (clientRideId) {
      // Validate client-supplied rideId against database
      if (Types.ObjectId.isValid(clientRideId)) {
        query._id = new Types.ObjectId(clientRideId);
      } else {
        query.rideId = clientRideId;
      }
    }

    const ride = await Ride.findOne(query)
      .populate('passengerId', 'name phone')
      .populate('driverId', 'name phone')
      .populate('vehicleId', 'shortVehicleNumber registrationNumber qrIdentifier')
      .exec();

    if (!ride) {
      return {
        valid: false,
        statusCode: 404,
        error: 'No active, authorized ride found for this passenger.',
      };
    }

    return { valid: true, ride, passenger: eligibility.passenger };
  }

  /**
   * 1. Trigger Yellow Safety Alert
   */
  public async triggerYellowAlert(passengerId: string, clientRideId?: string, locationPayload?: LocationPayload) {
    const check = await this.verifyActivePassengerRide(passengerId, clientRideId);
    if (!check.valid || !check.ride) {
      return { success: false, statusCode: check.statusCode || 400, error: check.error };
    }

    const ride = check.ride;
    const passenger = check.passenger;

    // Fetch latest valid passenger GPS
    const passLoc = await PassengerLocation.findOne({ passengerId }).lean();
    const passLat = locationPayload?.latitude ?? passLoc?.latitude ?? ride.pickupLatitude;
    const passLng = locationPayload?.longitude ?? passLoc?.longitude ?? ride.pickupLongitude;

    // Fetch latest driver/vehicle GPS if available
    let drivLat: number | undefined;
    let drivLng: number | undefined;
    if (ride.driverId) {
      const drivLoc = await DriverLocation.findOne({ driverId: ride.driverId._id || ride.driverId }).lean();
      if (drivLoc) {
        drivLat = drivLoc.latitude;
        drivLng = drivLoc.longitude;
      }
    }

    const eventId = this.generateEventId();
    const driverUser = ride.driverId as any;
    const vehicleObj = ride.vehicleId as any;

    // Send Yellow SMS
    const smsRes = await smsService.sendSafetySms({
      severity: 'YELLOW',
      rideId: ride.rideId,
      passengerName: passenger?.name || 'Passenger',
      passengerPhone: passenger?.phone || 'N/A',
      driverName: driverUser?.name,
      driverPhone: driverUser?.phone,
      vehicleIdentifier: vehicleObj?.shortVehicleNumber || vehicleObj?.registrationNumber,
      qrIdentifier: vehicleObj?.qrIdentifier,
      latitude: passLat,
      longitude: passLng,
    });

    const newEvent = new SafetyEvent({
      eventId,
      rideId: ride._id,
      reportedBy: new Types.ObjectId(passengerId),
      passengerId: new Types.ObjectId(passengerId),
      driverId: ride.driverId ? (ride.driverId as any)._id || ride.driverId : undefined,
      vehicleId: ride.vehicleId ? (ride.vehicleId as any)._id || ride.vehicleId : undefined,
      garageId: ride.garageId,
      severity: 'YELLOW',
      eventType: 'SAFETY_ALERT',
      status: 'ACTIVE',
      passengerLocation: {
        type: 'Point',
        coordinates: [passLng, passLat],
      },
      passengerLatitude: passLat,
      passengerLongitude: passLng,
      driverLocation: drivLat !== undefined && drivLng !== undefined ? {
        type: 'Point',
        coordinates: [drivLng, drivLat],
      } : undefined,
      driverLatitude: drivLat,
      driverLongitude: drivLng,
      isEmergency: false,
      smsStatus: smsRes.status,
      description: 'Passenger activated Yellow Safety Alert during active trip',
      timestamp: new Date(),
    });

    await newEvent.save();

    // Log to Audit Log
    await auditService.logAction({
      actorId: passengerId,
      action: 'SAFETY_ALERT_YELLOW_TRIGGERED',
      entity: 'SafetyEvent',
      entityId: newEvent._id.toString(),
      metadata: {
        eventId,
        rideId: ride.rideId,
        passengerName: passenger?.name,
        driverName: driverUser?.name,
        smsStatus: smsRes.status,
      },
    });

    return {
      success: true,
      statusCode: 201,
      message: 'Yellow Safety Alert registered successfully.',
      event: newEvent,
    };
  }

  /**
   * 2. Trigger Red Emergency SOS
   */
  public async triggerRedSOS(passengerId: string, clientRideId?: string, locationPayload?: LocationPayload) {
    const check = await this.verifyActivePassengerRide(passengerId, clientRideId);
    if (!check.valid || !check.ride) {
      return { success: false, statusCode: check.statusCode || 400, error: check.error };
    }

    const ride = check.ride;
    const passenger = check.passenger;

    // Fetch latest valid passenger GPS
    const passLoc = await PassengerLocation.findOne({ passengerId }).lean();
    const passLat = locationPayload?.latitude ?? passLoc?.latitude ?? ride.pickupLatitude;
    const passLng = locationPayload?.longitude ?? passLoc?.longitude ?? ride.pickupLongitude;

    // Fetch latest driver/vehicle GPS if available
    let drivLat: number | undefined;
    let drivLng: number | undefined;
    if (ride.driverId) {
      const drivLoc = await DriverLocation.findOne({ driverId: ride.driverId._id || ride.driverId }).lean();
      if (drivLoc) {
        drivLat = drivLoc.latitude;
        drivLng = drivLoc.longitude;
      }
    }

    // Query nearby active users within 500 meters
    const nearbyRes = await this.findNearbyActiveUsers(passLat, passLng, 500);

    const eventId = this.generateEventId();
    const driverUser = ride.driverId as any;
    const vehicleObj = ride.vehicleId as any;

    // Send Red Emergency SMS
    const smsRes = await smsService.sendSafetySms({
      severity: 'RED',
      rideId: ride.rideId,
      passengerName: passenger?.name || 'Passenger',
      passengerPhone: passenger?.phone || 'N/A',
      driverName: driverUser?.name,
      driverPhone: driverUser?.phone,
      vehicleIdentifier: vehicleObj?.shortVehicleNumber || vehicleObj?.registrationNumber,
      qrIdentifier: vehicleObj?.qrIdentifier,
      latitude: passLat,
      longitude: passLng,
    });

    const newEvent = new SafetyEvent({
      eventId,
      rideId: ride._id,
      reportedBy: new Types.ObjectId(passengerId),
      passengerId: new Types.ObjectId(passengerId),
      driverId: ride.driverId ? (ride.driverId as any)._id || ride.driverId : undefined,
      vehicleId: ride.vehicleId ? (ride.vehicleId as any)._id || ride.vehicleId : undefined,
      garageId: ride.garageId,
      severity: 'RED',
      eventType: 'SOS_ALERT',
      status: 'ACTIVE',
      passengerLocation: {
        type: 'Point',
        coordinates: [passLng, passLat],
      },
      passengerLatitude: passLat,
      passengerLongitude: passLng,
      driverLocation: drivLat !== undefined && drivLng !== undefined ? {
        type: 'Point',
        coordinates: [drivLng, drivLat],
      } : undefined,
      driverLatitude: drivLat,
      driverLongitude: drivLng,
      isEmergency: true,
      smsStatus: smsRes.status,
      nearbyUsersCount: nearbyRes.totalNearby,
      description: 'CRITICAL RED EMERGENCY SOS TRIGGERED BY PASSENGER',
      timestamp: new Date(),
    });

    await newEvent.save();

    // Log to Audit Log
    await auditService.logAction({
      actorId: passengerId,
      action: 'SAFETY_ALERT_RED_SOS_TRIGGERED',
      entity: 'SafetyEvent',
      entityId: newEvent._id.toString(),
      metadata: {
        eventId,
        rideId: ride.rideId,
        passengerName: passenger?.name,
        driverName: driverUser?.name,
        nearbyUsersCount: nearbyRes.totalNearby,
        smsStatus: smsRes.status,
      },
    });

    return {
      success: true,
      statusCode: 201,
      message: 'RED Emergency SOS activated! Operations and nearby response teams notified.',
      event: newEvent,
      nearbyUsersCount: nearbyRes.totalNearby,
    };
  }

  /**
   * 3. Passenger Unilateral Safety Override & Ride Termination
   */
  public async passengerUnilateralOverride(passengerId: string, clientRideId?: string, reason?: string) {
    const check = await this.verifyActivePassengerRide(passengerId, clientRideId);
    if (!check.valid || !check.ride) {
      return { success: false, statusCode: check.statusCode || 400, error: check.error };
    }

    const ride = check.ride;
    const overrideReason = reason ? `PASSENGER_SAFETY_OVERRIDE: ${reason}` : 'PASSENGER_UNILATERAL_SAFETY_OVERRIDE';

    ride.status = 'CANCELLED';
    ride.cancelledAt = new Date();
    ride.cancellationReason = overrideReason;
    await ride.save();

    // Create a safety event record for audit history
    const eventId = this.generateEventId();
    const newEvent = new SafetyEvent({
      eventId,
      rideId: ride._id,
      reportedBy: new Types.ObjectId(passengerId),
      passengerId: new Types.ObjectId(passengerId),
      driverId: ride.driverId ? (ride.driverId as any)._id || ride.driverId : undefined,
      vehicleId: ride.vehicleId ? (ride.vehicleId as any)._id || ride.vehicleId : undefined,
      garageId: ride.garageId,
      severity: 'YELLOW',
      eventType: 'PASSENGER_ABORT',
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNotes: 'Passenger exercised unilateral safety override to abort tracking and terminate ride.',
      description: overrideReason,
      timestamp: new Date(),
    });

    await newEvent.save();

    await auditService.logAction({
      actorId: passengerId,
      action: 'PASSENGER_SAFETY_OVERRIDE_TERMINATE',
      entity: 'Ride',
      entityId: ride._id.toString(),
      metadata: {
        rideId: ride.rideId,
        cancellationReason: overrideReason,
        eventId,
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Ride safely terminated by passenger override.',
      ride,
    };
  }

  /**
   * 4. Find nearby active users within 500m radius (MongoDB geospatial query)
   */
  public async findNearbyActiveUsers(latitude: number, longitude: number, radiusMeters: number = 500) {
    const [nearbyPassengers, nearbyDrivers] = await Promise.all([
      PassengerLocation.find({
        status: 'LOCATION_ACTIVE',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusMeters,
          },
        },
      }).select('passengerId latitude longitude timestamp').lean(),
      DriverLocation.find({
        status: 'LOCATION_ACTIVE',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusMeters,
          },
        },
      }).select('driverId vehicleId latitude longitude timestamp').lean(),
    ]);

    return {
      success: true,
      radiusMeters,
      passengersCount: nearbyPassengers.length,
      driversCount: nearbyDrivers.length,
      totalNearby: nearbyPassengers.length + nearbyDrivers.length,
    };
  }

  /**
   * 5. Admin Acknowledge Safety Event
   */
  public async acknowledgeSafetyEvent(adminId: string, eventId: string) {
    let query: any = { eventId };
    if (Types.ObjectId.isValid(eventId)) {
      query = { $or: [{ _id: new Types.ObjectId(eventId) }, { eventId }] };
    }

    const event = await SafetyEvent.findOne(query);
    if (!event) {
      return { success: false, statusCode: 404, error: 'Safety event not found.' };
    }

    event.status = 'ACKNOWLEDGED';
    event.acknowledgedAt = new Date();
    event.acknowledgedBy = new Types.ObjectId(adminId);
    await event.save();

    await auditService.logAction({
      actorId: adminId,
      action: 'ADMIN_SAFETY_ALERT_ACKNOWLEDGED',
      entity: 'SafetyEvent',
      entityId: event._id.toString(),
      metadata: { eventId: event.eventId, severity: event.severity },
    });

    return { success: true, statusCode: 200, message: 'Safety event acknowledged by Admin.', event };
  }

  /**
   * 6. Admin Resolve Safety Event
   */
  public async resolveSafetyEvent(adminId: string, eventId: string, notes?: string) {
    let query: any = { eventId };
    if (Types.ObjectId.isValid(eventId)) {
      query = { $or: [{ _id: new Types.ObjectId(eventId) }, { eventId }] };
    }

    const event = await SafetyEvent.findOne(query);
    if (!event) {
      return { success: false, statusCode: 404, error: 'Safety event not found.' };
    }

    event.status = 'RESOLVED';
    event.resolvedAt = new Date();
    event.resolvedBy = new Types.ObjectId(adminId);
    event.resolutionNotes = notes || 'Resolved after admin operational investigation.';
    await event.save();

    await auditService.logAction({
      actorId: adminId,
      action: 'ADMIN_SAFETY_ALERT_RESOLVED',
      entity: 'SafetyEvent',
      entityId: event._id.toString(),
      metadata: { eventId: event.eventId, severity: event.severity, notes },
    });

    return { success: true, statusCode: 200, message: 'Safety event marked as RESOLVED.', event };
  }

  /**
   * 7. Fetch all active safety events for Admin Command Center
   */
  public async getActiveSafetyEvents() {
    const events = await SafetyEvent.find({
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
    })
      .populate('passengerId', 'name phone')
      .populate('driverId', 'name phone')
      .populate('vehicleId', 'shortVehicleNumber registrationNumber')
      .populate('rideId', 'rideId status passengerPseudonym approximatePickupArea')
      .sort({ timestamp: -1 })
      .lean();

    const redCount = events.filter((e) => e.severity === 'RED').length;
    const yellowCount = events.filter((e) => e.severity === 'YELLOW').length;

    return {
      success: true,
      totalActiveEvents: events.length,
      redCount,
      yellowCount,
      events,
    };
  }
}

export const safetyService = new SafetyService();
