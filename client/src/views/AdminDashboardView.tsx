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
} from '../services/adminService';
import { clientRideService, RideData } from '../services/rideService';
import { clientSafetyService, SafetyEventData } from '../services/safetyService';

export const AdminDashboardView: React.FC = () => {
  const { colors, mode } = useTheme();
  const { currentNavItem, setActiveRouteId } = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stats & Data state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingQueue, setPendingQueue] = useState<PendingQueueItem[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [garagesList, setGaragesList] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [fleetLocations, setFleetLocations] = useState<{ drivers: any[]; passengers: any[] }>({ drivers: [], passengers: [] });
  const [activeRidesList, setActiveRidesList] = useState<RideData[]>([]);

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

  const loadDataForActiveTab = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (currentNavItem.id === 'admin-overview') {
        const [statsRes, pendingRes, logsRes, locationsRes, ridesRes] = await Promise.all([
          adminService.getStats(),
          adminService.getPendingQueue(),
          adminService.getAuditLogs(1, 10),
          adminService.getFleetAndPassengerLocations().catch(() => ({ drivers: [], passengers: [] })),
          clientRideService.getAdminActiveRides().catch(() => ({ rides: [] })),
        ]);
        setStats(statsRes);
        setPendingQueue(pendingRes);
        setAuditLogs(logsRes);
        setFleetLocations(locationsRes);
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

  useEffect(() => {
    loadDataForActiveTab();
  }, [currentNavItem.id, userRoleFilter, userStatusFilter]);

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

                {/* GeoTelemetry Map Preview Container */}
                <MapContainer
                  height={340}
                  title="Dhaka GeoTelemetry Command Center"
                  subtitle="Live Device GPS, Active Fleet & Passenger Telemetry Stream"
                  driverMarkers={fleetLocations.drivers}
                  passengerMarkers={fleetLocations.passengers}
                />

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
                {vehiclesList.length === 0 ? (
                  <EmptyState
                    title="No Registered Vehicles"
                    description="No rickshaws or fleet vehicles registered in the database."
                  />
                ) : (
                  vehiclesList.map((v) => (
                    <Card key={v._id} variant="default" style={styles.itemCard}>
                      <CardBody style={styles.itemCardBody}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleCol}>
                            <View style={styles.badgeTitleRow}>
                              <Badge label={`SHORT ID: ${v.shortVehicleNumber || 'N/A'}`} variant="info" />
                              <Badge label={v.ownershipType} variant="neutral" />
                              {renderStatusBadge(v.verificationStatus)}
                            </View>
                            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                              Vehicle {v.shortVehicleNumber || v.registrationNumber}
                            </Text>
                            <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                              Full Reg #: {v.registrationNumber} | Assigned Driver: {v.assignedDriverId?.name || 'None'} | Garage: {v.garageId?.name || 'Independent'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.actionRow}>
                          <Button
                            title="Approve Vehicle"
                            variant="primary"
                            size="sm"
                            onPress={() => handleApprovalAction('VEHICLE', v._id, 'APPROVE')}
                          />
                          <Button
                            title="Suspend"
                            variant="danger"
                            size="sm"
                            onPress={() => handleApprovalAction('VEHICLE', v._id, 'SUSPEND')}
                          />
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

            {/* TAB 8: AUDIT ACTIVITY */}
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
              variant="primary"
              size="md"
              loading={resolvingLoading}
              icon={<Icon name="check-circle" size={16} color="#FFFFFF" />}
              onPress={handleConfirmResolveSafety}
            />
          </View>
        </View>
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
});
