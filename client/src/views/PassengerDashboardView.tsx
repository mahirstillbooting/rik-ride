import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { Icon } from '../components/ui/Icon';
import { RealMapContainer } from '../components/ui/RealMapContainer';
import { spacing, borderRadius } from '../theme/spacing';
import { passengerLocationApiService } from '../services/passengerLocationService';
import { SharingStatus } from '../services/locationService';
import { clientRideService, RideData } from '../services/rideService';

export const PassengerDashboardView: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Core Location & Permission States
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

  // Tracking refs
  const watchIdRef = useRef<number | null>(null);
  const lastSentTsRef = useRef<number>(0);
  const autoSimIntervalRef = useRef<any>(null);

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
    }
  }, []);

  useEffect(() => {
    syncLocationStatus();
    pollActiveRide();

    // Poll active ride every 3 seconds
    const rideInterval = setInterval(() => {
      pollActiveRide();
    }, 3000);

    return () => clearInterval(rideInterval);
  }, [syncLocationStatus, pollActiveRide]);

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

  // Location update handler with throttling
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
          setLocationError(res.error || 'Failed to sync passenger live location');
        }
      }
    },
    []
  );

  // Start Live Location Sharing
  const handleStartSharing = async () => {
    setStartingSharing(true);
    setLocationError(null);

    const res = await passengerLocationApiService.startSharing();
    setStartingSharing(false);

    if (!res.success) {
      setLocationError(res.error || 'Location sharing initialization failed');
      showToast(res.error || 'Cannot start location sharing', 'danger');
      return;
    }

    setIsSharing(true);
    setSharingStatus('LOCATION_ACTIVE');
    showToast(res.message || 'Passenger location sharing activated!', 'success');

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
            console.warn('Passenger Geolocation error:', err.message);
            if (err.code === err.PERMISSION_DENIED) {
              setPermissionStatus('Denied');
            }
            setLocationError(`GPS notice: ${err.message}. You can use Dev Location Simulator.`);
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

    await passengerLocationApiService.stopSharing();
    setIsSharing(false);
    setSharingStatus('LOCATION_OFF');
    showToast('Passenger location sharing stopped', 'info');
  };

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

  // Create Ride Request
  const handleRequestRide = async () => {
    if (!currentLoc) {
      showToast('Current location required. Please start GPS or send simulated location first.', 'warning');
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

  // Confirm Ride Drop-off Completion
  const handleConfirmCompletion = async () => {
    if (!activeRide) return;

    setConfirmingCompletion(true);
    const res = await clientRideService.confirmPassengerCompletion(activeRide.id);
    setConfirmingCompletion(false);

    if (res.success) {
      showToast('Drop-off confirmed! Trip completed successfully.', 'success');
      setActiveRide(null);
      pollActiveRide();
    } else {
      showToast(res.error || 'Failed to confirm drop-off', 'danger');
    }
  };

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

      {/* RIDE DISPATCH & LIFECYCLE SECTION */}
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
            {/* Status-specific Alerts */}
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
            </View>

            {/* Confirmation Button for WAITING_PASSENGER_CONFIRM or ACTIVE */}
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
          </CardBody>
        </Card>
      ) : (
        /* Ride Request Panel */
        <Card variant="elevated" style={styles.requestCard}>
          <CardHeader
            title="Request an Electric Rickshaw"
            subtitle="Broadcast ride request with current device GPS coordinates"
            action={<Badge label="READY" variant="success" />}
          />
          <CardBody style={styles.requestBody}>
            <Input
              label="Destination (Optional description)"
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
                disabled={!currentLoc}
                icon={<Icon name="navigation" size={18} color="#FFFFFF" />}
                onPress={handleRequestRide}
              />
              {!currentLoc && (
                <Text style={[styles.locWarning, { color: colors.warning }]}>
                  ⚠️ Please start Live GPS or set simulated location below first.
                </Text>
              )}
            </View>
          </CardBody>
        </Card>
      )}

      {/* Live GPS Telemetry & Location Sharing Control Panel */}
      <Card variant="elevated" style={styles.locationPanel}>
        <CardHeader
          title="Passenger Live Location Sharing"
          subtitle="Secure browser/device GPS ingestion foundation for authenticated passengers"
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
                title="Start Location Sharing"
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
                icon={<Icon name="x" size={16} color="#FFFFFF" />}
                onPress={handleStopSharing}
              />
            )}

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
              <Text style={[styles.simToggleText, { color: showSimPanel ? colors.primary : colors.textSecondary }]}>
                {showSimPanel ? 'Hide Dev Simulator' : 'Dev Location Simulator'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Alert Banner for Errors */}
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
          <View style={styles.telemetryGrid}>
            <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Permission Status</Text>
              <Text
                style={[
                  styles.telemetryVal,
                  { color: permissionStatus === 'Granted' ? colors.success : permissionStatus === 'Denied' ? colors.danger : colors.textPrimary },
                ]}
              >
                {permissionStatus}
              </Text>
            </View>

            <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Current Position</Text>
              <Text style={[styles.telemetryVal, { color: colors.primary }]}>
                {currentLoc ? `${currentLoc.latitude.toFixed(5)}°, ${currentLoc.longitude.toFixed(5)}°` : 'Location Inactive'}
              </Text>
            </View>

            <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>GPS Accuracy</Text>
              <Text style={[styles.telemetryVal, { color: colors.textPrimary }]}>
                {currentLoc?.accuracy !== undefined ? `±${currentLoc.accuracy.toFixed(1)} m` : 'N/A'}
              </Text>
            </View>

            <View style={[styles.telemetryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>Last Ingestion</Text>
              <Text style={[styles.telemetryVal, { color: colors.textSecondary }]}>
                {lastUpdateTs ? lastUpdateTs.toLocaleTimeString() : 'No updates'}
              </Text>
            </View>
          </View>

          {/* Real Interactive Map Canvas */}
          <View style={{ marginTop: spacing.sm }}>
            <RealMapContainer
              latitude={currentLoc?.latitude}
              longitude={currentLoc?.longitude}
              accuracy={currentLoc?.accuracy}
              status={sharingStatus}
              title="Passenger Device GPS Location Map"
              subtitle={
                isSharing
                  ? `Live Telemetry via ${currentLoc?.source || 'DEVICE_GPS'} • Synchronized`
                  : 'Location Sharing Inactive — Tap "Start Location Sharing" to enable stream'
              }
              height={360}
              allowExpand={true}
            />
          </View>

          {/* Dev Location Simulator Panel */}
          {showSimPanel && (
            <View style={[styles.simBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.simHeader, { color: colors.primary }]}>
                Dev Passenger GPS Location Simulator
              </Text>
              <Text style={[styles.historySub, { color: colors.textSecondary }]}>
                Use standard Dhaka test locations or enter custom coordinates to simulate passenger position without physical GPS hardware.
              </Text>

              {/* Presets */}
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
  requestCard: {
    width: '100%',
  },
  requestBody: {
    gap: spacing.md,
  },
  requestActionRow: {
    gap: spacing.xs,
  },
  locWarning: {
    fontSize: 12,
    marginTop: 4,
  },
  activeRideCard: {
    width: '100%',
    borderWidth: 2,
  },
  activeRideBody: {
    gap: spacing.md,
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
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  simToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  simToggleText: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  simHeader: {
    fontSize: 14,
    fontWeight: '800',
  },
  historySub: {
    fontSize: 12,
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
});
