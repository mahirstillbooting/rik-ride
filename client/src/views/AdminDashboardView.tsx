import React, { useEffect, useState } from 'react';
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
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { MapContainer } from '../components/ui/MapContainer';
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

  // Filtering states
  const [pendingTypeFilter, setPendingTypeFilter] = useState<'ALL' | 'GARAGE' | 'USER' | 'VEHICLE'>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSearchText, setUserSearchText] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Access Security Check
  if (user && user.role !== 'ADMIN') {
    return (
      <ErrorState
        title="Access Denied"
        message="System Admin authorization required. Attempting to manually navigate to Admin Command Center as non-admin role has been blocked."
      />
    );
  }

  const loadDataForActiveTab = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (currentNavItem.id === 'admin-overview') {
        const [statsRes, pendingRes, logsRes] = await Promise.all([
          adminService.getStats(),
          adminService.getPendingQueue(),
          adminService.getAuditLogs(1, 10),
        ]);
        setStats(statsRes);
        setPendingQueue(pendingRes);
        setAuditLogs(logsRes);
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
                  subtitle="Live Device GPS & Fleet Position Telemetry"
                />

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

            {/* TAB 7: SAFETY / SOS COMMAND CENTER */}
            {currentNavItem.id === 'admin-safety' && (
              <View style={styles.viewSection}>
                <MapContainer
                  height={360}
                  title="Real-Time Emergency & Safety Dispatch Map"
                  subtitle="Device GPS Tracking & Rapid Response Escalation"
                />

                <Card variant="hero" style={styles.fullWidthCard}>
                  <CardHeader
                    title="Safety & Real-Time SOS Command Monitor"
                    subtitle="Live platform trip monitoring & safety alert center"
                    icon={<Icon name="alert-triangle" size={18} color={colors.primary} />}
                  />
                  <CardBody style={styles.placeholderBody}>
                    <View style={styles.placeholderGrid}>
                      <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.warning }]}>
                        <Text style={[styles.placeholderTitle, { color: colors.warning }]}>⚠️ Yellow Safety Alerts</Text>
                        <Text style={[styles.placeholderValue, { color: colors.textPrimary }]}>0 Active</Text>
                        <Text style={[styles.placeholderDesc, { color: colors.textMuted }]}>
                          Trip delay anomalies, prolonged stop warnings, and route deviation events.
                        </Text>
                      </View>

                      <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}>
                        <Text style={[styles.placeholderTitle, { color: colors.danger }]}>🚨 Red SOS Panic Events</Text>
                        <Text style={[styles.placeholderValue, { color: colors.textPrimary }]}>0 Active</Text>
                        <Text style={[styles.placeholderDesc, { color: colors.textMuted }]}>
                          Emergency passenger/driver SOS triggers and high-priority safety escalations.
                        </Text>
                      </View>
                    </View>
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
    gap: spacing.md,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
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
    minWidth: 220,
  },
  statCardBody: {
    gap: spacing.xs,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statDetail: {
    fontSize: 12,
  },
  fullWidthCard: {
    width: '100%',
  },
  logRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: 4,
  },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTime: {
    fontSize: 11,
  },
  logDetails: {
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  filterSelect: {
    flex: 1,
    minWidth: 160,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemTitleCol: {
    flex: 1,
    minWidth: 240,
    gap: 4,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  placeholderBody: {
    padding: spacing.md,
  },
  placeholderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  placeholderCard: {
    flex: 1,
    minWidth: 260,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  placeholderValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  placeholderDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
});
