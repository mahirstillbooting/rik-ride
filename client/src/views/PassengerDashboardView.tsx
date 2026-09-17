import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { Icon } from '../components/ui/Icon';
import { RealMapContainer } from '../components/ui/RealMapContainer';
import { spacing, borderRadius } from '../theme/spacing';
import { passengerLocationApiService, NearbyRickshaw } from '../services/passengerLocationService';
import { SharingStatus } from '../services/locationService';
import { clientRideService, RideData } from '../services/rideService';
import { clientSafetyService } from '../services/safetyService';

export const PassengerDashboardView: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Core Location & Permission States (Unified Source of Truth)
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>('LOCATION_OFF');
  const [isSharing, setIsSharing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'Granted' | 'Denied' | 'Not requested'>('Not requested');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [startingSharing, setStartingSharing] = useState(false);
  const [currentLoc, setCurrentLoc] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
    source?: string;
  } | null>(null);
  const [lastUpdateTs, setLastUpdateTs] = useState<Date | null>(null);

  // Discovery Radar States
  const [nearbyRickshaws, setNearbyRickshaws] = useState<NearbyRickshaw[]>([]);

  // Dev Location Simulator States
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [simLat, setSimLat] = useState('23.8103');
  const [simLng, setSimLng] = useState('90.4125');
  const [simAccuracy, setSimAccuracy] = useState('10');

  // Ride Request & Lifecycle States
  const [destinationText, setDestinationText] = useState('');
  const [requestingRide, setRequestingRide] = useState(false);
  const [activeRide, setActiveRide] = useState<RideData | null>(null);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);

  // Safety & Emergency Command States
  const [yellowLoading, setYellowLoading] = useState(false);
  const [redLoading, setRedLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [showRedConfirmModal, setShowRedConfirmModal] = useState(false);
  const [showEmergencyCallModal, setShowEmergencyCallModal] = useState(false);
  const [isHighFrequencyTracking, setIsHighFrequencyTracking] = useState(false);

  // Tracking refs
  const watchIdRef = useRef<number | null>(null);
  const lastSentTsRef = useRef<number>(0);
  const autoPromptedRef = useRef<boolean>(false);

  // Sync initial location status from backend
  const syncLocationStatus = useCallback(async () => {
    const res = await passengerLocationApiService.getStatus();
    if (res.success) {
      if (res.sharingStatus) {
        setSharingStatus(res.sharingStatus);
        setIsSharing(res.sharingStatus === 'LOCATION_ACTIVE');
      }
      if (res.lastLocation) {
        setCurrentLoc(res.lastLocation);
        setLastUpdateTs(new Date(res.lastLocation.timestamp));
      }
    }
  }, []);

  // Poll active passenger ride status
  const pollActiveRide = useCallback(async () => {
    const res = await clientRideService.getPassengerActiveRide();
    if (res.success) {
      setActiveRide(res.ride);
      if (!res.ride) {
        setIsHighFrequencyTracking(false);
      }
    }
  }, []);

  // Poll nearby available rickshaws for Discovery Radar (every 5 seconds)
  const fetchNearbyRickshaws = useCallback(async () => {
    const lat = currentLoc?.latitude;
    const lng = currentLoc?.longitude;
    const res = await passengerLocationApiService.getNearbyAvailableRickshaws(lat, lng, 2);
    if (res.success && res.rickshaws) {
      setNearbyRickshaws(res.rickshaws);
    }
  }, [currentLoc]);

  useEffect(() => {
    syncLocationStatus();
    pollActiveRide();
    fetchNearbyRickshaws();

    const rideInterval = setInterval(() => {
      pollActiveRide();
    }, 3000);

    const radarInterval = setInterval(() => {
      fetchNearbyRickshaws();
    }, 5000);

    return () => {
      clearInterval(rideInterval);
      clearInterval(radarInterval);
    };
  }, [syncLocationStatus, pollActiveRide, fetchNearbyRickshaws]);

  // Location update handler with high-frequency support during emergency
  const sendLocationUpdate = useCallback(
    async (
      lat: number,
      lng: number,
      accuracy?: number,
      speed?: number,
      heading?: number,
      source: 'DEVICE_GPS' | 'SIMULATED' = 'DEVICE_GPS',
      force: boolean = false
    ) => {
      const now = Date.now();
      const minInterval = isHighFrequencyTracking ? 1800 : 4500;
      if (!force && now - lastSentTsRef.current < minInterval) {
        return;
      }
      lastSentTsRef.current = now;

      const payload = {
        latitude: lat,
        longitude: lng,
        accuracy,
        speed,
        heading,
        source,
        timestamp: new Date().toISOString(),
      };

      const res = await passengerLocationApiService.updateLocation(payload);
      if (res.success) {
        setCurrentLoc({
          latitude: lat,
          longitude: lng,
          accuracy,
          speed,
          heading,
          timestamp: res.timestamp || payload.timestamp,
          source,
        });
        setLastUpdateTs(new Date());
        setSharingStatus('LOCATION_ACTIVE');
        setLocationError(null);
      } else {
        if (res.error?.includes('Stale location')) {
          console.warn('Passenger location update rejected as stale:', res.error);
        } else {
          setLocationError(res.error || 'Failed to sync location');
        }
      }
    },
    [isHighFrequencyTracking]
  );

  // Start Live Location Sharing
  const handleStartSharing = useCallback(async () => {
    setStartingSharing(true);
    setLocationError(null);

    const res = await passengerLocationApiService.startSharing();
    setStartingSharing(false);

    if (!res.success) {
      setLocationError(res.error || 'Location initialization failed');
      return;
    }

    setIsSharing(true);
    setSharingStatus('LOCATION_ACTIVE');

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            setPermissionStatus('Granted');
            sendLocationUpdate(
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.accuracy,
              pos.coords.speed || undefined,
              pos.coords.heading || undefined,
              'DEVICE_GPS'
            );
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setPermissionStatus('Denied');
              setSharingStatus('LOCATION_OFF');
            }
            setLocationError(`Location notice: ${err.message}`);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
        watchIdRef.current = id;
      } catch (e: any) {
        console.warn('Failed to attach watchPosition:', e);
      }
    }
  }, [sendLocationUpdate]);

  // Automatic Location Request on Mount
  useEffect(() => {
    if (autoPromptedRef.current) return;
    autoPromptedRef.current = true;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPermissionStatus('Granted');
          handleStartSharing();
          sendLocationUpdate(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
            pos.coords.speed || undefined,
            pos.coords.heading || undefined,
            'DEVICE_GPS',
            true
          );
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionStatus('Denied');
          } else {
            setPermissionStatus('Not requested');
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    }
  }, [handleStartSharing, sendLocationUpdate]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Dev Simulator trigger
  const handleSimulatedUpdate = () => {
    const lat = parseFloat(simLat);
    const lng = parseFloat(simLng);
    const acc = parseFloat(simAccuracy) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      showToast('Please enter valid numeric latitude and longitude', 'warning');
      return;
    }

    sendLocationUpdate(lat, lng, acc, 0, 0, 'SIMULATED', true);
    showToast(`Simulated location set: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'success');
  };

  // Create Targeted Ride Request for specific discovered Rickshaw
  const handleTargetedRideRequest = useCallback(
    async (rickshaw: NearbyRickshaw) => {
      if (!currentLoc || sharingStatus !== 'LOCATION_ACTIVE') {
        showToast('Location active required to request pickup.', 'warning');
        return;
      }

      setRequestingRide(true);
      const res = await clientRideService.createRideRequest({
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
        accuracy: currentLoc.accuracy,
        destinationText: destinationText.trim() || undefined,
        targetVehicleId: rickshaw.vehicleId,
        targetDriverId: rickshaw.assignedDriverId || rickshaw.driverId,
      });
      setRequestingRide(false);

      if (res.success && res.ride) {
        setActiveRide(res.ride);
        showToast(
          `Targeted ride request dispatched directly to Rickshaw ${rickshaw.shortVehicleNumber} (${rickshaw.driverName})!`,
          'success'
        );
      } else {
        showToast(res.error || 'Failed to dispatch targeted ride request', 'danger');
      }
    },
    [currentLoc, sharingStatus, destinationText, showToast]
  );

  // Create Generic Ride Request
  const handleRequestRide = async () => {
    if (!currentLoc || sharingStatus !== 'LOCATION_ACTIVE') {
      showToast('Location active required to request pickup.', 'warning');
      return;
    }

    setRequestingRide(true);
    const res = await clientRideService.createRideRequest({
      latitude: currentLoc.latitude,
      longitude: currentLoc.longitude,
      accuracy: currentLoc.accuracy,
      destinationText: destinationText.trim() || undefined,
    });
    setRequestingRide(false);

    if (res.success && res.ride) {
      setActiveRide(res.ride);
      showToast(`Ride requested successfully! (${res.ride.passengerPseudonym})`, 'success');
    } else {
      showToast(res.error || 'Failed to request ride', 'danger');
    }
  };

  // Cancel Ride Request
  const [cancellingRide, setCancellingRide] = useState(false);
  const handleCancelRide = async () => {
    if (!activeRide) return;
    setCancellingRide(true);
    const res = await clientRideService.cancelPassengerRide(activeRide.id, 'Cancelled by passenger');
    setCancellingRide(false);

    if (res.success) {
      showToast('Ride request cancelled.', 'info');
      setActiveRide(null);
      pollActiveRide();
    } else {
      showToast(res.error || 'Failed to cancel ride request', 'danger');
    }
  };

  // Confirm Ride Drop-off Completion
  const handleConfirmCompletion = async () => {
    if (!activeRide) return;

    setConfirmingCompletion(true);
    const res = await clientRideService.confirmPassengerCompletion(activeRide.id);
    setConfirmingCompletion(false);

    if (res.success) {
      showToast('Drop-off confirmed! Trip completed successfully.', 'success');
      setActiveRide(null);
      setIsHighFrequencyTracking(false);
      pollActiveRide();
    } else {
      showToast(res.error || 'Failed to confirm drop-off', 'danger');
    }
  };

  // --- SAFETY SYSTEM HANDLERS ---

  const handleYellowAlert = async () => {
    if (!activeRide) return;
    setYellowLoading(true);
    const res = await clientSafetyService.triggerYellowAlert({
      rideId: activeRide.id,
      latitude: currentLoc?.latitude,
      longitude: currentLoc?.longitude,
      accuracy: currentLoc?.accuracy,
    });
    setYellowLoading(false);

    if (res.success) {
      showToast('Yellow Safety Alert activated! Operations notified.', 'warning');
    } else {
      showToast(res.error || 'Failed to trigger Yellow Safety Alert', 'danger');
    }
  };

  const handleRedSOSConfirm = async () => {
    setShowRedConfirmModal(false);
    if (!activeRide) return;
    setRedLoading(true);
    const res = await clientSafetyService.triggerRedSOS({
      rideId: activeRide.id,
      latitude: currentLoc?.latitude,
      longitude: currentLoc?.longitude,
      accuracy: currentLoc?.accuracy,
    });
    setRedLoading(false);

    if (res.success) {
      setIsHighFrequencyTracking(true);
      showToast(
        `RED EMERGENCY SOS ACTIVATED! Operations & ${res.nearbyUsersCount ?? 0} nearby active units notified.`,
        'danger'
      );
    } else {
      showToast(res.error || 'Failed to trigger Red Emergency SOS', 'danger');
    }
  };

  const handle999EmergencyCall = async () => {
    const url = 'tel:999';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported && Platform.OS !== 'web') {
        await Linking.openURL(url);
      } else {
        setShowEmergencyCallModal(true);
      }
    } catch {
      setShowEmergencyCallModal(true);
    }
  };

  const handleEmergencySmsLaunch = async () => {
    const vehicleNum = (activeRide?.vehicleId as any)?.shortVehicleNumber || 'Electric Rickshaw';
    const lat = currentLoc?.latitude ? currentLoc.latitude.toFixed(5) : '23.8103';
    const lng = currentLoc?.longitude ? currentLoc.longitude.toFixed(5) : '90.4125';
    const rideRef = activeRide?.rideId || 'ACTIVE_TRIP';
    const bodyText = encodeURIComponent(`RIK-RIDE EMERGENCY - Vehicle: ${vehicleNum}, GPS: https://maps.google.com/?q=${lat},${lng}, Ride Ref: ${rideRef}`);
    const smsUrl = `sms:?body=${bodyText}`;

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = smsUrl;
        showToast('Emergency SMS URI launched in device messaging client.', 'info');
      } else {
        const supported = await Linking.canOpenURL(smsUrl);
        if (supported) {
          await Linking.openURL(smsUrl);
          showToast('Emergency SMS client opened.', 'info');
        } else {
          showToast(`Emergency SMS Text: RIK-RIDE EMERGENCY Vehicle ${vehicleNum} at [${lat}, ${lng}]`, 'warning');
        }
      }
    } catch {
      showToast(`Emergency SMS Text: RIK-RIDE EMERGENCY Vehicle ${vehicleNum} at [${lat}, ${lng}]`, 'warning');
    }
  };

  const handlePassengerOverrideTerminate = async () => {
    if (!activeRide) return;
    setOverrideLoading(true);
    const res = await clientSafetyService.passengerOverrideTerminate(
      activeRide.id,
      'Passenger unilateral safety abort'
    );
    setOverrideLoading(false);

    if (res.success) {
      setIsHighFrequencyTracking(false);
      setActiveRide(null);
      showToast('Ride safely terminated via passenger safety override.', 'info');
      pollActiveRide();
    } else {
      showToast(res.error || 'Failed to execute safety override', 'danger');
    }
  };

  const getRideStatusVariant = (status?: string) => {
    switch (status) {
      case 'INITIATED':
        return 'warning';
      case 'ACCEPTED':
        return 'info';
      case 'ACTIVE':
        return 'success';
      case 'WAITING_PASSENGER_CONFIRM':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Passenger Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Icon name="user" size={24} color={colors.primary} />
            <Text style={[styles.passengerName, { color: colors.textPrimary }]}>
              {user?.name || 'Passenger Portal'}
            </Text>
            <Badge label="PASSENGER" variant="info" />
            <Badge label={`Account: ${user?.accountStatus || 'ACTIVE'}`} variant="success" />
          </View>
          <Text style={[styles.passengerSub, { color: colors.textSecondary }]}>
            Phone: {user?.phone || 'N/A'} • ID: {user?.id || 'N/A'} • Platform Status: Active
          </Text>
        </View>
      </View>

      {/* PRIMARY FEATURE: PASSENGER DISCOVERY RADAR MAP CARD */}
      <Card variant="elevated" style={styles.radarCard}>
        <CardHeader
          title="Passenger Discovery Radar"
          subtitle={
            currentLoc && sharingStatus === 'LOCATION_ACTIVE'
              ? `Live Dhaka sector radar • Searching within 2 km of your position`
              : 'Live Dhaka sector radar • Displaying available operational rickshaws'
          }
          action={
            <Badge
              label={`${nearbyRickshaws.length} AVAILABLE`}
              variant={nearbyRickshaws.length > 0 ? 'success' : 'neutral'}
            />
          }
        />
        <CardBody style={styles.radarBody}>
          {/* Real Interactive Discovery Map (Renders live assigned driver location during active trip) */}
          {(() => {
            const activeDriverMarker: NearbyRickshaw | null =
              activeRide &&
              activeRide.driverLocation &&
              ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'].includes(activeRide.status)
                ? {
                    id: activeRide.id,
                    driverId: (activeRide.driverId as any)?._id || 'driver',
                    driverName: (activeRide.driverId as any)?.name || 'Assigned Driver',
                    driverPhone: (activeRide.driverId as any)?.phone || 'N/A',
                    vehicleId: (activeRide.vehicleId as any)?._id || 'vehicle',
                    customVehicleId: (activeRide.vehicleId as any)?.shortVehicleNumber || 'Rickshaw',
                    shortVehicleNumber: (activeRide.vehicleId as any)?.shortVehicleNumber || 'Rickshaw',
                    registrationNumber: (activeRide.vehicleId as any)?.registrationNumber || 'N/A',
                    qrIdentifier: 'ASSIGNED_VEHICLE',
                    ownershipType: 'APPROVED',
                    modelName: 'Electric Rickshaw',
                    verificationStatus: 'APPROVED',
                    status: activeRide.status,
                    latitude: activeRide.driverLocation.latitude,
                    longitude: activeRide.driverLocation.longitude,
                    accuracy: activeRide.driverLocation.accuracy,
                    speed: activeRide.driverLocation.speed,
                    heading: activeRide.driverLocation.heading,
                    distanceKm: null,
                    avgRating: null,
                    ratingsCount: 0,
                    completedRidesCount: 0,
                    isDriverVerifiedForVehicle: true,
                    updatedAt: activeRide.driverLocation.updatedAt,
                  }
                : null;

            const mapRickshawMarkers = activeDriverMarker
              ? [activeDriverMarker, ...nearbyRickshaws.filter((r) => r.vehicleId !== (activeRide?.vehicleId as any)?._id)]
              : nearbyRickshaws;

            const activeRoutePolyline =
              activeRide?.routePoints && activeRide.routePoints.length > 1
                ? activeRide.routePoints.map((pt) => [pt.coordinates[1], pt.coordinates[0]] as [number, number])
                : undefined;

            return (
              <RealMapContainer
                latitude={currentLoc?.latitude ?? 23.8103}
                longitude={currentLoc?.longitude ?? 90.4125}
                accuracy={currentLoc?.accuracy}
                status={sharingStatus}
                title="Dhaka Electric Rickshaw Discovery Radar"
                subtitle={
                  activeRide && activeDriverMarker
                    ? `Live Ride Telemetry • Driver ${activeDriverMarker.driverName} (${activeDriverMarker.shortVehicleNumber})`
                    : currentLoc && sharingStatus === 'LOCATION_ACTIVE'
                    ? `Position: [${currentLoc.latitude.toFixed(4)}, ${currentLoc.longitude.toFixed(4)}] • 2 km Radius Stream`
                    : 'Showing Available Operational Rickshaws across Dhaka Sector'
                }
                height={420}
                allowExpand={true}
                rickshawMarkers={mapRickshawMarkers}
                routePolyline={activeRoutePolyline}
                isPassengerView={true}
                onTargetedRequest={handleTargetedRideRequest}
              />
            );
          })()}

          {/* COMPACT CUSTOMER-FACING LOCATION STATUS BAR (Unified Single Source of Truth) */}
          <View style={[styles.compactStatusBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.statusLeftRow}>
              <View
                style={[
                  styles.statusIndicatorDot,
                  {
                    backgroundColor:
                      sharingStatus === 'LOCATION_ACTIVE'
                        ? currentLoc?.accuracy && currentLoc.accuracy > 50
                          ? '#F59E0B' // Low accuracy warning
                          : '#10B981' // Active green
                        : permissionStatus === 'Denied'
                        ? '#EF4444' // Denied red
                        : '#9CA3AF', // Inactive gray
                  },
                ]}
              />
              <View style={styles.statusTextCol}>
                <Text style={[styles.statusPrimaryText, { color: colors.textPrimary }]}>
                  {sharingStatus === 'LOCATION_ACTIVE'
                    ? currentLoc?.accuracy && currentLoc.accuracy > 50
                      ? 'Location accuracy is low'
                      : 'Location active'
                    : permissionStatus === 'Denied'
                    ? 'Location access is off'
                    : 'Location needed for discovery'}
                </Text>
                <Text style={[styles.statusSubText, { color: colors.textSecondary }]}>
                  {sharingStatus === 'LOCATION_ACTIVE'
                    ? currentLoc?.accuracy
                      ? `Accuracy ±${currentLoc.accuracy.toFixed(0)} m • Updating automatically`
                      : 'Position synchronized'
                    : permissionStatus === 'Denied'
                    ? 'Enable location to discover nearby rickshaws within 2 km.'
                    : 'Enable location for accurate pickup dispatch.'}
                </Text>
              </View>
            </View>

            {sharingStatus !== 'LOCATION_ACTIVE' && (
              <Button
                title="Enable Location"
                variant="primary"
                size="sm"
                loading={startingSharing}
                icon={<Icon name="navigation" size={14} color="#FFFFFF" />}
                onPress={handleStartSharing}
              />
            )}

            {/* Discreet Dev Simulator Link */}
            <TouchableOpacity
              style={styles.devSimToggleBtn}
              onPress={() => setShowSimPanel(!showSimPanel)}
            >
              <Text style={[styles.devSimToggleText, { color: colors.textMuted }]}>
                {showSimPanel ? 'Hide Dev Tool' : 'Dev Location Tool'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Expandable Dev Location Simulator Panel */}
          {showSimPanel && (
            <View style={[styles.simBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.simHeader, { color: colors.primary }]}>
                Dev Location Simulator
              </Text>

              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setSimLat('23.8103');
                    setSimLng('90.4125');
                  }}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Dhaka Center</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setSimLat('23.7925');
                    setSimLng('90.4078');
                  }}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Gulshan Circle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setSimLat('23.7516');
                    setSimLng('90.3782');
                  }}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Dhanmondi 27</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.simInputGrid}>
                <View style={styles.simInputWrapper}>
                  <Input label="Latitude" value={simLat} onChangeText={setSimLat} keyboardType="numeric" />
                </View>
                <View style={styles.simInputWrapper}>
                  <Input label="Longitude" value={simLng} onChangeText={setSimLng} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.simActionRow}>
                <Button
                  title="Send Simulated Coordinates"
                  variant="outline"
                  size="sm"
                  icon={<Icon name="navigation" size={14} color={colors.textPrimary} />}
                  onPress={handleSimulatedUpdate}
                />
              </View>
            </View>
          )}
        </CardBody>
      </Card>

      {/* RIDE LIFECYCLE SECTION: ACTIVE TRIP OR OPTIONAL RIDE REQUEST CARD */}
      {activeRide ? (
        <Card variant="elevated" style={[styles.activeRideCard, { borderColor: colors.primary }]}>
          <CardHeader
            title={`Active Ride Lifecycle — ${activeRide.passengerPseudonym}`}
            subtitle={`Ride ID: ${activeRide.rideId} • State: ${activeRide.status}`}
            action={
              <Badge
                label={activeRide.status.replace(/_/g, ' ')}
                variant={getRideStatusVariant(activeRide.status)}
              />
            }
          />
          <CardBody style={styles.activeRideBody}>
            {/* Status Alerts */}
            {activeRide.status === 'INITIATED' && (
              <View style={[styles.alertBanner, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
                <Icon name="clock" size={20} color={colors.warning} />
                <View style={styles.alertTextWrapper}>
                  <Text style={[styles.alertTitle, { color: colors.warning }]}>Searching for Nearby Drivers</Text>
                  <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                    Your pickup location [{activeRide.approximatePickupArea}] is dispatched to available drivers within a 15-second acceptance window.
                  </Text>
                </View>
              </View>
            )}

            {activeRide.status === 'ACCEPTED' && (
              <View style={[styles.alertBanner, { backgroundColor: colors.infoSurface, borderColor: colors.info }]}>
                <Icon name="check-circle" size={20} color={colors.info} />
                <View style={styles.alertTextWrapper}>
                  <Text style={[styles.alertTitle, { color: colors.info }]}>Driver Assigned & En Route!</Text>
                  <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                    Driver {activeRide.driverId?.name || 'Assigned Driver'} ({activeRide.vehicleId?.shortVehicleNumber || 'Rickshaw'}) is navigating to your pickup location.
                  </Text>
                </View>
              </View>
            )}

            {activeRide.status === 'ACTIVE' && (
              <View style={[styles.alertBanner, { backgroundColor: colors.successSurface, borderColor: colors.success }]}>
                <Icon name="navigation" size={20} color={colors.success} />
                <View style={styles.alertTextWrapper}>
                  <Text style={[styles.alertTitle, { color: colors.success }]}>Trip in Progress</Text>
                  <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                    You are currently riding in vehicle {activeRide.vehicleId?.shortVehicleNumber || 'Rickshaw'}. Enjoy your secure ride!
                  </Text>
                </View>
              </View>
            )}

            {activeRide.status === 'WAITING_PASSENGER_CONFIRM' && (
              <View style={[styles.alertBanner, { backgroundColor: colors.primarySurface, borderColor: colors.primary }]}>
                <Icon name="map-pin" size={20} color={colors.primary} />
                <View style={styles.alertTextWrapper}>
                  <Text style={[styles.alertTitle, { color: colors.primary }]}>Arrived at Destination — Drop-off Confirmation Needed</Text>
                  <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                    The driver has arrived at your drop-off point. Please confirm drop-off below to record final drop-off GPS coordinates.
                  </Text>
                </View>
              </View>
            )}

            {/* Ride Details Grid */}
            <View style={styles.telemetryGrid}>
              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Trip Pseudonym</Text>
                <Text style={[styles.telemetryVal, { color: colors.primary }]}>{activeRide.passengerPseudonym}</Text>
              </View>

              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Assigned Driver</Text>
                <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                  {activeRide.driverId ? activeRide.driverId.name : 'Awaiting Driver...'}
                </Text>
              </View>

              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Electric Rickshaw</Text>
                <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                  {activeRide.vehicleId ? activeRide.vehicleId.shortVehicleNumber : 'N/A'}
                </Text>
              </View>

              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Destination</Text>
                <Text style={[styles.telemetryVal, { color: colors.textSecondary }]}>
                  {activeRide.destinationText || 'Open Destination'}
                </Text>
              </View>

              {activeRide.distanceMeters !== undefined && (
                <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Distance Traveled</Text>
                  <Text style={[styles.telemetryVal, { color: colors.primary }]}>
                    {(activeRide.distanceMeters / 1000).toFixed(2)} km ({activeRide.routePointCount || activeRide.routePoints?.length || 0} GPS pts)
                  </Text>
                </View>
              )}
            </View>

            {/* Pre-Active Cancel Request Action */}
            {(activeRide.status === 'INITIATED' || activeRide.status === 'ACCEPTED') && (
              <View style={{ marginTop: spacing.xs }}>
                <Button
                  title="Cancel Ride Request"
                  variant="outline"
                  size="md"
                  loading={cancellingRide}
                  icon={<Icon name="x" size={16} color={colors.textPrimary} />}
                  onPress={handleCancelRide}
                />
              </View>
            )}

            {/* Drop-off Confirmation Button */}
            {(activeRide.status === 'WAITING_PASSENGER_CONFIRM' || activeRide.status === 'ACTIVE') && (
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title="Confirm Drop-Off & Finish Trip"
                  variant="primary"
                  size="lg"
                  loading={confirmingCompletion}
                  icon={<Icon name="check" size={18} color="#FFFFFF" />}
                  onPress={handleConfirmCompletion}
                />
              </View>
            )}

            {/* PASSENGER SAFETY & EMERGENCY COMMAND SECTION (ONLY ON ACTIVE RIDES) */}
            <View style={[styles.safetyContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.safetyHeaderRow}>
                <Icon name="shield" size={18} color={colors.primary} />
                <Text style={[styles.safetyHeaderTitle, { color: colors.textPrimary }]}>
                  Safety & Emergency Command
                </Text>
                {isHighFrequencyTracking && (
                  <Badge label="HIGH-FREQ GPS ACTIVE" variant="danger" />
                )}
              </View>
              <Text style={[styles.safetyHeaderDesc, { color: colors.textSecondary }]}>
                Immediate multi-tier safety controls for authenticated active rides.
              </Text>

              {/* Primary Safety Action Buttons Grid */}
              <View style={styles.safetyButtonsGrid}>
                {/* Yellow Safety Alert */}
                <TouchableOpacity
                  style={[styles.yellowSafetyBtn, { backgroundColor: '#D97706' }]}
                  onPress={handleYellowAlert}
                  disabled={yellowLoading}
                  activeOpacity={0.8}
                >
                  <Icon name="alert-triangle" size={18} color="#FFFFFF" />
                  <Text style={styles.yellowSafetyText}>
                    {yellowLoading ? 'Sending Alert...' : 'Yellow Safety Alert'}
                  </Text>
                </TouchableOpacity>

                {/* Red Emergency SOS */}
                <TouchableOpacity
                  style={[styles.redSosBtn, { backgroundColor: '#DC2626' }]}
                  onPress={() => setShowRedConfirmModal(true)}
                  disabled={redLoading}
                  activeOpacity={0.8}
                >
                  <Icon name="shield" size={18} color="#FFFFFF" />
                  <Text style={styles.redSosText}>
                    {redLoading ? 'Activating SOS...' : 'RED Emergency SOS'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Secondary Safety Actions */}
              <View style={styles.secondarySafetyRow}>
                <Button
                  title="999 Emergency Call"
                  variant="outline"
                  size="sm"
                  icon={<Icon name="phone" size={14} color={colors.danger} />}
                  onPress={handle999EmergencyCall}
                />
                <Button
                  title="Emergency SMS"
                  variant="outline"
                  size="sm"
                  icon={<Icon name="message-square" size={14} color={colors.warning} />}
                  onPress={handleEmergencySmsLaunch}
                />
                <Button
                  title="Safety Override & Terminate"
                  variant="danger"
                  size="sm"
                  loading={overrideLoading}
                  icon={<Icon name="x-circle" size={14} color="#FFFFFF" />}
                  onPress={handlePassengerOverrideTerminate}
                />
              </View>
            </View>
          </CardBody>
        </Card>
      ) : (
        /* OPTIONAL RIDE REQUEST CARD */
        <Card variant="elevated" style={styles.requestCard}>
          <CardHeader
            title="Request an Electric Rickshaw"
            subtitle="Broadcast ride request to nearby discovered rickshaws"
            action={<Badge label="ACTION CARD" variant="info" />}
          />
          <CardBody style={styles.requestBody}>
            <Input
              label="Destination Reference (Optional landmark description)"
              placeholder="e.g. Gulshan-2 Circle, Dhanmondi 27, Banani Block 11..."
              value={destinationText}
              onChangeText={setDestinationText}
            />

            <View style={styles.requestActionRow}>
              <Button
                title="Request Electric Rickshaw"
                variant="primary"
                size="lg"
                loading={requestingRide}
                disabled={!currentLoc || sharingStatus !== 'LOCATION_ACTIVE'}
                icon={<Icon name="navigation" size={18} color="#FFFFFF" />}
                onPress={handleRequestRide}
              />
              {(sharingStatus !== 'LOCATION_ACTIVE' || !currentLoc) && (
                <View style={styles.reqLocationNoticeRow}>
                  <Text style={[styles.locNoticeText, { color: colors.textSecondary }]}>
                    ℹ️ Location access is required to request pickup to your position.
                  </Text>
                  <TouchableOpacity onPress={handleStartSharing}>
                    <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 12 }}>
                      Enable Location →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </CardBody>
        </Card>
      )}

      {/* MODAL 1: RED EMERGENCY SOS CONFIRMATION */}
      <Modal
        visible={showRedConfirmModal}
        onClose={() => setShowRedConfirmModal(false)}
        title="Trigger RED Emergency SOS"
      >
        <View style={styles.modalContentCol}>
          <View style={styles.modalWarningHeader}>
            <Icon name="shield" size={28} color={colors.danger} />
            <Text style={[styles.modalWarningTitle, { color: colors.danger }]}>
              Confirm High-Priority Emergency Trigger
            </Text>
          </View>
          <Text style={[styles.modalBodyText, { color: colors.textSecondary }]}>
            This action instantly creates an urgent <Text style={{ fontWeight: '700', color: colors.danger }}>RED SOS Event</Text>.
            Operations Command Center will be notified immediately, high-frequency GPS tracking will be engaged, emergency SMS alerts will be generated, and eligible active units within 500 meters will be queried.
          </Text>
          <View style={styles.modalActionRow}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setShowRedConfirmModal(false)}
            />
            <Button
              title="CONFIRM RED EMERGENCY SOS"
              variant="danger"
              size="md"
              loading={redLoading}
              icon={<Icon name="shield" size={16} color="#FFFFFF" />}
              onPress={handleRedSOSConfirm}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 2: 999 EMERGENCY CALL HOTLINE INFO */}
      <Modal
        visible={showEmergencyCallModal}
        onClose={() => setShowEmergencyCallModal(false)}
        title="Bangladesh Emergency 999 Hotline"
      >
        <View style={styles.modalContentCol}>
          <View style={styles.modalWarningHeader}>
            <Icon name="phone" size={28} color={colors.primary} />
            <Text style={[styles.modalWarningTitle, { color: colors.primary }]}>
              Direct Emergency Services Hotline
            </Text>
          </View>
          <Text style={[styles.modalBodyText, { color: colors.textSecondary }]}>
            Dial <Text style={{ fontWeight: '800', color: colors.primary }}>999</Text> directly on your mobile device keypad to reach National Emergency Services in Bangladesh (Police, Fire, Ambulance).
          </Text>
          <View style={styles.emergencyBox}>
            <Text style={[styles.emergencyBoxNumber, { color: colors.primary }]}>999</Text>
            <Text style={[styles.emergencyBoxSub, { color: colors.textMuted }]}>
              Toll-Free 24/7 Emergency Dispatch
            </Text>
          </View>
          <View style={styles.modalActionRow}>
            <Button
              title="Close Emergency Help"
              variant="primary"
              size="md"
              onPress={() => setShowEmergencyCallModal(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  headerInfo: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  passengerName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  passengerSub: {
    fontSize: 13,
  },
  radarCard: {
    width: '100%',
  },
  radarBody: {
    gap: spacing.sm,
  },
  compactStatusBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  statusLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 200,
  },
  statusIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTextCol: {
    flex: 1,
  },
  statusPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  devSimToggleBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  devSimToggleText: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  requestCard: {
    width: '100%',
  },
  requestBody: {
    gap: spacing.md,
  },
  requestActionRow: {
    gap: spacing.xs,
  },
  reqLocationNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  locNoticeText: {
    fontSize: 12,
  },
  activeRideCard: {
    width: '100%',
    borderWidth: 2,
  },
  activeRideBody: {
    gap: spacing.md,
  },
  safetyContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  safetyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  safetyHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  safetyHeaderDesc: {
    fontSize: 12,
  },
  safetyButtonsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  yellowSafetyBtn: {
    flex: 1,
    minWidth: 160,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  yellowSafetyText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  redSosBtn: {
    flex: 1,
    minWidth: 160,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  redSosText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  secondarySafetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  alertBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  telemetryCard: {
    flex: 1,
    minWidth: 150,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  telemetryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  telemetryVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  simBox: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  simHeader: {
    fontSize: 14,
    fontWeight: '800',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  simInputGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  simInputWrapper: {
    flex: 1,
    minWidth: 140,
  },
  simActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalContentCol: {
    gap: spacing.md,
  },
  modalWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  modalWarningTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emergencyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  emergencyBoxNumber: {
    fontSize: 36,
    fontWeight: '900',
  },
  emergencyBoxSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
