import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useRouter } from '../navigation/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { MapContainer } from '../components/ui/MapContainer';
import { RealMapContainer } from '../components/ui/RealMapContainer';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { spacing, borderRadius } from '../theme/spacing';
import {
  adminService,
  AdminStats,
  PendingQueueItem,
  AuditLogItem,
  AdminFleetSummary,
  AdminFleetDriverLocation,
} from '../services/adminService';
import { clientRideService, RideData, HistoricalTripSummary, DetailedTripRecord } from '../services/rideService';
import { clientSafetyService, SafetyEventData } from '../services/safetyService';
import { AdminAnalyticsView } from './AdminAnalyticsView';

export const AdminDashboardView: React.FC = () => {
  const { colors, mode } = useTheme();
  const { currentNavItem, setActiveRouteId } = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin Trip History States
  const [adminTripHistory, setAdminTripHistory] = useState<HistoricalTripSummary[]>([]);
  const [loadingAdminTrips, setLoadingAdminTrips] = useState(false);
  const [historySearchText, setHistorySearchText] = useState('');
  const [historySafetyOnly, setHistorySafetyOnly] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [selectedTrip, setSelectedTrip] = useState<DetailedTripRecord | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);

  // Stats & Data state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingQueue, setPendingQueue] = useState<PendingQueueItem[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [garagesList, setGaragesList] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [fleetLocations, setFleetLocations] = useState<{ drivers: any[]; passengers: any[] }>({ drivers: [], passengers: [] });
  const [fleetSummary, setFleetSummary] = useState<AdminFleetSummary>({
    totalFleet: 0,
    available: 0,
    activeRide: 0,
    idle: 0,
    stale: 0,
    emergency: 0,
    unverified: 0,
  });
  const [activeRidesList, setActiveRidesList] = useState<RideData[]>([]);

  // Command Center Filtering & Selection States
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('ALL');
  const [fleetSearchText, setFleetSearchText] = useState<string>('');
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState<AdminFleetDriverLocation | null>(null);
  const [adminFleetMode, setAdminFleetMode] = useState<'ALL' | 'GARAGE' | 'SELF_OWNED'>('ALL');
  const [selectedGarageFilterId, setSelectedGarageFilterId] = useState<string>('ALL');

  // Filtering states
  const [pendingTypeFilter, setPendingTypeFilter] = useState<'ALL' | 'GARAGE' | 'USER' | 'VEHICLE'>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSearchText, setUserSearchText] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Safety & Emergency Command Center State
  const [safetyEvents, setSafetyEvents] = useState<SafetyEventData[]>([]);
  const [safetyStats, setSafetyStats] = useState({ redCount: 0, yellowCount: 0, totalActive: 0 });
  const [isSirenMuted, setIsSirenMuted] = useState(false);
  const [selectedResolveEvent, setSelectedResolveEvent] = useState<SafetyEventData | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [focusedCoords, setFocusedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Siren Web Audio Synthesizer Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // Access Security Check
  if (user && user.role !== 'ADMIN') {
    return (
      <ErrorState
        title="Access Denied"
        message="System Admin authorization required. Attempting to manually navigate to Admin Command Center as non-admin role has been blocked."
      />
    );
  }

  // Audio Siren Player
  const startSiren = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isSirenMuted) {
      stopSiren();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (!oscRef.current) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscRef.current = osc;
      }
    } catch (e) {
      console.warn('Siren audio init:', e);
    }
  }, [isSirenMuted]);

  const stopSiren = useCallback(() => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch {}
      oscRef.current = null;
    }
  }, []);

  // Poll Safety Events
  const fetchSafetyEvents = useCallback(async () => {
    const res = await clientSafetyService.getActiveSafetyEvents();
    if (res.success && res.events) {
      setSafetyEvents(res.events);
      const redCount = res.redCount || 0;
      const yellowCount = res.yellowCount || 0;
      setSafetyStats({ redCount, yellowCount, totalActive: res.totalActiveEvents || 0 });

      // Siren triggers if unacknowledged RED SOS event exists
      const hasUnackRed = res.events.some((e) => e.severity === 'RED' && e.status === 'ACTIVE');
      if (hasUnackRed && !isSirenMuted) {
        startSiren();
      } else {
        stopSiren();
      }
    }
  }, [isSirenMuted, startSiren, stopSiren]);

  useEffect(() => {
    fetchSafetyEvents();
    const interval = setInterval(() => {
      fetchSafetyEvents();
    }, 3000);

    return () => {
      clearInterval(interval);
      stopSiren();
    };
  }, [fetchSafetyEvents, stopSiren]);

  const fetchFleetLocations = useCallback(async () => {
    if (currentNavItem.id !== 'admin-overview') return;
    try {
      const locationsRes = await adminService.getFleetAndPassengerLocations({
        statusFilter: fleetStatusFilter !== 'ALL' ? fleetStatusFilter : undefined,
        search: fleetSearchText.trim() || undefined,
      });
      setFleetLocations({ drivers: locationsRes.drivers, passengers: locationsRes.passengers });
      setFleetSummary(locationsRes.summary);
    } catch (e) {
      console.warn('Fleet locations fetch notice:', e);
    }
  }, [currentNavItem.id, fleetStatusFilter, fleetSearchText]);

  useEffect(() => {
    fetchFleetLocations();
    if (currentNavItem.id !== 'admin-overview') return;
    const interval = setInterval(fetchFleetLocations, 5000);
    return () => clearInterval(interval);
  }, [fetchFleetLocations, currentNavItem.id]);

  const loadDataForActiveTab = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (currentNavItem.id === 'admin-overview') {
        const [statsRes, pendingRes, logsRes, locationsRes, ridesRes] = await Promise.all([
          adminService.getStats(),
          adminService.getPendingQueue(),
          adminService.getAuditLogs(1, 10),
          adminService.getFleetAndPassengerLocations({
            statusFilter: fleetStatusFilter !== 'ALL' ? fleetStatusFilter : undefined,
            search: fleetSearchText.trim() || undefined,
          }).catch(() => ({
            success: false,
            drivers: [],
            passengers: [],
            totalActive: 0,
            summary: { totalFleet: 0, available: 0, activeRide: 0, idle: 0, stale: 0, emergency: 0, unverified: 0 },
          })),
          clientRideService.getAdminActiveRides().catch(() => ({ rides: [] })),
        ]);
        setStats(statsRes);
        setPendingQueue(pendingRes);
        setAuditLogs(logsRes);
        setFleetLocations({ drivers: locationsRes.drivers, passengers: locationsRes.passengers });
        setFleetSummary(locationsRes.summary);
        setActiveRidesList(ridesRes.rides || []);
      } else if (currentNavItem.id === 'admin-approvals') {
        const queueRes = await adminService.getPendingQueue();
        setPendingQueue(queueRes);
      } else if (currentNavItem.id === 'admin-users') {
        const usersRes = await adminService.getUsers({
          role: userRoleFilter !== 'ALL' ? userRoleFilter : undefined,
          status: userStatusFilter !== 'ALL' ? userStatusFilter : undefined,
          search: userSearchText.trim() || undefined,
        });
        setUsersList(usersRes);
      } else if (currentNavItem.id === 'admin-garages') {
        const garagesRes = await adminService.getGarages();
        setGaragesList(garagesRes);
      } else if (currentNavItem.id === 'admin-drivers') {
        const driversRes = await adminService.getDrivers();
        setDriversList(driversRes);
      } else if (currentNavItem.id === 'admin-vehicles') {
        const vehiclesRes = await adminService.getVehicles();
        setVehiclesList(vehiclesRes);
      } else if (currentNavItem.id === 'admin-rides') {
        await loadAdminTripHistory();
      } else if (currentNavItem.id === 'admin-audit') {
        const logsRes = await adminService.getAuditLogs(1, 50);
        setAuditLogs(logsRes);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setErrorMsg(err.message || 'Failed to fetch admin data from server.');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminTripHistory = useCallback(async () => {
    setLoadingAdminTrips(true);
    const res = await clientRideService.getAdminTripHistory({
      search: historySearchText.trim() || undefined,
      hasSafetyEvent: historySafetyOnly ? 'true' : undefined,
      page: historyPage,
      limit: 20,
    });
    if (res.success && res.trips) {
      setAdminTripHistory(res.trips);
      if (res.pagination) {
        setHistoryTotalPages(res.pagination.pages || 1);
      }
    } else {
      showToast(res.error || 'Failed to fetch admin trip history', 'danger');
    }
    setLoadingAdminTrips(false);
  }, [historySearchText, historySafetyOnly, historyPage, showToast]);

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

  useEffect(() => {
    loadDataForActiveTab();
  }, [currentNavItem.id, userRoleFilter, userStatusFilter, historySearchText, historySafetyOnly, historyPage]);

  const handleApprovalAction = async (
    entityType: 'USER' | 'GARAGE' | 'VEHICLE',
    entityId: string,
    action: 'APPROVE' | 'REJECT' | 'SUSPEND'
  ) => {
    setActionLoadingId(entityId);
    try {
      const result = await adminService.processApproval(entityType, entityId, action);
      showToast(result.message || `Action ${action} processed successfully`, 'success');
      await loadDataForActiveTab();
    } catch (err: any) {
      showToast(err.message || 'Failed to process approval action', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Safety Action Handlers
  const handleAcknowledgeSafety = async (eventId: string) => {
    const res = await clientSafetyService.acknowledgeSafetyEvent(eventId);
    if (res.success) {
      showToast('Safety alert acknowledged by Admin.', 'success');
      fetchSafetyEvents();
    } else {
      showToast(res.error || 'Failed to acknowledge alert', 'danger');
    }
  };

  const handleConfirmResolveSafety = async () => {
    if (!selectedResolveEvent) return;
    setResolvingLoading(true);
    const res = await clientSafetyService.resolveSafetyEvent(selectedResolveEvent.eventId, resolveNotes);
    setResolvingLoading(false);

    if (res.success) {
      showToast('Safety event successfully resolved.', 'success');
      setSelectedResolveEvent(null);
      setResolveNotes('');
      fetchSafetyEvents();
    } else {
      showToast(res.error || 'Failed to resolve safety event', 'danger');
    }
  };

  const handleFocusOnEvent = (event: SafetyEventData) => {
    if (event.passengerLatitude && event.passengerLongitude) {
      setFocusedCoords({ lat: event.passengerLatitude, lng: event.passengerLongitude });
      showToast(`Map focused on Safety Event ${event.eventId}`, 'info');
    } else {
      showToast('No coordinates available for this safety event', 'warning');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
        return <Badge label="ACTIVE" variant="success" />;
      case 'PENDING':
        return <Badge label="PENDING REVIEW" variant="warning" />;
      case 'REJECTED':
      case 'SUSPENDED':
      case 'DISABLED':
        return <Badge label={status} variant="danger" />;
      default:
        return <Badge label={status} variant="neutral" />;
    }
  };

  // Build map markers for active safety events
  const safetyPassengerMarkers = safetyEvents
    .filter((e) => e.passengerLatitude && e.passengerLongitude)
    .map((e) => ({
      id: `p-${e.eventId}`,
      type: 'PASSENGER' as const,
      lat: e.passengerLatitude!,
      lng: e.passengerLongitude!,
      label: `PASSENGER [${e.eventId}]`,
      sublabel: `${e.severity} ${e.eventType} • ${e.passengerId?.name || 'Passenger'}`,
    }));

  const safetyDriverMarkers = safetyEvents
    .filter((e) => e.driverLatitude && e.driverLongitude)
    .map((e) => ({
      id: `d-${e.eventId}`,
      type: 'DRIVER' as const,
      lat: e.driverLatitude!,
      lng: e.driverLongitude!,
      label: `VEHICLE [${e.eventId}]`,
      sublabel: `Rickshaw ${e.vehicleId?.shortVehicleNumber || ''} • Driver: ${e.driverId?.name || 'Driver'}`,
    }));

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        {/* Top Command Bar Header with Gradient Accent */}
        <GradientView
          preset="accentHero"
          style={[styles.commandHeader, { borderColor: colors.border }]}
        >
          <View style={styles.commandHeaderTitleRow}>
            <View style={[styles.headerAccentDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Admin Command Center — {currentNavItem.label}
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Central Operational Monitoring & Entity Approval Workflows
          </Text>
        </GradientView>

        {errorMsg && (
          <ErrorState
            title="Connection Alert"
            message={errorMsg}
            onRetry={loadDataForActiveTab}
          />
        )}

        {loading ? (
          <LoadingState message="Connecting to MongoDB Atlas backend..." />
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {currentNavItem.id === 'admin-overview' && (
              <View style={styles.viewSection}>
                {/* Active Emergency Safety Alert Banner */}
                {safetyStats.totalActive > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.pendingBanner,
                      {
                        backgroundColor: safetyStats.redCount > 0 ? '#FEE2E2' : '#FEF3C7',
                        borderColor: safetyStats.redCount > 0 ? '#DC2626' : '#D97706',
                      },
                    ]}
                    onPress={() => setActiveRouteId('admin-safety')}
                  >
                    <Icon
                      name="alert-triangle"
                      size={20}
                      color={safetyStats.redCount > 0 ? '#DC2626' : '#D97706'}
                    />
                    <View style={styles.bannerTextCol}>
                      <Text
                        style={[
                          styles.bannerTitle,
                          { color: safetyStats.redCount > 0 ? '#DC2626' : '#D97706' },
                        ]}
                      >
                        {safetyStats.totalActive} Active Safety Events ({safetyStats.redCount} RED SOS, {safetyStats.yellowCount} Yellow Alerts)
                      </Text>
                      <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                        Immediate operational dispatch review required on Safety Command Center.
                      </Text>
                    </View>
                    <Text style={[styles.bannerAction, { color: safetyStats.redCount > 0 ? '#DC2626' : '#D97706' }]}>
                      Open Safety Command →
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Pending Approval Alert Banner */}
                {stats && stats.pendingApprovals > 0 && (
                  <TouchableOpacity
                    style={[styles.pendingBanner, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}
                    onPress={() => setActiveRouteId('admin-approvals')}
                  >
                    <Icon name="alert-triangle" size={20} color={colors.primary} />
                    <View style={styles.bannerTextCol}>
                      <Text style={[styles.bannerTitle, { color: colors.primary }]}>
                        {stats.pendingApprovals} Pending Approval Requests Await Review
                      </Text>
                      <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                        {stats.breakdown.pendingGarages} Garages • {stats.breakdown.pendingUsers} Drivers/Users • {stats.breakdown.pendingVehicles} Vehicles
                      </Text>
                    </View>
                    <Text style={[styles.bannerAction, { color: colors.primary }]}>Review Queue →</Text>
                  </TouchableOpacity>
                )}

                {/* Primary Aggregated Stats Grid */}
                <View style={styles.statsGrid}>
                  <Card variant="hero" style={styles.statCard}>
                    <CardBody style={styles.statCardBody}>
                      <View style={styles.statCardHeader}>
                        <Icon name="users" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.totalUsers ?? 0}</Text>
                      </View>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Registered Users</Text>
                      <Text style={[styles.statDetail, { color: colors.textMuted }]}>
                        {stats?.passengers ?? 0} Passengers • {stats?.drivers ?? 0} Drivers
                      </Text>
                    </CardBody>
                  </Card>

                  <Card variant="elevated" style={styles.statCard}>
                    <CardBody style={styles.statCardBody}>
                      <View style={styles.statCardHeader}>
                        <Icon name="navigation" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.drivers ?? 0}</Text>
                      </View>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Registered Drivers</Text>
                      <Text style={[styles.statDetail, { color: colors.textMuted }]}>
                        {stats?.garageRegisteredDrivers ?? 0} Garage-Registered • {stats?.selfOwnedDrivers ?? 0} Self-Owned
                      </Text>
                    </CardBody>
                  </Card>

                  <Card variant="elevated" style={styles.statCard}>
                    <CardBody style={styles.statCardBody}>
                      <View style={styles.statCardHeader}>
                        <Icon name="briefcase" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.garages ?? 0}</Text>
                      </View>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Registered Garages</Text>
                      <Text style={[styles.statDetail, { color: colors.textMuted }]}>
                        {stats?.breakdown.pendingGarages ?? 0} Pending Verification
                      </Text>
                    </CardBody>
                  </Card>

                  <Card variant="elevated" style={styles.statCard}>
                    <CardBody style={styles.statCardBody}>
                      <View style={styles.statCardHeader}>
                        <Icon name="truck" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.accent }]}>{stats?.vehicles ?? 0}</Text>
                      </View>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rickshaws / Fleet</Text>
                      <Text style={[styles.statDetail, { color: colors.textMuted }]}>
                        Short vehicle number unique IDs
                      </Text>
                    </CardBody>
                  </Card>
                </View>

                {/* ADMIN LIVE FLEET & OPERATIONS COMMAND CENTER SECTION */}
                <Card variant="default" style={styles.fullWidthCard}>
                  <CardHeader
                    title="Live Fleet & Operations Command Center"
                    subtitle="Real-time authoritative fleet positions, driver-vehicle verification & active ride telemetry"
                    icon={<Icon name="map-pin" size={18} color={colors.primary} />}
                    action={
                      <Badge
                        label={`${fleetLocations.drivers.length} VEHICLES ACTIVE`}
                        variant={fleetLocations.drivers.length > 0 ? 'success' : 'neutral'}
                      />
                    }
                  />
                  <CardBody style={{ gap: spacing.md }}>
                    {/* Fleet Operational Summary Bar */}
                    <View style={styles.fleetSummaryBar}>
                      <View style={[styles.summaryPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.summaryPillVal, { color: colors.textPrimary }]}>{fleetSummary.totalFleet}</Text>
                        <Text style={[styles.summaryPillLabel, { color: colors.textMuted }]}>Total Active Fleet</Text>
                      </View>
                      <View style={[styles.summaryPill, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                        <Text style={[styles.summaryPillVal, { color: '#10B981' }]}>{fleetSummary.available}</Text>
                        <Text style={[styles.summaryPillLabel, { color: '#10B981' }]}>Available</Text>
                      </View>
                      <View style={[styles.summaryPill, { backgroundColor: 'rgba(217, 119, 6, 0.1)', borderColor: 'rgba(217, 119, 6, 0.3)' }]}>
                        <Text style={[styles.summaryPillVal, { color: '#D97706' }]}>{fleetSummary.activeRide}</Text>
                        <Text style={[styles.summaryPillLabel, { color: '#D97706' }]}>On Active Ride</Text>
                      </View>
                      <View style={[styles.summaryPill, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                        <Text style={[styles.summaryPillVal, { color: '#F59E0B' }]}>{fleetSummary.idle}</Text>
                        <Text style={[styles.summaryPillLabel, { color: '#F59E0B' }]}>Idle</Text>
                      </View>
                      <View style={[styles.summaryPill, { backgroundColor: 'rgba(107, 114, 128, 0.1)', borderColor: 'rgba(107, 114, 128, 0.3)' }]}>
                        <Text style={[styles.summaryPillVal, { color: '#6B7280' }]}>{fleetSummary.stale}</Text>
                        <Text style={[styles.summaryPillLabel, { color: '#6B7280' }]}>Stale GPS (&gt;2m)</Text>
                      </View>
                      <View style={[styles.summaryPill, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                        <Text style={[styles.summaryPillVal, { color: '#EF4444' }]}>{fleetSummary.emergency}</Text>
                        <Text style={[styles.summaryPillLabel, { color: '#EF4444' }]}>Emergency</Text>
                      </View>
                    </View>

                    {/* Unverified Driver-Vehicle Warning Banner */}
                    {fleetSummary.unverified > 0 && (
                      <View style={[styles.unverifiedAlertBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: '#F59E0B' }]}>
                        <Icon name="alert-triangle" size={18} color="#F59E0B" />
                        <Text style={[styles.unverifiedAlertText, { color: '#F59E0B' }]}>
                          <strong>{fleetSummary.unverified} Driver-Vehicle Unverified Linkages Detected:</strong> Unconfirmed driver operating registered vehicle. Click markers for inspection details.
                        </Text>
                      </View>
                    )}

                    {/* Operational State Filters & Live Search */}
                    <View style={styles.fleetControlsRow}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {(['ALL', 'AVAILABLE', 'ACTIVE_RIDE', 'IDLE', 'STALE', 'EMERGENCY'] as const).map((st) => (
                          <TouchableOpacity
                            key={st}
                            style={[
                              styles.filterChip,
                              {
                                backgroundColor: fleetStatusFilter === st ? colors.primary : colors.surfaceElevated,
                                borderColor: fleetStatusFilter === st ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => setFleetStatusFilter(st)}
                          >
                            <Text
                              style={[
                                styles.filterChipText,
                                { color: fleetStatusFilter === st ? colors.primaryForeground : colors.textPrimary },
                              ]}
                            >
                              {st === 'ALL' ? 'All Operational' : st}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <View style={styles.fleetSearchInputWrapper}>
                        <Input
                          placeholder="Search vehicle ID, short #, driver name, phone, garage, or ride ID..."
                          value={fleetSearchText}
                          onChangeText={setFleetSearchText}
                          leftIcon={<Icon name="search" size={16} color={colors.textMuted} />}
                          rightIcon={fleetSearchText ? <TouchableOpacity onPress={() => setFleetSearchText('')}><Icon name="x" size={14} color={colors.textMuted} /></TouchableOpacity> : undefined}
                          containerStyle={{ marginBottom: 0 }}
                        />
                      </View>
                    </View>

                    {/* Real Interactive Leaflet Command Center Map Container */}
                    <RealMapContainer
                      height={480}
                      title="ADMIN LIVE FLEET & OPERATIONS COMMAND CENTER"
                      subtitle="Authoritative Real-Time GPS Telemetry & Strict Driver-Vehicle Verification"
                      driverMarkers={fleetLocations.drivers}
                      passengerMarkers={fleetLocations.passengers}
                      onSelectDriverMarker={(driverMarker) => setSelectedFleetVehicle(driverMarker)}
                      routePolyline={selectedFleetVehicle?.activeRideSummary?.routePoints?.map((pt: any) => [pt.coordinates[1], pt.coordinates[0]])}
                    />

                    {/* Selected Vehicle & Active Ride Detail Drawer */}
                    {selectedFleetVehicle && (
                      <View style={[styles.vehicleDetailPanel, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <View style={styles.vehicleDetailHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={[styles.vehicleDetailTitle, { color: colors.primary }]}>
                                Rickshaw {selectedFleetVehicle.shortVehicleNumber}
                              </Text>
                              <Badge label={selectedFleetVehicle.operationalState} variant={selectedFleetVehicle.operationalState === 'AVAILABLE' ? 'success' : selectedFleetVehicle.operationalState === 'EMERGENCY' ? 'danger' : 'warning'} />
                              <Badge label={selectedFleetVehicle.freshness} variant={selectedFleetVehicle.isFresh ? 'success' : 'neutral'} />
                            </View>

                            <Text style={[styles.vehicleDetailSubtitle, { color: colors.textSecondary }]}>
                              Reg: {selectedFleetVehicle.registrationNumber} • System ID: {selectedFleetVehicle.vehicleSystemId} • Mode: {selectedFleetVehicle.ownershipType}
                            </Text>
                          </View>

                          <TouchableOpacity onPress={() => setSelectedFleetVehicle(null)} style={{ padding: 4 }}>
                            <Icon name="x" size={20} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>

                        {/* Driver Verification Status Banner */}
                        <View
                          style={[
                            styles.verificationBox,
                            {
                              backgroundColor: selectedFleetVehicle.isDriverVerifiedForVehicle ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                              borderColor: selectedFleetVehicle.isDriverVerifiedForVehicle ? '#10B981' : '#F59E0B',
                            },
                          ]}
                        >
                          <Icon
                            name={selectedFleetVehicle.isDriverVerifiedForVehicle ? 'check-circle' : 'alert-triangle'}
                            size={18}
                            color={selectedFleetVehicle.isDriverVerifiedForVehicle ? '#10B981' : '#F59E0B'}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: selectedFleetVehicle.isDriverVerifiedForVehicle ? '#10B981' : '#F59E0B' }}>
                              {selectedFleetVehicle.isDriverVerifiedForVehicle ? '✓ VERIFIED DRIVER ASSIGNMENT' : '⚠️ UNVERIFIED DRIVER LINKAGE'}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                              {selectedFleetVehicle.driverVerificationReason}
                            </Text>
                          </View>
                        </View>

                        {/* Driver & Vehicle Metadata Grid */}
                        <View style={styles.detailGrid}>
                          <View style={styles.detailGridItem}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Driver Name & Phone</Text>
                            <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                              {selectedFleetVehicle.driverName} ({selectedFleetVehicle.driverPhone})
                            </Text>
                          </View>

                          <View style={styles.detailGridItem}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Garage Name / Custom ID</Text>
                            <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                              {selectedFleetVehicle.garageName} ({selectedFleetVehicle.garageCustomId})
                            </Text>
                          </View>

                          <View style={styles.detailGridItem}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Last Seen Telemetry</Text>
                            <Text style={[styles.detailVal, { color: selectedFleetVehicle.isFresh ? colors.success : colors.textMuted }]}>
                              {selectedFleetVehicle.lastSeenAgoSeconds}s ago ({new Date(selectedFleetVehicle.timestamp).toLocaleTimeString()})
                            </Text>
                          </View>

                          <View style={styles.detailGridItem}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Current GPS Coordinates</Text>
                            <Text style={[styles.detailVal, { color: colors.primary, fontFamily: Platform.OS === 'web' ? 'monospace' : 'System' }]}>
                              {selectedFleetVehicle.lat.toFixed(5)}°, {selectedFleetVehicle.lng.toFixed(5)}° (±{selectedFleetVehicle.accuracy}m)
                            </Text>
                          </View>
                        </View>

                        {/* Active Ride Summary Box (If vehicle is engaged in an active ride) */}
                        {selectedFleetVehicle.activeRideSummary && (
                          <View style={[styles.activeRideBox, { backgroundColor: colors.surface, borderColor: colors.primaryBorder }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icon name="navigation" size={16} color={colors.primary} />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                                  Active Ride: {selectedFleetVehicle.activeRideSummary.rideId}
                                </Text>
                              </View>
                              <Badge label={selectedFleetVehicle.activeRideSummary.status} variant="success" />
                            </View>

                            <View style={{ gap: 4, marginTop: 6 }}>
                              <Text style={{ fontSize: 12, color: colors.textPrimary }}>
                                Passenger: <strong>{selectedFleetVehicle.activeRideSummary.passengerName}</strong> ({selectedFleetVehicle.activeRideSummary.passengerPseudonym} • {selectedFleetVehicle.activeRideSummary.passengerPhone})
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                Pickup Area: <strong>{selectedFleetVehicle.activeRideSummary.pickupArea}</strong> • Route Points: <strong>{selectedFleetVehicle.activeRideSummary.routePoints?.length || 0} telemetry nodes</strong> • Distance: <strong>{((selectedFleetVehicle.activeRideSummary.distanceMeters || 0) / 1000).toFixed(2)} km</strong>
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </CardBody>
                </Card>

                {/* Active Operational Rides Stream Card */}
                <Card variant="default" style={styles.fullWidthCard}>
                  <CardHeader
                    title={`Active Operational Rides (${activeRidesList.length})`}
                    subtitle="Real-time ride lifecycle monitoring across the platform"
                    icon={<Icon name="navigation" size={18} color={colors.primary} />}
                    action={<Badge label={`${activeRidesList.length} ACTIVE`} variant={activeRidesList.length > 0 ? 'success' : 'neutral'} />}
                  />
                  <CardBody>
                    {activeRidesList.length === 0 ? (
                      <EmptyState
                        title="No Active Rides Currently"
                        description="Active passenger ride requests and driver dispatches will appear here in real-time."
                      />
                    ) : (
                      activeRidesList.map((ride) => (
                        <View key={ride.id} style={[styles.logRow, { borderBottomColor: colors.borderSubtle }]}>
                          <View style={styles.logMeta}>
                            <Badge label={ride.passengerPseudonym} variant="info" />
                            <Badge label={ride.status} variant={ride.status === 'ACTIVE' ? 'success' : 'warning'} />
                            <Text style={[styles.logTime, { color: colors.textMuted }]}>
                              Req: {new Date(ride.requestedAt).toLocaleTimeString()}
                            </Text>
                          </View>
                          <Text style={[styles.logDetails, { color: colors.textPrimary }]}>
                            Driver: {ride.driverId ? `${ride.driverId.name} (${ride.vehicleId?.shortVehicleNumber || 'Rickshaw'})` : 'Searching / Unassigned'} • Area: {ride.approximatePickupArea || 'N/A'}
                          </Text>
                        </View>
                      ))
                    )}
                  </CardBody>
                </Card>

                {/* Recent Audit Stream Card */}
                <Card variant="default" style={styles.fullWidthCard}>
                  <CardHeader
                    title="Recent Admin Audit Log Stream"
                    subtitle="Immutable records of administrative operational actions"
                    icon={<Icon name="shield" size={18} color={colors.primary} />}
                    action={
                      <Button
                        title="Full Audit Log"
                        size="sm"
                        variant="outline"
                        onPress={() => setActiveRouteId('admin-audit')}
                      />
                    }
                  />
                  <CardBody>
                    {auditLogs.length === 0 ? (
                      <EmptyState
                        title="No Recent Audit Logs"
                        description="Administrative review actions will be logged here automatically."
                      />
                    ) : (
                      auditLogs.slice(0, 5).map((log) => (
                        <View key={log._id} style={[styles.logRow, { borderBottomColor: colors.borderSubtle }]}>
                          <View style={styles.logMeta}>
                            <Badge label={log.action} variant="info" />
                            <Text style={[styles.logTime, { color: colors.textMuted }]}>
                              {new Date(log.timestamp).toLocaleString()}
                            </Text>
                          </View>
                          <Text style={[styles.logDetails, { color: colors.textPrimary }]}>
                            Target: {log.metadata?.targetEntityName || log.entityId || 'N/A'}
                          </Text>
                        </View>
                      ))
                    )}
                  </CardBody>
                </Card>
              </View>
            )}

            {/* TAB 2: APPROVAL QUEUE */}
            {currentNavItem.id === 'admin-approvals' && (
              <View style={styles.viewSection}>
                <View style={styles.filterRow}>
                  {(['ALL', 'GARAGE', 'USER', 'VEHICLE'] as const).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: pendingTypeFilter === filter ? colors.primary : colors.surfaceElevated,
                          borderColor: pendingTypeFilter === filter ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setPendingTypeFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: pendingTypeFilter === filter ? colors.primaryForeground : colors.textPrimary },
                        ]}
                      >
                        {filter === 'ALL' ? 'All Pending' : filter === 'GARAGE' ? 'Garages' : filter === 'USER' ? 'Drivers & Users' : 'Rickshaws'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {pendingQueue.length === 0 ? (
                  <EmptyState
                    title="Approval Queue Clean"
                    description="There are currently no pending registration requests awaiting Admin review."
                  />
                ) : (
                  pendingQueue
                    .filter((item) => pendingTypeFilter === 'ALL' || item.entityType === pendingTypeFilter)
                    .map((item) => (
                      <Card key={item.id} variant="default" style={styles.itemCard}>
                        <CardBody style={styles.itemCardBody}>
                          <View style={styles.itemHeader}>
                            <View style={styles.itemTitleCol}>
                              <View style={styles.badgeTitleRow}>
                                <Badge label={item.entityType} variant="neutral" />
                                {renderStatusBadge(item.status)}
                              </View>
                              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                                {item.subtitle}
                              </Text>
                            </View>

                            <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                              Submitted: {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                          </View>

                          <View style={styles.actionRow}>
                            <Button
                              title="Approve Entity"
                              variant="primary"
                              size="sm"
                              icon={<Icon name="check" size={14} color={colors.primaryForeground} />}
                              loading={actionLoadingId === item.id}
                              onPress={() => handleApprovalAction(item.entityType, item.id, 'APPROVE')}
                            />
                            <Button
                              title="Reject"
                              variant="outline"
                              size="sm"
                              icon={<Icon name="x" size={14} color={colors.textPrimary} />}
                              disabled={actionLoadingId === item.id}
                              onPress={() => handleApprovalAction(item.entityType, item.id, 'REJECT')}
                            />
                            <Button
                              title="Suspend"
                              variant="danger"
                              size="sm"
                              disabled={actionLoadingId === item.id}
                              onPress={() => handleApprovalAction(item.entityType, item.id, 'SUSPEND')}
                            />
                          </View>
                        </CardBody>
                      </Card>
                    ))
                )}
              </View>
            )}

            {/* TAB 3: USERS */}
            {currentNavItem.id === 'admin-users' && (
              <View style={styles.viewSection}>
                <View style={styles.filterControlsRow}>
                  <Select
                    label="Role Filter"
                    value={userRoleFilter}
                    onChange={setUserRoleFilter}
                    options={[
                      { label: 'All Roles', value: 'ALL' },
                      { label: 'Passengers', value: 'PASSENGER' },
                      { label: 'Drivers', value: 'DRIVER' },
                      { label: 'Garage Owners', value: 'GARAGE_OWNER' },
                      { label: 'Admins', value: 'ADMIN' },
                    ]}
                    containerStyle={styles.filterSelect}
                  />

                  <Select
                    label="Account Status"
                    value={userStatusFilter}
                    onChange={setUserStatusFilter}
                    options={[
                      { label: 'All Statuses', value: 'ALL' },
                      { label: 'Pending', value: 'PENDING' },
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'Rejected', value: 'REJECTED' },
                      { label: 'Suspended', value: 'SUSPENDED' },
                    ]}
                    containerStyle={styles.filterSelect}
                  />
                </View>

                {usersList.length === 0 ? (
                  <EmptyState title="No Users Found" description="No user records match the selected query filters." />
                ) : (
                  usersList.map((u) => (
                    <Card key={u._id} variant="default" style={styles.itemCard}>
                      <CardBody style={styles.itemCardBody}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleCol}>
                            <View style={styles.badgeTitleRow}>
                              <Badge label={u.role} variant="info" />
                              {u.driverMode && <Badge label={u.driverMode} variant="neutral" />}
                              {renderStatusBadge(u.accountStatus)}
                            </View>
                            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{u.name}</Text>
                            <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                              Phone: {u.phone} {u.email ? `| Email: ${u.email}` : ''}
                            </Text>
                          </View>
                          <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                            Registered: {new Date(u.createdAt).toLocaleDateString()}
                          </Text>
                        </View>

                        <View style={styles.actionRow}>
                          {u.accountStatus !== 'ACTIVE' && (
                            <Button
                              title="Activate User"
                              variant="primary"
                              size="sm"
                              onPress={() => handleApprovalAction('USER', u._id, 'APPROVE')}
                            />
                          )}
                          {u.accountStatus !== 'SUSPENDED' && (
                            <Button
                              title="Suspend Account"
                              variant="danger"
                              size="sm"
                              onPress={() => handleApprovalAction('USER', u._id, 'SUSPEND')}
                            />
                          )}
                        </View>
                      </CardBody>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 4: GARAGES */}
            {currentNavItem.id === 'admin-garages' && (
              <View style={styles.viewSection}>
                {garagesList.length === 0 ? (
                  <EmptyState
                    title="No Registered Garages"
                    description="No garage registrations have been submitted to the platform yet."
                  />
                ) : (
                  garagesList.map((g) => (
                    <Card key={g._id} variant="default" style={styles.itemCard}>
                      <CardBody style={styles.itemCardBody}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleCol}>
                            <View style={styles.badgeTitleRow}>
                              <Badge label="GARAGE ENTITY" variant="info" />
                              {renderStatusBadge(g.verificationStatus)}
                            </View>
                            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{g.name}</Text>
                            <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                              Owner: {g.ownerId?.name || 'Unassigned'} ({g.ownerId?.phone || g.phone}) | Address: {g.address}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.actionRow}>
                          <Button
                            title="Approve Garage"
                            variant="primary"
                            size="sm"
                            onPress={() => handleApprovalAction('GARAGE', g._id, 'APPROVE')}
                          />
                          <Button
                            title="Reject"
                            variant="outline"
                            size="sm"
                            onPress={() => handleApprovalAction('GARAGE', g._id, 'REJECT')}
                          />
                          <Button
                            title="Suspend"
                            variant="danger"
                            size="sm"
                            onPress={() => handleApprovalAction('GARAGE', g._id, 'SUSPEND')}
                          />
                        </View>
                      </CardBody>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 5: DRIVERS */}
            {currentNavItem.id === 'admin-drivers' && (
              <View style={styles.viewSection}>
                {driversList.length === 0 ? (
                  <EmptyState title="No Registered Drivers" description="No driver accounts exist in the database." />
                ) : (
                  driversList.map((d) => (
                    <Card key={d._id} variant="default" style={styles.itemCard}>
                      <CardBody style={styles.itemCardBody}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleCol}>
                            <View style={styles.badgeTitleRow}>
                              <Badge
                                label={d.driverMode === 'GARAGE_REGISTERED' ? 'GARAGE REGISTERED' : 'SELF-OWNED DRIVER'}
                                variant={d.driverMode === 'GARAGE_REGISTERED' ? 'neutral' : 'info'}
                              />
                              {renderStatusBadge(d.accountStatus)}
                            </View>
                            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{d.name}</Text>
                            <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                              Phone: {d.phone} | Operating Mode: {d.driverMode || 'UNSPECIFIED'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.actionRow}>
                          <Button
                            title="Approve Driver"
                            variant="primary"
                            size="sm"
                            onPress={() => handleApprovalAction('USER', d._id, 'APPROVE')}
                          />
                          <Button
                            title="Suspend"
                            variant="danger"
                            size="sm"
                            onPress={() => handleApprovalAction('USER', d._id, 'SUSPEND')}
                          />
                        </View>
                      </CardBody>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 6: RICKSHAWS / VEHICLES */}
            {currentNavItem.id === 'admin-vehicles' && (
              <View style={styles.viewSection}>
                {/* Fleet Hierarchy Mode Selector */}
                <View style={styles.filterRow}>
                  {(['ALL', 'GARAGE', 'SELF_OWNED'] as const).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: adminFleetMode === mode ? colors.primary : colors.surfaceElevated,
                          borderColor: adminFleetMode === mode ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setAdminFleetMode(mode);
                        setSelectedGarageFilterId('ALL');
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: adminFleetMode === mode ? colors.primaryForeground : colors.textPrimary },
                        ]}
                      >
                        {mode === 'ALL'
                          ? 'All Platform Rickshaws'
                          : mode === 'GARAGE'
                          ? 'Garages Hierarchy (Garage Rickshaws)'
                          : 'Self-Owned Drivers Fleet'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Specific Garage Selector (When Garage Mode is Active) */}
                {adminFleetMode === 'GARAGE' && garagesList.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>Filter Garage Hub:</Text>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: selectedGarageFilterId === 'ALL' ? colors.primarySurface : colors.surface,
                          borderColor: selectedGarageFilterId === 'ALL' ? colors.primaryBorder : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedGarageFilterId('ALL')}
                    >
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>All Registered Garages</Text>
                    </TouchableOpacity>

                    {garagesList.map((g) => (
                      <TouchableOpacity
                        key={g._id}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: selectedGarageFilterId === g._id ? colors.primarySurface : colors.surface,
                            borderColor: selectedGarageFilterId === g._id ? colors.primaryBorder : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedGarageFilterId(g._id)}
                      >
                        <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>
                          {g.name} ({g.customId || 'Garage'})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {vehiclesList.length === 0 ? (
                  <EmptyState
                    title="No Registered Vehicles"
                    description="No rickshaws or fleet vehicles registered in the database."
                  />
                ) : (
                  vehiclesList
                    .filter((v) => {
                      if (adminFleetMode === 'GARAGE') {
                        if (v.ownershipType !== 'GARAGE_OWNED') return false;
                        if (selectedGarageFilterId !== 'ALL' && v.garageId?._id !== selectedGarageFilterId && v.garageId !== selectedGarageFilterId) return false;
                        return true;
                      }
                      if (adminFleetMode === 'SELF_OWNED') {
                        return v.ownershipType === 'SELF_OWNED';
                      }
                      return true;
                    })
                    .map((v) => (
                      <Card key={v._id} variant="default" style={styles.itemCard}>
                        <CardBody style={styles.itemCardBody}>
                          <View style={styles.itemHeader}>
                            <View style={styles.itemTitleCol}>
                              <View style={styles.badgeTitleRow}>
                                <Badge label={`SHORT ID: ${v.shortVehicleNumber || 'N/A'}`} variant="info" />
                                <Badge
                                  label={v.ownershipType === 'GARAGE_OWNED' ? `GARAGE: ${v.garageId?.name || 'Garage'}` : 'SELF-OWNED DRIVER'}
                                  variant={v.ownershipType === 'GARAGE_OWNED' ? 'neutral' : 'info'}
                                />
                                {renderStatusBadge(v.verificationStatus)}
                              </View>
                              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                                Vehicle {v.shortVehicleNumber || v.registrationNumber}
                              </Text>
                              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                                Full Reg #: {v.registrationNumber} | Assigned Driver: {v.assignedDriverId?.name || 'Unassigned'} | Mode: {v.ownershipType}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.actionRow}>
                            {v.verificationStatus !== 'APPROVED' && (
                              <Button
                                title="Approve Vehicle"
                                variant="primary"
                                size="sm"
                                onPress={() => handleApprovalAction('VEHICLE', v._id, 'APPROVE')}
                              />
                            )}
                            {v.verificationStatus !== 'SUSPENDED' && (
                              <Button
                                title="Suspend Vehicle"
                                variant="danger"
                                size="sm"
                                onPress={() => handleApprovalAction('VEHICLE', v._id, 'SUSPEND')}
                              />
                            )}
                          </View>
                        </CardBody>
                      </Card>
                    ))
                )}
              </View>
            )}

            {/* TAB 7: SAFETY & EMERGENCY SOS COMMAND CENTER */}
            {currentNavItem.id === 'admin-safety' && (
              <View style={styles.viewSection}>
                {/* Real-Time Emergency Dispatch Map Container */}
                <RealMapContainer
                  latitude={focusedCoords?.lat ?? 23.8103}
                  longitude={focusedCoords?.lng ?? 90.4125}
                  height={380}
                  title="Real-Time Emergency & Safety Dispatch Map"
                  subtitle="Live Passenger Emergency Locations & Driver Unit Markers"
                  status={safetyStats.redCount > 0 ? 'EMERGENCY_SOS_ACTIVE' : 'SAFETY_MONITORING_ACTIVE'}
                  driverMarkers={safetyDriverMarkers}
                  passengerMarkers={safetyPassengerMarkers}
                  allowExpand={true}
                />

                {/* Safety Command Center Status Card */}
                <Card variant="hero" style={styles.fullWidthCard}>
                  <CardHeader
                    title="Safety & Real-Time SOS Command Monitor"
                    subtitle="Live platform trip safety overview & emergency escalation center"
                    icon={<Icon name="shield" size={18} color={colors.primary} />}
                    action={
                      <Button
                        title={isSirenMuted ? 'Unmute Siren Audio' : 'Mute Siren Audio'}
                        variant={isSirenMuted ? 'outline' : 'danger'}
                        size="sm"
                        icon={<Icon name={isSirenMuted ? 'volume-x' : 'volume-2'} size={14} color={isSirenMuted ? colors.textPrimary : '#FFFFFF'} />}
                        onPress={() => {
                          const nextMute = !isSirenMuted;
                          setIsSirenMuted(nextMute);
                          if (nextMute) stopSiren();
                        }}
                      />
                    }
                  />
                  <CardBody style={styles.placeholderBody}>
                    <View style={styles.placeholderGrid}>
                      <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceElevated, borderColor: '#D97706' }]}>
                        <View style={styles.alertHeaderRow}>
                          <Icon name="alert-triangle" size={16} color="#D97706" />
                          <Text style={[styles.placeholderTitle, { color: '#D97706' }]}>Yellow Safety Alerts</Text>
                        </View>
                        <Text style={[styles.placeholderValue, { color: colors.textPrimary }]}>{safetyStats.yellowCount} Active</Text>
                        <Text style={[styles.placeholderDesc, { color: colors.textMuted }]}>
                          Passenger safety warnings & operational trip anomaly alerts.
                        </Text>
                      </View>

                      <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceElevated, borderColor: '#DC2626' }]}>
                        <View style={styles.alertHeaderRow}>
                          <Icon name="shield" size={16} color="#DC2626" />
                          <Text style={[styles.placeholderTitle, { color: '#DC2626' }]}>Red SOS Panic Events</Text>
                        </View>
                        <Text style={[styles.placeholderValue, { color: colors.textPrimary }]}>{safetyStats.redCount} Active</Text>
                        <Text style={[styles.placeholderDesc, { color: colors.textMuted }]}>
                          Urgent passenger SOS emergency triggers requiring rapid admin review.
                        </Text>
                      </View>
                    </View>
                  </CardBody>
                </Card>

                {/* Live Safety Events Stream Table / List */}
                <Card variant="default" style={styles.fullWidthCard}>
                  <CardHeader
                    title={`Active Safety Events Stream (${safetyEvents.length})`}
                    subtitle="Real-time emergency & safety event list"
                    icon={<Icon name="alert-triangle" size={18} color={colors.primary} />}
                  />
                  <CardBody>
                    {safetyEvents.length === 0 ? (
                      <EmptyState
                        title="No Active Safety Events"
                        description="Platform is operating cleanly. Active Yellow safety alerts and Red SOS triggers will appear here in real-time."
                      />
                    ) : (
                      safetyEvents.map((event) => (
                        <View key={event._id} style={[styles.logRow, { borderBottomColor: colors.borderSubtle }]}>
                          <View style={styles.logMeta}>
                            <Badge
                              label={event.severity}
                              variant={event.severity === 'RED' ? 'danger' : 'warning'}
                            />
                            <Badge
                              label={event.status}
                              variant={event.status === 'ACKNOWLEDGED' ? 'info' : 'warning'}
                            />
                            <Text style={[styles.logTime, { color: colors.textMuted }]}>
                              ID: {event.eventId} • {new Date(event.timestamp).toLocaleTimeString()}
                            </Text>
                          </View>

                          <Text style={[styles.logDetails, { color: colors.textPrimary }]}>
                            Passenger: {event.passengerId?.name || 'N/A'} ({event.passengerId?.phone || 'N/A'}) • Driver: {event.driverId?.name || 'Unassigned'} • Vehicle: {event.vehicleId?.shortVehicleNumber || 'N/A'}
                          </Text>

                          {event.description && (
                            <Text style={[styles.logDesc, { color: colors.textSecondary }]}>
                              {event.description} {event.nearbyUsersCount ? `(Nearby 500m units queried: ${event.nearbyUsersCount})` : ''}
                            </Text>
                          )}

                          <View style={styles.eventActionRow}>
                            {event.passengerLatitude && event.passengerLongitude && (
                              <Button
                                title="Focus Map"
                                variant="outline"
                                size="sm"
                                icon={<Icon name="navigation" size={14} color={colors.primary} />}
                                onPress={() => handleFocusOnEvent(event)}
                              />
                            )}

                            {event.status === 'ACTIVE' && (
                              <Button
                                title="Acknowledge"
                                variant="primary"
                                size="sm"
                                icon={<Icon name="check" size={14} color="#FFFFFF" />}
                                onPress={() => handleAcknowledgeSafety(event.eventId)}
                              />
                            )}

                            <Button
                              title="Resolve Event"
                              variant="success"
                              size="sm"
                              icon={<Icon name="check-circle" size={14} color="#FFFFFF" />}
                              onPress={() => {
                                setSelectedResolveEvent(event);
                                setResolveNotes('');
                              }}
                            />
                          </View>
                        </View>
                      ))
                    )}
                  </CardBody>
                </Card>
              </View>
            )}

            {/* TAB 8: TRIP HISTORY & INVESTIGATIONS */}
            {currentNavItem.id === 'admin-rides' && (
              <View style={styles.viewSection}>
                <Card variant="elevated" style={styles.fullWidthCard}>
                  <CardHeader
                    title="Historical Trip Investigations & Telemetry Records"
                    subtitle="Filter completed journeys, inspect official drop-off coordinates & audit telemetry paths"
                    icon={<Icon name="navigation" size={18} color={colors.primary} />}
                  />
                  <CardBody style={{ gap: spacing.md }}>
                    {/* Search & Filter Controls */}
                    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                      <View style={{ flex: 1, minWidth: 220 }}>
                        <Input
                          placeholder="Search Trip Ref, Vehicle #, Driver, Passenger..."
                          value={historySearchText}
                          onChangeText={setHistorySearchText}
                        />
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: historySafetyOnly ? '#FEF2F2' : colors.surfaceElevated,
                          borderColor: historySafetyOnly ? '#EF4444' : colors.border,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.xs,
                        }}
                        onPress={() => setHistorySafetyOnly(!historySafetyOnly)}
                      >
                        <Icon name="alert-triangle" size={16} color={historySafetyOnly ? '#DC2626' : colors.textSecondary} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: historySafetyOnly ? '#DC2626' : colors.textSecondary }}>
                          {historySafetyOnly ? 'Safety Alerts Only (Active)' : 'Filter Safety Alerts'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Trip Record Cards */}
                    {loadingAdminTrips ? (
                      <LoadingState message="Loading historical trip records for investigation..." />
                    ) : adminTripHistory.length === 0 ? (
                      <EmptyState
                        title="No Matching Journeys Found"
                        description="No completed rides match your current search parameters."
                      />
                    ) : (
                      adminTripHistory.map((trip) => (
                        <View
                          key={trip.id}
                          style={{
                            padding: spacing.md,
                            borderRadius: borderRadius.md,
                            borderWidth: 1,
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                            gap: spacing.xs,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                              <Icon name="navigation" size={16} color={colors.primary} />
                              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                                {trip.rideId}
                              </Text>
                              <Badge label={`Vehicle ${trip.shortVehicleNumber}`} variant="info" />
                              <Badge label={trip.status} variant="success" />
                              {trip.hasSafetyEvent && (
                                <Badge label="SAFETY EVENT" variant="warning" />
                              )}
                            </View>
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>
                              {trip.completedAt ? new Date(trip.completedAt).toLocaleString() : 'Completed'}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Passenger</Text>
                              <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>
                                {trip.passengerName || trip.passengerPseudonym} ({trip.passengerPhone || 'N/A'})
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Assigned Driver</Text>
                              <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>
                                {trip.driverName || 'Driver'} ({trip.driverPhone || 'N/A'})
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Garage</Text>
                              <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>
                                {trip.garageName || 'Self-Owned'}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Distance / Duration</Text>
                              <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>
                                {(trip.distanceMeters / 1000).toFixed(2)} km ({Math.round(trip.durationSeconds / 60)} m)
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Fare Settlement</Text>
                              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '800' }}>
                                ৳{trip.fareAmount || 0} ({trip.paymentMethod || 'CASH'})
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                            {trip.passengerRating ? (
                              <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 13 }}>
                                ★ {trip.passengerRating}.0 Rating
                              </Text>
                            ) : (
                              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Unrated</Text>
                            )}

                            <Button
                              title="Inspect Lifecycle & Telemetry Map"
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
              </View>
            )}

            {/* TAB 9: AUDIT ACTIVITY */}
            {currentNavItem.id === 'admin-audit' && (
              <View style={styles.viewSection}>
                <Card variant="default" style={styles.fullWidthCard}>
                  <CardHeader
                    title="System Audit Stream"
                    subtitle="Complete record of Admin operational actions"
                    icon={<Icon name="shield" size={18} color={colors.primary} />}
                  />
                  <CardBody>
                    {auditLogs.length === 0 ? (
                      <EmptyState title="No Audit Records" description="No administrative actions have been logged yet." />
                    ) : (
                      auditLogs.map((log) => (
                        <View key={log._id} style={[styles.logRow, { borderBottomColor: colors.borderSubtle }]}>
                          <View style={styles.logMeta}>
                            <Badge label={log.action} variant="info" />
                            <Text style={[styles.logTime, { color: colors.textMuted }]}>
                              {new Date(log.timestamp).toLocaleString()}
                            </Text>
                          </View>
                          <Text style={[styles.logDetails, { color: colors.textPrimary }]}>
                            Actor: {log.actorId?.name || 'System'} | Entity: {log.entity} | Details: {log.metadata?.targetEntityName || log.entityId || 'N/A'}
                          </Text>
                        </View>
                      ))
                    )}
                  </CardBody>
                </Card>
              </View>
            )}

            {/* TAB 9: PLATFORM SETTINGS */}
            {currentNavItem.id === 'admin-settings' && (
              <View style={styles.viewSection}>
                <Card variant="default" style={styles.fullWidthCard}>
                  <CardHeader
                    title="Platform Operating Parameters"
                    subtitle="System-wide configuration"
                    icon={<Icon name="settings" size={18} color={colors.primary} />}
                  />
                  <CardBody>
                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                      Global platform parameters, maintenance mode toggles, and base fare configuration will be managed here.
                    </Text>
                  </CardBody>
                </Card>
              </View>
            )}

            {/* TAB 10: ANALYTICS & OPERATIONAL REPORTING */}
            {currentNavItem.id === 'admin-analytics' && (
              <View style={styles.viewSection}>
                <AdminAnalyticsView />
              </View>
            )}
          </>
        )}
      </View>

      {/* RESOLUTION MODAL */}
      <Modal
        visible={selectedResolveEvent !== null}
        onClose={() => setSelectedResolveEvent(null)}
        title={`Resolve Safety Event — ${selectedResolveEvent?.eventId || ''}`}
      >
        <View style={styles.modalContentCol}>
          <Text style={[styles.modalBodyText, { color: colors.textSecondary }]}>
            Marking event <Text style={{ fontWeight: '700', color: colors.primary }}>{selectedResolveEvent?.eventId}</Text> ({selectedResolveEvent?.severity}) as RESOLVED. Please enter administrative resolution details for the audit record.
          </Text>

          <Input
            label="Resolution Notes"
            placeholder="e.g. Passenger verified safe, driver contacted, emergency services dispatched..."
            value={resolveNotes}
            onChangeText={setResolveNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActionRow}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setSelectedResolveEvent(null)}
            />
            <Button
              title="Confirm Resolution"
              variant="success"
              size="md"
              loading={resolvingLoading}
              onPress={handleConfirmResolveSafety}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL: ADMIN COMPREHENSIVE TRIP INVESTIGATION & TELEMETRY */}
      <Modal
        visible={showTripModal}
        onClose={() => {
          setShowTripModal(false);
          setSelectedTrip(null);
        }}
        title={`Admin Operational Investigation: ${selectedTrip?.rideId || 'Trip Detail'}`}
      >
        {loadingTripDetail || !selectedTrip ? (
          <LoadingState message="Loading operational telemetry path & investigation data..." />
        ) : (
          <ScrollView style={{ maxHeight: 560 }}>
            <View style={{ gap: spacing.md }}>
              {/* Historical Leaflet Map */}
              <RealMapContainer
                isHistoricalView={true}
                title={`Telemetry Investigation: ${selectedTrip.rideId}`}
                subtitle={`Verified Drop-off Coordinates [${selectedTrip.endLatitude?.toFixed(4)}, ${selectedTrip.endLongitude?.toFixed(4)}] • ${selectedTrip.routePointCount || selectedTrip.routePoints?.length || 0} Telemetry Points`}
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

              {/* Operational Lifecycle Timeline Card */}
              <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: spacing.xs }}>Operational Lifecycle Timeline</Text>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge label="1. INITIATED" variant="neutral" />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{selectedTrip.requestedAt ? new Date(selectedTrip.requestedAt).toLocaleString() : 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge label="2. ACCEPTED" variant="info" />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{selectedTrip.acceptedAt ? new Date(selectedTrip.acceptedAt).toLocaleString() : 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge label="3. ACTIVE" variant="success" />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{selectedTrip.startedAt ? new Date(selectedTrip.startedAt).toLocaleString() : 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge label="4. ENDING" variant="warning" />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{selectedTrip.completionRequestedAt ? new Date(selectedTrip.completionRequestedAt).toLocaleString() : 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge label="5. COMPLETED" variant="success" />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{selectedTrip.completedAt ? new Date(selectedTrip.completedAt).toLocaleString() : 'N/A'}</Text>
                  </View>
                </View>
              </View>

              {/* Identity & Vehicle Audit */}
              <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>Entities & Identity Audit</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Passenger Identity:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.passengerName} ({selectedTrip.passengerPhone})</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Driver Identity:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.driverName} ({selectedTrip.driverPhone})</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Driver Mode:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{selectedTrip.driverMode || 'GARAGE_REGISTERED'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Vehicle Identity:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Vehicle {selectedTrip.shortVehicleNumber} ({selectedTrip.registrationNumber})</Text>
                </View>
                {selectedTrip.garageName && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Registered Garage:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.garageName} ({selectedTrip.garagePhone || 'N/A'})</Text>
                  </View>
                )}
              </View>

              {/* Settlement & Rating */}
              <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>Financial Settlement Ledger</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Gross Fare:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>৳{selectedTrip.fareAmount || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Driver Shift Share:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>৳{selectedTrip.settlement?.driverEarnings || selectedTrip.fareAmount || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Platform Commission:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>৳{selectedTrip.settlement?.platformCommission || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Payment Method:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.paymentMethod || 'CASH'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Passenger Rating:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: selectedTrip.passengerRating ? '#F59E0B' : colors.textMuted }}>
                    {selectedTrip.passengerRating ? `★ ${selectedTrip.passengerRating}.0` : 'Unrated'}
                  </Text>
                </View>
              </View>

              {/* Safety Investigation Alert (if any) */}
              {selectedTrip.safetyEvent && (
                <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: '#FEF2F2', borderColor: '#EF4444', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="alert-circle" size={18} color="#DC2626" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#DC2626' }}>Safety Alert Incident Logged</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#991B1B' }}>
                    Event ID: {selectedTrip.safetyEvent.eventId} • Severity: {selectedTrip.safetyEvent.severity} • Status: {selectedTrip.safetyEvent.status}
                  </Text>
                  {selectedTrip.safetyEvent.description && (
                    <Text style={{ fontSize: 12, color: '#991B1B', fontStyle: 'italic', marginTop: 2 }}>
                      "{selectedTrip.safetyEvent.description}"
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.md,
  },
  container: {
    width: '100%',
    gap: spacing.md,
  },
  commandHeader: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  commandHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  viewSection: {
    gap: spacing.md,
  },
  pendingBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  bannerAction: {
    fontSize: 13,
    fontWeight: '700',
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
  statCardBody: {
    gap: spacing.xs,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statDetail: {
    fontSize: 11,
  },
  fullWidthCard: {
    width: '100%',
  },
  logRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logTime: {
    fontSize: 11,
  },
  logDetails: {
    fontSize: 13,
    fontWeight: '600',
  },
  logDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  eventActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemCard: {
    width: '100%',
  },
  itemCardBody: {
    gap: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  itemTitleCol: {
    flex: 1,
    gap: 4,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  itemSubtitle: {
    fontSize: 13,
  },
  itemDate: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterControlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  filterSelect: {
    flex: 1,
    minWidth: 200,
  },
  placeholderBody: {
    padding: spacing.md,
  },
  placeholderGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  placeholderCard: {
    flex: 1,
    minWidth: 220,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  placeholderValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  placeholderDesc: {
    fontSize: 12,
  },
  modalContentCol: {
    gap: spacing.md,
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

  // COMMAND CENTER STYLES
  fleetSummaryBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  summaryPill: {
    flex: 1,
    minWidth: 110,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPillVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  unverifiedAlertBanner: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  unverifiedAlertText: {
    flex: 1,
    fontSize: 12,
  },
  fleetControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  fleetSearchInputWrapper: {
    flex: 1,
    minWidth: 260,
  },
  vehicleDetailPanel: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  vehicleDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  vehicleDetailTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  vehicleDetailSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  verificationBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  activeRideBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  detailGridItem: {
    flex: 1,
    minWidth: 160,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
  },
});
