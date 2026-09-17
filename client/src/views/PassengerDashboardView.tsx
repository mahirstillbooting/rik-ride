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
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Icon } from '../components/ui/Icon';
import { RealMapContainer } from '../components/ui/RealMapContainer';
import { spacing, borderRadius } from '../theme/spacing';
import { passengerLocationApiService, NearbyRickshaw } from '../services/passengerLocationService';
import { SharingStatus } from '../services/locationService';
import { clientRideService, RideData, HistoricalTripSummary, DetailedTripRecord } from '../services/rideService';
import { clientSafetyService } from '../services/safetyService';

export const PassengerDashboardView: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'RADAR' | 'HISTORY'>('RADAR');

  // Trip History States
  const [tripHistory, setTripHistory] = useState<HistoricalTripSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<DetailedTripRecord | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);

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

  // Fetch Passenger Completed Trip History
  const loadPassengerHistory = useCallback(async () => {
    setLoadingHistory(true);
    const res = await clientRideService.getPassengerTripHistory();
    if (res.success && res.trips) {
      setTripHistory(res.trips);
    } else {
      showToast(res.error || 'Failed to load trip history', 'danger');
    }
    setLoadingHistory(false);
  }, [showToast]);

  // Open detailed historical journey record
  const handleOpenTripDetail = async (rideId: string) => {
    setLoadingTripDetail(true);
    setShowTripModal(true);
    const res = await clientRideService.getTripDetailById(rideId);
    if (res.success && res.trip) {
      setSelectedTrip(res.trip);
    } else {
      showToast(res.error || 'Failed to load trip details', 'danger');
    }
    setLoadingTripDetail(false);
  };

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

      {/* Navigation Tab Bar */}
      <View style={styles.tabNavRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: activeTab === 'RADAR' ? colors.primary : colors.surfaceElevated, borderColor: activeTab === 'RADAR' ? colors.primary : colors.border },
          ]}
          onPress={() => setActiveTab('RADAR')}
        >
          <Icon name="map-pin" size={16} color={activeTab === 'RADAR' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'RADAR' ? '#FFFFFF' : colors.textSecondary }]}>
            Live Discovery Radar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: activeTab === 'HISTORY' ? colors.primary : colors.surfaceElevated, borderColor: activeTab === 'HISTORY' ? colors.primary : colors.border },
          ]}
          onPress={() => {
            setActiveTab('HISTORY');
            loadPassengerHistory();
          }}
        >
          <Icon name="clock" size={16} color={activeTab === 'HISTORY' ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'HISTORY' ? '#FFFFFF' : colors.textSecondary }]}>
            Trip History ({tripHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: LIVE DISCOVERY RADAR & ACTIVE RIDE */}
      {activeTab === 'RADAR' && (
        <>
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
              {/* Real Interactive Discovery Map */}
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

              {/* COMPACT LOCATION STATUS BAR */}
              <View style={[styles.compactStatusBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.statusLeftRow}>
                  <View
                    style={[
                      styles.statusIndicatorDot,
                      {
                        backgroundColor:
                          sharingStatus === 'LOCATION_ACTIVE'
                            ? colors.success
                            : colors.textMuted,
                      },
                    ]}
                  />
                  <View style={styles.statusTextCol}>
                    <Text style={[styles.statusPrimaryText, { color: colors.textPrimary }]}>
                      {sharingStatus === 'LOCATION_ACTIVE'
                        ? 'Live GPS Sharing Active'
                        : 'Location Sharing Disabled'}
                    </Text>
                    <Text style={[styles.statusSubText, { color: colors.textMuted }]}>
                      {currentLoc
                        ? `Lat ${currentLoc.latitude.toFixed(4)}, Lng ${currentLoc.longitude.toFixed(4)} • Updated ${
                            lastUpdateTs ? lastUpdateTs.toLocaleTimeString() : 'Just now'
                          }`
                        : 'Tap Enable Location below to enable nearby discovery radar.'}
                    </Text>
                  </View>
                </View>

                {sharingStatus !== 'LOCATION_ACTIVE' && (
                  <Button
                    title={startingSharing ? 'Enabling...' : 'Enable Location'}
                    variant="primary"
                    size="sm"
                    loading={startingSharing}
                    onPress={handleStartSharing}
                  />
                )}
              </View>

              {locationError && (
                <View style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                  <Icon name="alert-circle" size={18} color="#DC2626" />
                  <Text style={{ fontSize: 13, color: '#991B1B' }}>{locationError}</Text>
                </View>
              )}
            </CardBody>
          </Card>

          {/* RIDE REQUEST CARD */}
          {!activeRide && (
            <Card variant="elevated" style={styles.requestCard}>
              <CardHeader
                title="Request Electric Rickshaw"
                subtitle="Broadcast pickup request to nearest available Dhaka rickshaw driver"
              />
              <CardBody style={styles.requestBody}>
                <Input
                  label="Destination (Optional)"
                  placeholder="Enter destination area, landmark, or sector..."
                  value={destinationText}
                  onChangeText={setDestinationText}
                />

                <View style={styles.requestActionRow}>
                  <Button
                    title={requestingRide ? 'Dispatching Request...' : 'Request Nearest Rickshaw'}
                    variant="primary"
                    size="lg"
                    loading={requestingRide}
                    disabled={sharingStatus !== 'LOCATION_ACTIVE' || requestingRide}
                    onPress={handleRequestRide}
                  />
                  {sharingStatus !== 'LOCATION_ACTIVE' && (
                    <Text style={[styles.locNoticeText, { color: colors.warning }]}>
                      Location sharing must be active to request pickup.
                    </Text>
                  )}
                </View>
              </CardBody>
            </Card>
          )}

          {/* ACTIVE RIDE CARD */}
          {activeRide && (
            <Card variant="elevated" style={[styles.activeRideCard, { borderColor: colors.primary }]}>
              <CardHeader
                title={`Active Ride Lifecycle (${activeRide.passengerPseudonym})`}
                subtitle={`Ride ID: ${activeRide.rideId || activeRide.id}`}
                action={<Badge label={activeRide.status} variant={getRideStatusVariant(activeRide.status)} />}
              />
              <CardBody style={styles.activeRideBody}>
                <View style={styles.telemetryGrid}>
                  <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Assigned Driver</Text>
                    <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                      {activeRide.driverId?.name || 'Searching...'}
                    </Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Vehicle Number</Text>
                    <Text style={[styles.telemetryVal, { color: colors.primary }]}>
                      {activeRide.vehicleId?.shortVehicleNumber || 'Assigned Rickshaw'}
                    </Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Pickup Location Area</Text>
                    <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                      {activeRide.approximatePickupArea || 'GPS Coordinates Locked'}
                    </Text>
                  </View>
                </View>

                {activeRide.status === 'INITIATED' && (
                  <View style={styles.modalActionRow}>
                    <Button
                      title={cancellingRide ? 'Cancelling...' : 'Cancel Request'}
                      variant="outline"
                      size="md"
                      loading={cancellingRide}
                      onPress={handleCancelRide}
                    />
                  </View>
                )}

                {activeRide.status === 'WAITING_PASSENGER_CONFIRM' && (
                  <View style={[styles.alertBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}>
                    <Icon name="check-circle" size={24} color={colors.primary} />
                    <View style={styles.alertTextWrapper}>
                      <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>Driver Requested Ride Drop-off</Text>
                      <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                        Driver has indicated drop-off completion. Please confirm drop-off to finalize the journey.
                      </Text>
                    </View>
                    <Button
                      title={confirmingCompletion ? 'Confirming...' : 'Confirm Drop-off'}
                      variant="primary"
                      size="md"
                      loading={confirmingCompletion}
                      onPress={handleConfirmCompletion}
                    />
                  </View>
                )}

                {/* SAFETY & SOS COMMAND SECTION */}
                <View style={[styles.safetyContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={styles.safetyHeaderRow}>
                    <Icon name="shield" size={20} color={colors.primary} />
                    <Text style={[styles.safetyHeaderTitle, { color: colors.textPrimary }]}>Safety & Emergency Controls</Text>
                  </View>
                  <Text style={[styles.safetyHeaderDesc, { color: colors.textSecondary }]}>
                    In case of unsafe driving, dispute, or emergency, trigger live alert escalation to operations.
                  </Text>
                  <View style={styles.safetyButtonsGrid}>
                    <TouchableOpacity
                      style={[styles.yellowSafetyBtn, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
                      onPress={handleYellowAlert}
                      disabled={yellowLoading}
                    >
                      <Icon name="alert-triangle" size={18} color="#D97706" />
                      <Text style={{ fontWeight: '700', color: '#B45309' }}>
                        {yellowLoading ? 'Alerting...' : 'Yellow Safety Alert'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.yellowSafetyBtn, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}
                      onPress={() => setShowRedConfirmModal(true)}
                      disabled={redLoading}
                    >
                      <Icon name="alert-circle" size={18} color="#DC2626" />
                      <Text style={{ fontWeight: '800', color: '#991B1B' }}>
                        {redLoading ? 'Triggering...' : 'RED EMERGENCY SOS'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* TAB 2: PASSENGER TRIP HISTORY & JOURNEY RECORDS */}
      {activeTab === 'HISTORY' && (
        <Card variant="elevated">
          <CardHeader
            title="Completed Trip History"
            subtitle="Permanent journey records with verified telemetry paths & drop-off locations"
          />
          <CardBody style={{ gap: spacing.md }}>
            {loadingHistory ? (
              <LoadingState message="Fetching your completed trip records..." />
            ) : tripHistory.length === 0 ? (
              <EmptyState
                title="No Completed Trips Yet"
                description="Your completed electric rickshaw rides and journey telemetry maps will appear here."
              />
            ) : (
              tripHistory.map((trip) => (
                <View
                  key={trip.id}
                  style={[
                    styles.tripCardItem,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.tripCardHeader}>
                    <View style={styles.tripCardRefRow}>
                      <Icon name="navigation" size={18} color={colors.primary} />
                      <Text style={[styles.tripCardRefText, { color: colors.textPrimary }]}>
                        {trip.rideId}
                      </Text>
                      <Badge label={trip.status} variant="success" />
                      {trip.hasSafetyEvent && (
                        <Badge label="SAFETY ALERT" variant="warning" />
                      )}
                    </View>
                    <Text style={[styles.tripDateText, { color: colors.textMuted }]}>
                      {trip.completedAt ? new Date(trip.completedAt).toLocaleString() : new Date(trip.requestedAt).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.tripDetailGrid}>
                    <View style={styles.tripDetailCol}>
                      <Text style={[styles.tripDetailLabel, { color: colors.textMuted }]}>Vehicle & Driver</Text>
                      <Text style={[styles.tripDetailVal, { color: colors.textPrimary }]}>
                        Vehicle {trip.shortVehicleNumber} • {trip.driverName || 'Driver'}
                      </Text>
                    </View>

                    <View style={styles.tripDetailCol}>
                      <Text style={[styles.tripDetailLabel, { color: colors.textMuted }]}>Pickup Area</Text>
                      <Text style={[styles.tripDetailVal, { color: colors.textPrimary }]}>
                        {trip.approximatePickupArea || 'GPS Pickup Point'}
                      </Text>
                    </View>

                    <View style={styles.tripDetailCol}>
                      <Text style={[styles.tripDetailLabel, { color: colors.textMuted }]}>Distance & Duration</Text>
                      <Text style={[styles.tripDetailVal, { color: colors.textPrimary }]}>
                        {(trip.distanceMeters / 1000).toFixed(2)} km • {Math.round(trip.durationSeconds / 60)} mins
                      </Text>
                    </View>

                    <View style={styles.tripDetailCol}>
                      <Text style={[styles.tripDetailLabel, { color: colors.textMuted }]}>Fare & Settlement</Text>
                      <Text style={[styles.tripDetailVal, { color: colors.primary }]}>
                        ৳{trip.fareAmount || 0} ({trip.paymentMethod || 'CASH'})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripCardFooter}>
                    {trip.passengerRating ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: '#F59E0B', fontWeight: '800' }}>★ {trip.passengerRating}.0</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>(Rated)</Text>
                      </View>
                    ) : (
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Unrated</Text>
                    )}

                    <Button
                      title="Inspect Journey Map"
                      variant="outline"
                      size="sm"
                      onPress={() => handleOpenTripDetail(trip.id)}
                    />
                  </View>
                </View>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* MODAL: DETAILED HISTORICAL JOURNEY & MAP */}
      <Modal
        visible={showTripModal}
        onClose={() => {
          setShowTripModal(false);
          setSelectedTrip(null);
        }}
        title={`Journey Record: ${selectedTrip?.rideId || 'Trip Detail'}`}
      >
        {loadingTripDetail || !selectedTrip ? (
          <LoadingState message="Loading historical journey telemetry & route map..." />
        ) : (
          <ScrollView style={{ maxHeight: 540 }}>
            <View style={{ gap: spacing.md }}>
              <RealMapContainer
                isHistoricalView={true}
                title={`Historical Path: ${selectedTrip.rideId}`}
                subtitle={`Official GPS Telemetry Path • ${selectedTrip.routePointCount || selectedTrip.routePoints?.length || 0} Coordinates`}
                height={300}
                startLocation={
                  selectedTrip.pickupLocation
                    ? {
                        latitude: selectedTrip.pickupLocation.coordinates[1],
                        longitude: selectedTrip.pickupLocation.coordinates[0],
                        label: 'Pickup Coordinates',
                      }
                    : undefined
                }
                endLocation={
                  selectedTrip.endCoordinates
                    ? {
                        latitude: selectedTrip.endCoordinates.coordinates[1],
                        longitude: selectedTrip.endCoordinates.coordinates[0],
                        label: 'Official Drop-off (endCoordinates)',
                      }
                    : undefined
                }
                routePolyline={
                  selectedTrip.routePoints && selectedTrip.routePoints.length > 1
                    ? selectedTrip.routePoints.map((pt) => [pt.coordinates[1], pt.coordinates[0]])
                    : undefined
                }
              />

              <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>Trip & Driver Identity</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Trip Reference ID:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedTrip.rideId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Vehicle Short Code:</Text>
                  <Text style={[styles.detailVal, { color: colors.primary }]}>Vehicle {selectedTrip.shortVehicleNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Assigned Driver:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedTrip.driverName || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Driver Phone Contact:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedTrip.driverPhone || 'N/A'}</Text>
                </View>
                {selectedTrip.garageName && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Registered Garage:</Text>
                    <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedTrip.garageName}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>Telemetry & Drop-off Verification</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Approximate Pickup Area:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedTrip.approximatePickupArea || 'GPS Coords'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Official Drop-off Coords:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                    {selectedTrip.endLatitude && selectedTrip.endLongitude
                      ? `[${selectedTrip.endLatitude.toFixed(4)}, ${selectedTrip.endLongitude.toFixed(4)}]`
                      : 'End Coordinates Logged'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Verified Route Distance:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                    {(selectedTrip.distanceMeters / 1000).toFixed(2)} km ({selectedTrip.routePointCount || selectedTrip.routePoints?.length || 0} telemetry points)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Journey Duration:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                    {Math.round(selectedTrip.durationSeconds / 60)} minutes
                  </Text>
                </View>
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>Settlement & Payment</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Final Fare Amount:</Text>
                  <Text style={[styles.detailVal, { color: colors.primary, fontWeight: '800' }]}>৳{selectedTrip.fareAmount || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Payment Method:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedTrip.paymentMethod || 'CASH'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Settlement Status:</Text>
                  <Badge label={selectedTrip.settlement?.status || 'SETTLED'} variant="success" />
                </View>
              </View>

              {selectedTrip.safetyEvent && (
                <View style={[styles.detailSection, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                  <Text style={[styles.detailSectionTitle, { color: '#DC2626' }]}>Safety Event Logged</Text>
                  <Text style={{ color: '#991B1B', fontSize: 13 }}>
                    Severity: {selectedTrip.safetyEvent.severity} • Event: {selectedTrip.safetyEvent.eventType} • Status: {selectedTrip.safetyEvent.status}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* MODAL 1: RED EMERGENCY SOS CONFIRMATION */}
      <Modal
        visible={showRedConfirmModal}
        onClose={() => setShowRedConfirmModal(false)}
        title="Trigger Emergency Red SOS"
      >
        <View style={styles.modalContentCol}>
          <View style={styles.modalWarningHeader}>
            <Icon name="alert-circle" size={28} color="#DC2626" />
            <Text style={[styles.modalWarningTitle, { color: '#DC2626' }]}>
              Immediate Emergency Escalation
            </Text>
          </View>
          <Text style={[styles.modalBodyText, { color: colors.textPrimary }]}>
            Activating Red Emergency SOS will instantly notify operations and escalate live tracking.
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
            Dial <Text style={{ fontWeight: '800', color: colors.primary }}>999</Text> directly on your mobile device keypad.
          </Text>
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
  tabNavRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tripCardItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tripCardRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tripCardRefText: {
    fontSize: 15,
    fontWeight: '800',
  },
  tripDateText: {
    fontSize: 12,
  },
  tripDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tripDetailCol: {
    flex: 1,
    minWidth: 140,
  },
  tripDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tripDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailSection: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
  },
});
