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
  const [autoSimActive, setAutoSimActive] = useState(false);

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

  useEffect(() => {
    syncLocationStatus();
  }, [syncLocationStatus]);

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

  // Location update handler with 4.5s throttling
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
          showToast(res.error || 'Passenger location sync error', 'danger');
        }
      }
    },
    [showToast]
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

    // Attempt browser/device watchPosition
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

    if (autoSimIntervalRef.current) {
      clearInterval(autoSimIntervalRef.current);
      autoSimIntervalRef.current = null;
      setAutoSimActive(false);
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
