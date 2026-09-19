import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useRouter } from '../navigation/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
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
import { RealQRScanner } from '../components/ui/RealQRScanner';
import { clientQRService } from '../services/qrService';
import { QRCodeDisplay } from '../components/ui/QRCodeDisplay';
import { PaymentMethodBadge } from '../components/ui/PaymentMethodBadge';
import {
  driverService,
  DriverProfileData,
  DriverGarageRelation,
  DriverVehicleData,
  DriverHistoryRecord,
} from '../services/driverService';
import { locationApiService, SharingStatus } from '../services/locationService';
import { clientRideService, RideData, HistoricalTripSummary, DetailedTripRecord } from '../services/rideService';

export const DriverDashboardView: React.FC = () => {
  const { colors } = useTheme();
  const { activeRouteId } = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'vehicle' | 'garage' | 'history' | 'profile'>('overview');

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverProfileData | null>(null);
  const [garageRelation, setGarageRelation] = useState<DriverGarageRelation | null>(null);
  const [vehicle, setVehicle] = useState<DriverVehicleData | null>(null);
  const [garageHistory, setGarageHistory] = useState<any[]>([]);

  // History Tab States
  const [assignmentHistory, setAssignmentHistory] = useState<DriverHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Driver Trip History States
  const [driverTripHistory, setDriverTripHistory] = useState<HistoricalTripSummary[]>([]);
  const [loadingDriverTripHistory, setLoadingDriverTripHistory] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<DetailedTripRecord | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);

  // Self-Owned Vehicle Modal State
  const [showSelfVehicleModal, setShowSelfVehicleModal] = useState(false);
  const [selfShortNum, setSelfShortNum] = useState('');
  const [selfRegNum, setSelfRegNum] = useState('');
  const [selfModelName, setSelfModelName] = useState('');
  const [selfMfgYear, setSelfMfgYear] = useState('2024');
  const [submittingVehicle, setSubmittingVehicle] = useState(false);

  // Live Location & GPS Telemetry States
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>('LOCATION_OFF');
  const [isSharing, setIsSharing] = useState(false);
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

  // Dev Location Simulator States
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [simLat, setSimLat] = useState('23.8103');
  const [simLng, setSimLng] = useState('90.4125');
  const [simSpeed, setSimSpeed] = useState('15');
  const [simHeading, setSimHeading] = useState('90');
  const [simAccuracy, setSimAccuracy] = useState('10');
  const [autoSimActive, setAutoSimActive] = useState(false);

  // Driver QR Scanner States
  const [showDriverQRScanner, setShowDriverQRScanner] = useState(false);
  const [scanningVehicleQR, setScanningVehicleQR] = useState(false);

  // Tracking refs
  const watchIdRef = useRef<number | null>(null);
  const lastSentTsRef = useRef<number>(0);
  const autoSimIntervalRef = useRef<any>(null);

  // Sync route ID to active tab
  useEffect(() => {
    if (activeRouteId === 'gdriver-vehicle' || activeRouteId === 'idriver-vehicle') {
      setActiveTab('vehicle');
    } else if (activeRouteId === 'gdriver-support') {
      setActiveTab('garage');
    } else if (activeRouteId === 'gdriver-rides' || activeRouteId === 'idriver-earnings') {
      setActiveTab('history');
    } else if (activeRouteId === 'idriver-settings') {
      setActiveTab('profile');
    } else {
      setActiveTab('overview');
    }
  }, [activeRouteId]);

  // Load Driver Profile & Identity
  const loadDriverData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const res = await driverService.getDriverProfile();
    if (!res.success || !res.driver) {
      setErrorMsg(res.error || 'Failed to load driver profile');
      setLoading(false);
      return;
    }

    setDriver(res.driver);
    setGarageRelation(res.garageRelation || null);
    setVehicle(res.vehicle || null);

    setLoading(false);
  }, []);

  // Handle Driver Camera QR Scan Success
  const handleDriverScanSuccess = async (qrPayload: string) => {
    setShowDriverQRScanner(false);
    setScanningVehicleQR(true);

    const res = await clientQRService.driverConfirmScanQR(qrPayload);
    setScanningVehicleQR(false);

    if (res.success) {
      showToast(res.message || 'Rickshaw QR code verified & confirmed for driver shift!', 'success');
      loadDriverData();
    } else {
      showToast(res.error || 'Driver QR scan confirmation failed.', 'danger');
    }
  };

  // Fetch initial location status from backend
  const syncLocationStatus = useCallback(async () => {
    const res = await locationApiService.getStatus();
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

  // Ride Dispatch & Lifecycle States
  const [pendingRides, setPendingRides] = useState<RideData[]>([]);
  const [activeRide, setActiveRide] = useState<RideData | null>(null);
  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
  const [startingRideId, setStartingRideId] = useState<string | null>(null);
  const [requestingCompletionId, setRequestingCompletionId] = useState<string | null>(null);

  // Poll pending ride dispatches & active trip for driver
  const pollDriverRides = useCallback(async () => {
    const activeRes = await clientRideService.getDriverActiveRide();
    if (activeRes.success) {
      setActiveRide(activeRes.ride);
    }
    const pendingRes = await clientRideService.getDriverPendingRequests();
    if (pendingRes.success && pendingRes.rides) {
      setPendingRides(pendingRes.rides);
    }
  }, []);

  useEffect(() => {
    loadDriverData();
    syncLocationStatus();
    pollDriverRides();

    const interval = setInterval(() => {
      pollDriverRides();
    }, 3000);

    return () => clearInterval(interval);
  }, [loadDriverData, syncLocationStatus, pollDriverRides]);

  const [decliningRideId, setDecliningRideId] = useState<string | null>(null);

  // Decline Ride Request
  const handleDeclineRide = async (rideId: string) => {
    setDecliningRideId(rideId);
    const res = await clientRideService.declineDriverRide(rideId);
    setDecliningRideId(null);

    if (res.success) {
      showToast('Ride request declined', 'info');
      pollDriverRides();
    } else {
      showToast(res.error || 'Failed to decline ride request', 'danger');
    }
  };

  // Accept Ride (Atomic First-Trigger-Wins)
  const handleAcceptRide = async (rideId: string) => {
    setAcceptingRideId(rideId);
    const res = await clientRideService.acceptDriverRide(rideId);
    setAcceptingRideId(null);

    if (res.success && res.ride) {
      showToast(`Ride accepted! (${res.ride.passengerPseudonym})`, 'success');
      setActiveRide(res.ride);
      pollDriverRides();
    } else {
      showToast(res.error || 'Failed to accept ride', 'danger');
      pollDriverRides();
    }
  };

  // Start Ride
  const handleStartRide = async (rideId: string) => {
    setStartingRideId(rideId);
    const res = await clientRideService.startDriverRide(rideId);
    setStartingRideId(null);

    if (res.success && res.ride) {
      showToast('Trip started successfully!', 'success');
      setActiveRide(res.ride);
      pollDriverRides();
    } else {
      showToast(res.error || 'Failed to start trip', 'danger');
    }
  };

  // Request Completion (Validated speed <= 10 km/h)
  const handleRequestCompletion = async (rideId: string) => {
    setRequestingCompletionId(rideId);
    const res = await clientRideService.requestDriverCompletion(rideId);
    setRequestingCompletionId(null);

    if (res.success) {
      showToast('Completion requested! Waiting for passenger drop-off confirmation.', 'success');
      if (res.ride) setActiveRide(res.ride);
      pollDriverRides();
    } else {
      if (res.error?.includes('moving above 10 km/h') || res.error?.includes('speed')) {
        showToast(`⚠️ Speed Check Failure: Please slow down below 10 km/h before completing. (${res.error})`, 'danger');
      } else {
        showToast(res.error || 'Failed to request completion', 'danger');
      }
    }
  };

  // Load History Log (Vehicle Assignments & Completed Trips)
  const loadHistoryData = useCallback(async () => {
    setLoadingHistory(true);
    setLoadingDriverTripHistory(true);

    const res = await driverService.getDriverHistory();
    if (res.success && res.assignmentHistory) {
      setAssignmentHistory(res.assignmentHistory);
    }
    setLoadingHistory(false);

    const tripRes = await clientRideService.getDriverTripHistory();
    if (tripRes.success && tripRes.trips) {
      setDriverTripHistory(tripRes.trips);
    }
    setLoadingDriverTripHistory(false);
  }, []);

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

  // Load Garage Associations Log
  const loadGarageData = useCallback(async () => {
    const res = await driverService.getGarageInfo();
    if (res.success && res.associations) {
      setGarageHistory(res.associations);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadHistoryData();
    if (activeTab === 'garage') loadGarageData();
  }, [activeTab, loadHistoryData, loadGarageData]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (autoSimIntervalRef.current) {
        clearInterval(autoSimIntervalRef.current);
      }
    };
  }, []);

  // Location update handler with 5s throttling
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
      if (!force && now - lastSentTsRef.current < 4500) {
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

      const res = await locationApiService.updateLocation(payload);
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
          console.warn('Location update rejected as stale:', res.error);
        } else {
          setLocationError(res.error || 'Failed to sync live location');
          showToast(res.error || 'Location sync error', 'danger');
        }
      }
    },
    [showToast]
  );

  // Start Live Location Sharing
  const handleStartSharing = async () => {
    setStartingSharing(true);
    setLocationError(null);

    const res = await locationApiService.startSharing();
    setStartingSharing(false);

    if (!res.success) {
      setLocationError(res.error || 'Location sharing initialization failed');
      showToast(res.error || 'Cannot start location sharing', 'danger');
      return;
    }

    setIsSharing(true);
    setSharingStatus('LOCATION_ACTIVE');
    showToast(res.message || 'Live Location Sharing activated!', 'success');

    // Attempt browser/device watchPosition
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
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
            console.warn('Browser Geolocation error:', err.message);
            setLocationError(`Browser GPS notice: ${err.message}. You can use Dev Location Simulator below.`);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
        watchIdRef.current = id;
      } catch (e: any) {
        console.warn('Failed to attach watchPosition:', e);
      }
    } else {
      setLocationError('Device/Browser GPS is not available. Please use Dev Location Simulator.');
    }
  };

  // Stop Live Location Sharing
  const handleStopSharing = async () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (autoSimIntervalRef.current) {
      clearInterval(autoSimIntervalRef.current);
      autoSimIntervalRef.current = null;
      setAutoSimActive(false);
    }

    await locationApiService.stopSharing();
    setIsSharing(false);
    setSharingStatus('LOCATION_OFF');
    showToast('Live Location Sharing stopped', 'info');
  };

  // Trigger manual simulated update
  const handleSimulatedUpdate = () => {
    const lat = parseFloat(simLat);
    const lng = parseFloat(simLng);
    const spd = parseFloat(simSpeed) || 0;
    const hdg = parseFloat(simHeading) || 0;
    const acc = parseFloat(simAccuracy) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      showToast('Please enter valid numeric latitude and longitude', 'warning');
      return;
    }

    sendLocationUpdate(lat, lng, acc, spd, hdg, 'SIMULATED', true);
    showToast(`Simulated location sent: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'success');
  };

  // Toggle Auto-Drive Simulator
  const handleToggleAutoSim = () => {
    if (autoSimActive) {
      if (autoSimIntervalRef.current) {
        clearInterval(autoSimIntervalRef.current);
        autoSimIntervalRef.current = null;
      }
      setAutoSimActive(false);
      showToast('Auto-Drive Simulator stopped', 'info');
    } else {
      let currentSimLat = parseFloat(simLat) || 23.8103;
      let currentSimLng = parseFloat(simLng) || 90.4125;

      setAutoSimActive(true);
      showToast('Auto-Drive Simulator activated (stepping every 5s)', 'info');

      sendLocationUpdate(currentSimLat, currentSimLng, 10, 18, 90, 'SIMULATED', true);

      autoSimIntervalRef.current = setInterval(() => {
        currentSimLat += (Math.random() * 0.0003 + 0.0001) * (Math.random() > 0.3 ? 1 : -1);
        currentSimLng += (Math.random() * 0.0003 + 0.0001) * (Math.random() > 0.3 ? 1 : -1);

        setSimLat(currentSimLat.toFixed(6));
        setSimLng(currentSimLng.toFixed(6));

        sendLocationUpdate(
          Number(currentSimLat.toFixed(6)),
          Number(currentSimLng.toFixed(6)),
          10,
          Math.floor(Math.random() * 10 + 12),
          Math.floor(Math.random() * 360),
          'SIMULATED',
          true
        );
      }, 5000);
    }
  };

  // Register or Update Self-Owned Vehicle
  const handleRegisterSelfVehicle = async () => {
    if (!selfShortNum.trim() || !selfRegNum.trim()) {
      showToast('Short vehicle number and registration number are required', 'warning');
      return;
    }

    setSubmittingVehicle(true);
    const res = await driverService.registerSelfOwnedVehicle({
      shortVehicleNumber: selfShortNum,
      registrationNumber: selfRegNum,
      modelName: selfModelName,
      manufacturingYear: Number(selfMfgYear) || 2024,
    });
    setSubmittingVehicle(false);

    if (res.success && res.vehicle) {
      showToast(res.message || 'Self-Owned Rickshaw registered successfully!', 'success');
      setShowSelfVehicleModal(false);
      setVehicle(res.vehicle);
      loadDriverData();
    } else {
      showToast(res.error || 'Failed to register self-owned vehicle', 'danger');
    }
  };

  if (loading) {
    return <LoadingState message="Connecting to RIK-RIDE Driver Portal..." />;
  }

  if (errorMsg || !driver) {
    return (
      <ErrorState
        title="Driver Portal Connection Failed"
        message={errorMsg || 'Unable to retrieve driver profile'}
        onRetry={loadDriverData}
      />
    );
  }

  const isGarageDriver = driver.driverMode === 'GARAGE_REGISTERED';
  const isAdminActive = driver.accountStatus === 'ACTIVE';

  const getStatusBadgeVariant = (status: SharingStatus) => {
    switch (status) {
      case 'LOCATION_ACTIVE':
        return 'success';
      case 'LOCATION_STALE':
        return 'warning';
      case 'LOCATION_ERROR':
        return 'danger';
      case 'LOCATION_OFF':
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.container}>
      {/* Driver Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Icon name="navigation" size={24} color={colors.primary} />
            <Text style={[styles.driverName, { color: colors.textPrimary }]}>{driver.name}</Text>
            <Badge
              label={isGarageDriver ? 'GARAGE DRIVER' : 'SELF-OWNED DRIVER'}
              variant="info"
            />
            <Badge
              label={`Admin: ${driver.accountStatus}`}
              variant={driver.accountStatus === 'ACTIVE' ? 'success' : 'warning'}
            />
          </View>
          <Text style={[styles.driverSub, { color: colors.textSecondary }]}>
            Phone: {driver.phone} • ID: {driver.id} • Registered: {new Date(driver.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Sub-Navigation Tabs */}
        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[
              styles.navTabBtn,
              activeTab === 'overview' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab('overview')}
          >
            <Icon name="grid" size={14} color={activeTab === 'overview' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.navTabText, { color: activeTab === 'overview' ? '#FFFFFF' : colors.textSecondary }]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTabBtn,
              activeTab === 'vehicle' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab('vehicle')}
          >
            <Icon name="truck" size={14} color={activeTab === 'vehicle' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.navTabText, { color: activeTab === 'vehicle' ? '#FFFFFF' : colors.textSecondary }]}>
              My Vehicle ({vehicle ? vehicle.shortVehicleNumber : 'None'})
            </Text>
          </TouchableOpacity>

          {isGarageDriver && (
            <TouchableOpacity
              style={[
                styles.navTabBtn,
                activeTab === 'garage' && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setActiveTab('garage')}
            >
              <Icon name="briefcase" size={14} color={activeTab === 'garage' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.navTabText, { color: activeTab === 'garage' ? '#FFFFFF' : colors.textSecondary }]}>
                Garage Info
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.navTabBtn,
              activeTab === 'history' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Icon name="clock" size={14} color={activeTab === 'history' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.navTabText, { color: activeTab === 'history' ? '#FFFFFF' : colors.textSecondary }]}>
              History Log
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTabBtn,
              activeTab === 'profile' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab('profile')}
          >
            <Icon name="user" size={14} color={activeTab === 'profile' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.navTabText, { color: activeTab === 'profile' ? '#FFFFFF' : colors.textSecondary }]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Location Sharing & Shift Control Panel */}
      <Card variant="elevated" style={styles.locationPanel}>
        <CardHeader
          title="Live GPS Telemetry & Shift Control"
          subtitle="Real-time device location ingestion foundation for authorized drivers"
          action={
            <Badge
              label={sharingStatus.replace('_', ' ')}
              variant={getStatusBadgeVariant(sharingStatus)}
            />
          }
        />
        <CardBody style={styles.locationBody}>
          {/* Main Action Bar */}
          <View style={styles.locationControlsRow}>
            {!isSharing ? (
              <Button
                title="Start Live Location Sharing"
                variant="primary"
                size="md"
                loading={startingSharing}
                icon={<Icon name="power" size={16} color="#FFFFFF" />}
                onPress={handleStartSharing}
              />
            ) : (
              <Button
                title="Stop Location Sharing"
                variant="danger"
                size="md"
                icon={<Icon name="square" size={16} color="#FFFFFF" />}
                onPress={handleStopSharing}
              />
            )}

            <Button
              title="Scan Rickshaw QR"
              variant="outline"
              size="md"
              loading={scanningVehicleQR}
              icon={<Icon name="qr-code" size={16} color={colors.primary} />}
              onPress={() => setShowDriverQRScanner(true)}
            />

            <TouchableOpacity
              style={[
                styles.simToggleBtn,
                {
                  backgroundColor: showSimPanel ? colors.primarySurface : colors.surfaceElevated,
                  borderColor: showSimPanel ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setShowSimPanel(!showSimPanel)}
            >
              <Icon name="settings" size={14} color={showSimPanel ? colors.primary : colors.textSecondary} />
              <Text
                style={[
                  styles.simToggleText,
                  { color: showSimPanel ? colors.primary : colors.textSecondary },
                ]}
              >
                {showSimPanel ? 'Hide Dev Simulator' : 'Dev Location Simulator'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location Error Display */}
          {locationError && (
            <View style={[styles.alertBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
              <Icon name="alert-triangle" size={18} color={colors.danger} />
              <View style={styles.alertTextWrapper}>
                <Text style={[styles.alertTitle, { color: colors.danger }]}>GPS Telemetry Status Notice</Text>
                <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>{locationError}</Text>
              </View>
            </View>
          )}

          {/* Active Telemetry Metrics Grid */}
          {currentLoc && (
            <View style={styles.telemetryGrid}>
              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Coordinates (Lat, Lng)</Text>
                <Text style={[styles.telemetryVal, { color: colors.primary }]}>
                  {currentLoc.latitude.toFixed(5)}°, {currentLoc.longitude.toFixed(5)}°
                </Text>
              </View>

              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>GPS Accuracy</Text>
                <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                  {currentLoc.accuracy !== undefined ? `±${currentLoc.accuracy.toFixed(1)} m` : 'Standard'}
                </Text>
              </View>

              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Speed & Heading</Text>
                <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                  {currentLoc.speed ? `${(currentLoc.speed * 3.6).toFixed(1)} km/h` : '0.0 km/h'}{' '}
                  {currentLoc.heading !== undefined ? `• ${currentLoc.heading}°` : ''}
                </Text>
              </View>

              <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Last Ingestion</Text>
                <Text style={[styles.telemetryVal, { color: colors.textSecondary }]}>
                  {lastUpdateTs ? lastUpdateTs.toLocaleTimeString() : 'N/A'} ({currentLoc.source || 'DEVICE_GPS'})
                </Text>
              </View>
            </View>
          )}

          {/* Real Interactive Leaflet Geographic Map */}
          <View style={{ marginTop: spacing.xs }}>
            {(() => {
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
                  title="Real Interactive Device GPS Map"
                  subtitle={
                    isSharing
                      ? `Live Telemetry via ${currentLoc?.source || 'DEVICE_GPS'} • Synchronized`
                      : 'Location Sharing Inactive — Tap "Start Live Location Sharing" to stream live GPS'
                  }
                  height={360}
                  routePolyline={activeRoutePolyline}
                  passengerMarkers={
                    activeRide?.passengerLocation && (activeRide.status === 'ACTIVE' || activeRide.status === 'WAITING_PASSENGER_CONFIRM')
                      ? [
                          {
                            id: 'active-passenger-loc',
                            type: 'PASSENGER' as const,
                            lat: activeRide.passengerLocation.latitude,
                            lng: activeRide.passengerLocation.longitude,
                            accuracy: activeRide.passengerLocation.accuracy,
                            label: activeRide.passengerPseudonym || 'Passenger Unit',
                            sublabel: `Live Passenger • Trip [${activeRide.rideId}]`,
                          },
                        ]
                      : []
                  }
                />
              );
            })()}
          </View>

          {/* Dev Location Simulator Panel */}
          {showSimPanel && (
            <View style={[styles.simBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.simHeader, { color: colors.primary }]}>
                Dev GPS Location Simulator (Web Testing Tool)
              </Text>
              <Text style={[styles.historySub, { color: colors.textSecondary }]}>
                Use standard Dhaka test locations or enter custom coordinates to simulate vehicle movement without physical GPS hardware.
              </Text>

              {/* Preset Coordinates */}
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

                <TouchableOpacity
                  style={[styles.presetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setSimLat('23.7330');
                    setSimLng('90.4172');
                  }}
                >
                  <Text style={[styles.presetBtnText, { color: colors.textPrimary }]}>Motijheel Commercial</Text>
                </TouchableOpacity>
              </View>

              {/* Manual Input Grid */}
              <View style={styles.simInputGrid}>
                <View style={styles.simInputWrapper}>
                  <Input label="Latitude" value={simLat} onChangeText={setSimLat} keyboardType="numeric" />
                </View>
                <View style={styles.simInputWrapper}>
                  <Input label="Longitude" value={simLng} onChangeText={setSimLng} keyboardType="numeric" />
                </View>
                <View style={styles.simInputWrapper}>
                  <Input label="Speed (km/h)" value={simSpeed} onChangeText={setSimSpeed} keyboardType="numeric" />
                </View>
                <View style={styles.simInputWrapper}>
                  <Input label="Heading (°)" value={simHeading} onChangeText={setSimHeading} keyboardType="numeric" />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.simActionRow}>
                <Button
                  title="Send Simulated Coordinates"
                  variant="outline"
                  size="sm"
                  icon={<Icon name="navigation" size={14} color={colors.textPrimary} />}
                  onPress={handleSimulatedUpdate}
                />

                <Button
                  title={autoSimActive ? 'Stop Auto-Drive' : 'Auto-Drive Simulator (5s step)'}
                  variant={autoSimActive ? 'danger' : 'secondary'}
                  size="sm"
                  icon={<Icon name="refresh-cw" size={14} color={colors.textPrimary} />}
                  onPress={handleToggleAutoSim}
                />
              </View>
            </View>
          )}
        </CardBody>
      </Card>

      {/* Admin Pending Warning Notice */}
      {!isAdminActive && (
        <View style={[styles.alertBanner, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
          <Icon name="alert-triangle" size={18} color={colors.warning} />
          <View style={styles.alertTextWrapper}>
            <Text style={[styles.alertTitle, { color: colors.warning }]}>
              Platform Account Approval Required
            </Text>
            <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
              Your account status is <Text style={{ fontWeight: '700' }}>{driver.accountStatus}</Text>. Platform Administration must grant operational approval before you can operate rides.
            </Text>
          </View>
        </View>
      )}

      {/* TAB 1: OVERVIEW HUB */}
      {activeTab === 'overview' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ACTIVE DRIVER TRIP CARD */}
          {activeRide && (
            <Card variant="elevated" style={{ borderWidth: 2, borderColor: colors.primary, marginBottom: spacing.md }}>
              <CardHeader
                title={`Active Driver Trip — ${activeRide.passengerPseudonym}`}
                subtitle={`Ride ID: ${activeRide.rideId} • Status: ${activeRide.status}`}
                action={<Badge label={activeRide.status} variant="info" />}
              />
              <CardBody style={{ gap: spacing.md }}>
                <View style={styles.telemetryGrid}>
                  <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Passenger Pseudonym</Text>
                    <Text style={[styles.telemetryVal, { color: colors.primary }]}>{activeRide.passengerPseudonym}</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Approximate Pickup</Text>
                    <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>{activeRide.approximatePickupArea || 'Nearby'}</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Destination</Text>
                    <Text style={[styles.telemetryVal, { color: colors.textSecondary }]}>{activeRide.destinationText || 'Open'}</Text>
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

                {activeRide.status === 'ACCEPTED' && (
                  <Button
                    title="Start Trip Now"
                    variant="primary"
                    size="md"
                    loading={startingRideId === activeRide.id}
                    icon={<Icon name="play" size={16} color="#FFFFFF" />}
                    onPress={() => handleStartRide(activeRide.id)}
                  />
                )}

                {activeRide.status === 'ACTIVE' && (
                  <View style={{ gap: spacing.xs }}>
                    <Button
                      title="Request Trip Completion (Speed Check <= 10 km/h)"
                      variant="primary"
                      size="md"
                      loading={requestingCompletionId === activeRide.id}
                      icon={<Icon name="check-square" size={16} color="#FFFFFF" />}
                      onPress={() => handleRequestCompletion(activeRide.id)}
                    />
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      ℹ️ Speed check requires vehicle speed to be ≤ 10 km/h before requesting completion.
                    </Text>
                  </View>
                )}

                {activeRide.status === 'WAITING_PASSENGER_CONFIRM' && (
                  <View style={[styles.alertBanner, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
                    <Icon name="clock" size={18} color={colors.warning} />
                    <View style={styles.alertTextWrapper}>
                      <Text style={[styles.alertTitle, { color: colors.warning }]}>Completion Requested</Text>
                      <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                        Waiting for passenger to confirm drop-off on their device.
                      </Text>
                    </View>
                  </View>
                )}
              </CardBody>
            </Card>
          )}

          {/* INCOMING PENDING RIDE DISPATCHES */}
          {!activeRide && pendingRides.length > 0 && (
            <Card variant="elevated" style={{ borderWidth: 2, borderColor: colors.warning, marginBottom: spacing.md }}>
              <CardHeader
                title={`Incoming Dispatch Requests (${pendingRides.length})`}
                subtitle="15-second acceptance window • First-trigger-wins atomic assignment"
                action={<Badge label="DISPATCH ALERT" variant="warning" />}
              />
              <CardBody style={{ gap: spacing.md }}>
                {pendingRides.map((ride) => (
                  <View key={ride.id} style={[styles.simBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.simHeader, { color: colors.primary }]}>{ride.passengerPseudonym}</Text>
                      <Badge label={`${ride.remainingSeconds || 15}s window`} variant="warning" />
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Pickup Area: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{ride.approximatePickupArea}</Text>
                    </Text>
                    {ride.destinationText && (
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        Destination: <Text style={{ fontWeight: '600' }}>{ride.destinationText}</Text>
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                      <Button
                        title="ACCEPT RIDE"
                        variant="primary"
                        size="sm"
                        loading={acceptingRideId === ride.id}
                        icon={<Icon name="check" size={14} color="#FFFFFF" />}
                        onPress={() => handleAcceptRide(ride.id)}
                      />
                      <Button
                        title="DECLINE"
                        variant="outline"
                        size="sm"
                        loading={decliningRideId === ride.id}
                        icon={<Icon name="x" size={14} color={colors.textPrimary} />}
                        onPress={() => handleDeclineRide(ride.id)}
                      />
                    </View>
                  </View>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Multi-Layered Approval & Relationship Cards */}
          <View style={styles.statsGrid}>
            {/* Card 1: Admin Platform Approval */}
            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Admin Platform Approval</Text>
                  <Icon name="shield" size={18} color={isAdminActive ? colors.success : colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: isAdminActive ? colors.success : colors.warning }]}>
                  {driver.accountStatus}
                </Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>
                  {isAdminActive ? 'Platform approved' : 'Awaiting Admin review'}
                </Text>
              </CardBody>
            </Card>

            {/* Card 2: Driver Operating Mode */}
            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Operating Mode</Text>
                  <Icon name="navigation" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {isGarageDriver ? 'GARAGE DRIVER' : 'SELF-OWNED'}
                </Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>
                  {isGarageDriver ? 'Operates garage vehicle' : 'Operates own vehicle'}
                </Text>
              </CardBody>
            </Card>

            {/* Card 3: Garage Confirmation (Garage Driver) OR Vehicle Approval (Self-Owned) */}
            {isGarageDriver ? (
              <Card variant="elevated" style={styles.statCard}>
                <CardBody style={styles.statBody}>
                  <View style={styles.statHeader}>
                    <Text style={[styles.statTitle, { color: colors.textMuted }]}>Garage Confirmation</Text>
                    <Icon name="briefcase" size={18} color={colors.info} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {garageRelation ? garageRelation.garageConfirmationStatus : 'NO GARAGE'}
                  </Text>
                  <Text style={[styles.statFoot, { color: colors.textSecondary }]}>
                    {garageRelation ? garageRelation.garageName : 'Unassociated'}
                  </Text>
                </CardBody>
              </Card>
            ) : (
              <Card variant="elevated" style={styles.statCard}>
                <CardBody style={styles.statBody}>
                  <View style={styles.statHeader}>
                    <Text style={[styles.statTitle, { color: colors.textMuted }]}>Vehicle Verification</Text>
                    <Icon name="check-square" size={18} color={vehicle?.verificationStatus === 'APPROVED' ? colors.success : colors.warning} />
                  </View>
                  <Text style={[styles.statValue, { color: vehicle?.verificationStatus === 'APPROVED' ? colors.success : colors.warning }]}>
                    {vehicle ? vehicle.verificationStatus : 'NO VEHICLE'}
                  </Text>
                  <Text style={[styles.statFoot, { color: colors.textSecondary }]}>
                    {vehicle ? vehicle.shortVehicleNumber : 'Requires registration'}
                  </Text>
                </CardBody>
              </Card>
            )}

            {/* Card 4: Assigned Rickshaw */}
            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Assigned Rickshaw</Text>
                  <Icon name="truck" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {vehicle ? vehicle.shortVehicleNumber : 'Unassigned'}
                </Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>
                  {vehicle ? `Reg: ${vehicle.registrationNumber}` : 'No vehicle assigned'}
                </Text>
              </CardBody>
            </Card>
          </View>

          {/* Detailed Status Summary Card */}
          <Card variant="hero" style={styles.heroCard}>
            <CardHeader
              title={`${isGarageDriver ? 'Garage-Registered' : 'Self-Owned'} Driver Status Overview`}
              subtitle={`Account ID: ${driver.id}`}
              action={<Badge label={driver.accountStatus} variant={isAdminActive ? 'success' : 'warning'} />}
            />
            <CardBody style={styles.heroBody}>
              <View style={styles.infoGrid}>
                <View style={styles.infoBox}>
                  <Text style={[styles.infoBoxLabel, { color: colors.textMuted }]}>Driver Mode</Text>
                  <Text style={[styles.infoBoxValue, { color: colors.textPrimary }]}>{driver.driverMode}</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={[styles.infoBoxLabel, { color: colors.textMuted }]}>Admin Approval</Text>
                  <Text style={[styles.infoBoxValue, { color: isAdminActive ? colors.success : colors.warning }]}>
                    {driver.accountStatus}
                  </Text>
                </View>
                {isGarageDriver && (
                  <View style={styles.infoBox}>
                    <Text style={[styles.infoBoxLabel, { color: colors.textMuted }]}>Associated Garage</Text>
                    <Text style={[styles.infoBoxValue, { color: colors.textPrimary }]}>
                      {garageRelation ? garageRelation.garageName : 'None'}
                    </Text>
                  </View>
                )}
                <View style={styles.infoBox}>
                  <Text style={[styles.infoBoxLabel, { color: colors.textMuted }]}>Current Vehicle</Text>
                  <Text style={[styles.infoBoxValue, { color: colors.primary }]}>
                    {vehicle ? vehicle.shortVehicleNumber : 'Not Assigned'}
                  </Text>
                </View>
              </View>
            </CardBody>
            <CardFooter>
              <Button
                title="View My Vehicle Details"
                variant="primary"
                size="sm"
                icon={<Icon name="truck" size={14} color="#FFFFFF" />}
                onPress={() => setActiveTab('vehicle')}
              />
            </CardFooter>
          </Card>
        </ScrollView>
      )}

      {/* TAB 2: MY VEHICLE */}
      {activeTab === 'vehicle' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {vehicle ? (
            <Card variant="elevated" style={styles.vehicleDetailCard}>
              <CardHeader
                title={`Rickshaw ${vehicle.shortVehicleNumber}`}
                subtitle={`Ownership: ${vehicle.ownershipType} • Model: ${vehicle.modelName || 'Standard'}`}
                action={
                  <Badge
                    label={vehicle.verificationStatus}
                    variant={vehicle.verificationStatus === 'APPROVED' ? 'success' : 'warning'}
                  />
                }
              />
              <CardBody style={styles.vehicleBody}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Short Vehicle Number (Car Number):</Text>
                  <Text style={[styles.shortNumHighlight, { color: colors.primary }]}>{vehicle.shortVehicleNumber}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Registration Number:</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{vehicle.registrationNumber}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Admin Verification Status:</Text>
                  <Badge
                    label={vehicle.verificationStatus}
                    variant={vehicle.verificationStatus === 'APPROVED' ? 'success' : 'warning'}
                  />
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Operational Status:</Text>
                  <Badge
                    label={vehicle.status}
                    variant={vehicle.status === 'AVAILABLE' ? 'success' : 'neutral'}
                  />
                </View>

                {isGarageDriver && vehicle.garageName && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Managing Garage:</Text>
                    <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{vehicle.garageName}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Cryptographic QR Token:</Text>
                  <Text style={[styles.qrCodeText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {vehicle.qrIdentifier}
                  </Text>
                </View>
              </CardBody>
              <CardFooter>
                {!isGarageDriver && (
                  <Button
                    title="Update Vehicle Details"
                    variant="outline"
                    size="sm"
                    icon={<Icon name="edit" size={14} color={colors.textPrimary} />}
                    onPress={() => {
                      setSelfShortNum(vehicle.shortVehicleNumber);
                      setSelfRegNum(vehicle.registrationNumber);
                      setSelfModelName(vehicle.modelName || '');
                      setSelfMfgYear(vehicle.manufacturingYear?.toString() || '2024');
                      setShowSelfVehicleModal(true);
                    }}
                  />
                )}
              </CardFooter>
            </Card>
          ) : (
            <EmptyState
              title="No Vehicle Assigned"
              description={
                isGarageDriver
                  ? 'Your Garage Owner has not assigned a rickshaw to your account yet. Vehicle assignments are managed by your Garage Owner.'
                  : 'You have not registered your self-owned rickshaw yet. Register your vehicle details to submit for Admin approval.'
              }
              actionTitle={!isGarageDriver ? 'Register Self-Owned Rickshaw' : undefined}
              onAction={!isGarageDriver ? () => setShowSelfVehicleModal(true) : undefined}
            />
          )}
        </ScrollView>
      )}

      {/* TAB 3: GARAGE INFO (OR SELF-OWNED INDEPENDENCE NOTICE) */}
      {activeTab === 'garage' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isGarageDriver ? (
            garageRelation ? (
              <Card variant="elevated" style={styles.garageDetailCard}>
                <CardHeader
                  title={garageRelation.garageName}
                  subtitle={`Address: ${garageRelation.garageAddress}`}
                  action={
                    <Badge
                      label={`Confirmation: ${garageRelation.garageConfirmationStatus}`}
                      variant={garageRelation.garageConfirmationStatus === 'ACTIVE' ? 'success' : 'warning'}
                    />
                  }
                />
                <CardBody style={styles.garageBody}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Garage Name:</Text>
                    <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{garageRelation.garageName}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Owner Phone:</Text>
                    <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{garageRelation.garagePhone}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Garage Address:</Text>
                    <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{garageRelation.garageAddress}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Garage Approval Status:</Text>
                    <Badge
                      label={garageRelation.garageVerificationStatus}
                      variant={garageRelation.garageVerificationStatus === 'APPROVED' ? 'success' : 'warning'}
                    />
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Driver Association Status:</Text>
                    <Badge
                      label={garageRelation.garageConfirmationStatus}
                      variant={garageRelation.garageConfirmationStatus === 'ACTIVE' ? 'success' : 'warning'}
                    />
                  </View>
                </CardBody>
              </Card>
            ) : (
              <EmptyState
                title="No Active Garage Association"
                description="You are currently unassociated with a garage. Contact a registered Garage Owner to link your driver account."
              />
            )
          ) : (
            <Card variant="default" style={styles.independenceCard}>
              <CardHeader title="Self-Owned Driver Independence" subtitle="Operating Mode: SELF_OWNED" />
              <CardBody>
                <Text style={[styles.indepText, { color: colors.textSecondary }]}>
                  As a Self-Owned Driver, you operate independently and manage your own vehicle directly. You do not belong to a Garage Owner or require garage confirmation.
                </Text>
              </CardBody>
            </Card>
          )}

          {/* Garage Association History */}
          {isGarageDriver && garageHistory.length > 0 && (
            <Card variant="default" style={styles.historyCard}>
              <CardHeader title="Garage Association History" subtitle="Previous garage links and relationship logs" />
              <CardBody style={styles.historyBody}>
                {garageHistory.map((assoc) => (
                  <View key={assoc._id} style={[styles.historyRow, { borderColor: colors.border }]}>
                    <View>
                      <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
                        {assoc.garageId?.name || 'Garage Link'}
                      </Text>
                      <Text style={[styles.historySub, { color: colors.textMuted }]}>
                        Status: {assoc.status} • Linked: {new Date(assoc.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Badge label={assoc.status} variant={assoc.status === 'ACTIVE' ? 'success' : 'neutral'} />
                  </View>
                ))}
              </CardBody>
            </Card>
          )}
        </ScrollView>
      )}

      {/* TAB 4: DRIVER HISTORY LOG */}
      {activeTab === 'history' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card variant="elevated" style={styles.historyCard}>
            <CardHeader title="Vehicle Assignment Log" subtitle="Historical record of rickshaw assignments" />
            <CardBody>
              {loadingHistory ? (
                <LoadingState message="Fetching assignment history log..." />
              ) : assignmentHistory.length === 0 ? (
                <EmptyState title="No History Records" description="No vehicle assignments have been recorded for your account." />
              ) : (
                <View style={styles.historyList}>
                  {assignmentHistory.map((item) => (
                    <View key={item._id} style={[styles.historyItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={styles.historyItemHeader}>
                        <Text style={[styles.historyItemVeh, { color: colors.primary }]}>
                          {item.vehicleId ? `Vehicle ${item.vehicleId.shortVehicleNumber}` : 'Unknown Vehicle'}
                        </Text>
                        <Badge label={item.isCurrent ? 'CURRENT' : 'HISTORICAL'} variant={item.isCurrent ? 'success' : 'neutral'} />
                      </View>
                      <Text style={[styles.historyItemText, { color: colors.textSecondary }]}>
                        Assigned: {new Date(item.assignedAt).toLocaleString()}
                      </Text>
                      {item.unassignedAt && (
                        <Text style={[styles.historyItemText, { color: colors.textMuted }]}>
                          Unlinked: {new Date(item.unassignedAt).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </CardBody>
          </Card>

          {/* Completed Trips & Journey Telemetry History */}
          <Card variant="elevated">
            <CardHeader
              title="Completed Driver Trips & Earnings"
              subtitle="Verified ride records, pseudonymous passenger tracking & earnings ledger"
            />
            <CardBody style={{ gap: spacing.md }}>
              {loadingDriverTripHistory ? (
                <LoadingState message="Fetching driver completed trip records..." />
              ) : driverTripHistory.length === 0 ? (
                <EmptyState
                  title="No Completed Trips"
                  description="Completed trips, passenger ratings, and shift earnings will appear here after finishing rides."
                />
              ) : (
                driverTripHistory.map((trip) => (
                  <View
                    key={trip.id}
                    style={[
                      styles.historyItem,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.historyItemHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Icon name="navigation" size={16} color={colors.primary} />
                        <Text style={[styles.historyItemVeh, { color: colors.textPrimary }]}>
                          {trip.rideId}
                        </Text>
                        {/* Passenger Pseudonym (Privacy Enforced - No Real Name/Phone) */}
                        <Badge label={trip.passengerPseudonym || 'Passenger'} variant="info" />
                        <Badge label={trip.status} variant="success" />
                      </View>
                      <Text style={[styles.historyItemText, { color: colors.textMuted }]}>
                        {trip.completedAt ? new Date(trip.completedAt).toLocaleString() : 'Completed'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Vehicle</Text>
                        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>Vehicle {trip.shortVehicleNumber}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Pickup Area</Text>
                        <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>{trip.approximatePickupArea || 'GPS Coordinates'}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Distance / Duration</Text>
                        <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>
                          {(trip.distanceMeters / 1000).toFixed(2)} km ({Math.round(trip.durationSeconds / 60)} m)
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Fare Collected</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '800' }}>৳{trip.fareAmount || 0}</Text>
                          <PaymentMethodBadge method={trip.paymentMethod || 'CASH'} />
                        </View>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                      {trip.passengerRating ? (
                        <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 13 }}>★ {trip.passengerRating}.0 Passenger Rating</Text>
                      ) : (
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Unrated Trip</Text>
                      )}

                      <Button
                        title="Inspect Route Map"
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
        </ScrollView>
      )}

      {/* MODAL: DRIVER DETAILED HISTORICAL JOURNEY & MAP */}
      <Modal
        visible={showTripModal}
        onClose={() => {
          setShowTripModal(false);
          setSelectedTrip(null);
        }}
        title={`Driver Journey Log: ${selectedTrip?.rideId || 'Trip Detail'}`}
      >
        {loadingTripDetail || !selectedTrip ? (
          <LoadingState message="Loading historical journey route map..." />
        ) : (
          <ScrollView style={{ maxHeight: 540 }}>
            <View style={{ gap: spacing.md }}>
              <RealMapContainer
                isHistoricalView={true}
                title={`Historical Path: ${selectedTrip.rideId}`}
                subtitle={`Official GPS Telemetry Path • Vehicle ${selectedTrip.shortVehicleNumber}`}
                height={300}
                startLocation={
                  selectedTrip.pickupLocation
                    ? {
                        latitude: selectedTrip.pickupLocation.coordinates[1],
                        longitude: selectedTrip.pickupLocation.coordinates[0],
                        label: 'Pickup Location',
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

              <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>Ride & Pseudonym Identity</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Trip Reference:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.rideId}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Passenger Pseudonym:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{selectedTrip.passengerPseudonym || 'Passenger'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Vehicle Short Number:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Vehicle {selectedTrip.shortVehicleNumber}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Driver Operating Mode:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.driverMode || 'DRIVER'}</Text>
                </View>
              </View>

              <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>Telemetry & Settlement</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Distance Telemetry:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{(selectedTrip.distanceMeters / 1000).toFixed(2)} km</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Gross Fare Collected:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>৳{selectedTrip.fareAmount || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Driver Shift Earnings:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.success }}>৳{selectedTrip.settlement?.driverEarnings || selectedTrip.fareAmount || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Platform Commission:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>৳{selectedTrip.settlement?.platformCommission || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Payment Method:</Text>
                  <PaymentMethodBadge method={selectedTrip.paymentMethod || 'CASH'} size="md" />
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* TAB 5: DRIVER PROFILE */}
      {activeTab === 'profile' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card variant="hero" style={styles.profileCard}>
            <CardHeader
              title="Driver Account Identity & Profile"
              subtitle={`User ID: ${driver.id}`}
              action={<Badge label={driver.accountStatus} variant={isAdminActive ? 'success' : 'warning'} />}
            />
            <CardBody style={styles.profileBody}>
              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Full Name:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{driver.name}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Phone Number:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{driver.phone}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Email Address:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{driver.email || 'Not provided'}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Driver Operating Mode:</Text>
                <Text style={[styles.profileVal, { color: colors.primary }]}>{driver.driverMode}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Admin Platform Status:</Text>
                <Badge label={driver.accountStatus} variant={isAdminActive ? 'success' : 'warning'} />
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Registration Date:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>
                  {new Date(driver.createdAt).toLocaleString()}
                </Text>
              </View>
            </CardBody>
          </Card>
        </ScrollView>
      )}

      {/* MODAL: REGISTER SELF-OWNED VEHICLE */}
      <Modal
        visible={showSelfVehicleModal}
        onClose={() => setShowSelfVehicleModal(false)}
        title="Register Self-Owned Rickshaw"
        footer={
          <>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowSelfVehicleModal(false)} />
            <Button
              title="Submit for Approval"
              variant="primary"
              size="sm"
              loading={submittingVehicle}
              onPress={handleRegisterSelfVehicle}
            />
          </>
        }
      >
        <View style={styles.formStack}>
          <Input
            label="Short Vehicle Number (Search Identifier) *"
            placeholder="e.g. SV-2041"
            value={selfShortNum}
            onChangeText={(txt) => setSelfShortNum(txt.toUpperCase())}
            helperText="Human-readable unique car identifier"
          />
          <Input
            label="Government Registration Number *"
            placeholder="e.g. DHK-HA-2041"
            value={selfRegNum}
            onChangeText={(txt) => setSelfRegNum(txt.toUpperCase())}
          />
          <Input
            label="Rickshaw Model Name"
            placeholder="e.g. Private Solar Rickshaw Pro"
            value={selfModelName}
            onChangeText={setSelfModelName}
          />
          <Input
            label="Manufacturing Year"
            placeholder="2024"
            value={selfMfgYear}
            onChangeText={setSelfMfgYear}
            keyboardType="number-pad"
          />
        </View>
      </Modal>

      <RealQRScanner
        visible={showDriverQRScanner}
        onClose={() => setShowDriverQRScanner(false)}
        onScanSuccess={handleDriverScanSuccess}
        title="Scan Rickshaw Physical QR Code"
        subtitle="Point camera at physical rickshaw QR code to confirm vehicle assignment for your shift."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  driverName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  driverSub: {
    fontSize: 13,
  },
  navTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  navTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationPanel: {
    width: '100%',
  },
  locationBody: {
    gap: spacing.md,
  },
  locationControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  telemetryCard: {
    flex: 1,
    minWidth: 140,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  telemetryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  telemetryVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  simToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  simToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  simBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  simHeader: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  simInputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  simInputWrapper: {
    flex: 1,
    minWidth: 120,
  },
  simActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  alertTextWrapper: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
  },
  statBody: {
    padding: spacing.md,
    gap: 6,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statFoot: {
    fontSize: 11,
  },
  heroCard: {
    width: '100%',
  },
  heroBody: {
    gap: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoBox: {
    flex: 1,
    minWidth: 140,
    gap: 2,
  },
  infoBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoBoxValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  vehicleDetailCard: {
    width: '100%',
  },
  vehicleBody: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2D34',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  shortNumHighlight: {
    fontSize: 15,
    fontWeight: '800',
  },
  qrCodeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  garageDetailCard: {
    width: '100%',
  },
  garageBody: {
    gap: spacing.sm,
  },
  independenceCard: {
    width: '100%',
  },
  indepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  historyCard: {
    width: '100%',
  },
  historyBody: {
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historySub: {
    fontSize: 12,
    marginTop: 2,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemVeh: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyItemText: {
    fontSize: 12,
  },
  placeholderCard: {
    width: '100%',
  },
  profileCard: {
    width: '100%',
  },
  profileBody: {
    gap: spacing.sm,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2D34',
  },
  profileLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  profileVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  formStack: {
    gap: spacing.md,
  },
});
