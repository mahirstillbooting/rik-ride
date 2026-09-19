import React, { useState, useEffect, useCallback } from 'react';
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
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { MapContainer } from '../components/ui/MapContainer';
import { Icon } from '../components/ui/Icon';
import { spacing, borderRadius } from '../theme/spacing';
import {
  garageService,
  GarageStats,
  GarageVehicle,
  GarageDriverItem,
  GarageProfile,
  DriverHistoryItem,
} from '../services/garageService';
import { clientRideService, HistoricalTripSummary, DetailedTripRecord } from '../services/rideService';
import { RealMapContainer } from '../components/ui/RealMapContainer';
import { QRCodeDisplay } from '../components/ui/QRCodeDisplay';
import { PaymentMethodBadge } from '../components/ui/PaymentMethodBadge';

export const GarageDashboardView: React.FC = () => {
  const { colors } = useTheme();
  const { activeRouteId } = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Active sub-tab state derived from activeRouteId or manual selection
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'drivers' | 'rides' | 'profile'>('overview');

  // Garage Ride History States
  const [garageTripHistory, setGarageTripHistory] = useState<HistoricalTripSummary[]>([]);
  const [loadingGarageTrips, setLoadingGarageTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<DetailedTripRecord | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [garage, setGarage] = useState<GarageProfile | null>(null);
  const [hasGarage, setHasGarage] = useState<boolean>(true);
  const [stats, setStats] = useState<GarageStats | null>(null);

  // Vehicles Tab States
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('ALL');
  const [vehicleVerificationFilter, setVehicleVerificationFilter] = useState('ALL');
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Drivers Tab States
  const [drivers, setDrivers] = useState<GarageDriverItem[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('ALL');
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Modal Dialog States
  const [showCreateGarageModal, setShowCreateGarageModal] = useState(false);
  const [newGarageName, setNewGarageName] = useState('');
  const [newGarageAddress, setNewGarageAddress] = useState('');
  const [newGaragePhone, setNewGaragePhone] = useState('');
  const [newGarageCapacity, setNewGarageCapacity] = useState('10');

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCapacity, setEditCapacity] = useState('');

  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newShortNum, setNewShortNum] = useState('');
  const [newRegNum, setNewRegNum] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newMfgYear, setNewMfgYear] = useState('2024');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetVehicle, setTargetVehicle] = useState<GarageVehicle | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignTargetVehicle, setUnassignTargetVehicle] = useState<GarageVehicle | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDriver, setHistoryDriver] = useState<GarageDriverItem | null>(null);
  const [historyItems, setHistoryItems] = useState<DriverHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [submittingAction, setSubmittingAction] = useState(false);

  // Load Garage Ride History
  const loadGarageTripHistory = useCallback(async () => {
    setLoadingGarageTrips(true);
    const res = await clientRideService.getGarageTripHistory();
    if (res.success && res.trips) {
      setGarageTripHistory(res.trips);
    } else {
      showToast(res.error || 'Failed to load garage ride history', 'danger');
    }
    setLoadingGarageTrips(false);
  }, [showToast]);

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

  // Sync route ID to active tab
  useEffect(() => {
    if (activeRouteId === 'garage-vehicles') setActiveTab('vehicles');
    else if (activeRouteId === 'garage-drivers') setActiveTab('drivers');
    else if (activeRouteId === 'garage-profile') setActiveTab('profile');
    else setActiveTab('overview');
  }, [activeRouteId]);

  useEffect(() => {
    if (activeTab === 'rides') loadGarageTripHistory();
  }, [activeTab, loadGarageTripHistory]);

  // Load initial garage stats & profile
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const profileRes = await garageService.getMyGarage();
    if (!profileRes.success) {
      setErrorMsg(profileRes.error || 'Failed to load garage profile');
      setLoading(false);
      return;
    }

    setHasGarage(profileRes.hasGarage);
    setGarage(profileRes.garage || null);

    if (profileRes.hasGarage) {
      const statsRes = await garageService.getDashboardStats();
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    }

    setLoading(false);
  }, []);

  // Fetch Vehicles
  const loadVehicles = useCallback(async () => {
    if (!hasGarage) return;
    setLoadingVehicles(true);
    const res = await garageService.getVehicles({
      status: vehicleStatusFilter === 'ALL' ? undefined : vehicleStatusFilter,
      verificationStatus: vehicleVerificationFilter === 'ALL' ? undefined : vehicleVerificationFilter,
      search: vehicleSearch.trim() ? vehicleSearch.trim() : undefined,
    });
    if (res.success) {
      setVehicles(res.vehicles);
    } else {
      showToast(res.error || 'Failed to load vehicles', 'danger');
    }
    setLoadingVehicles(false);
  }, [hasGarage, vehicleStatusFilter, vehicleVerificationFilter, vehicleSearch, showToast]);

  // Fetch Drivers
  const loadDrivers = useCallback(async () => {
    if (!hasGarage) return;
    setLoadingDrivers(true);
    const res = await garageService.getDrivers({
      status: driverStatusFilter === 'ALL' ? undefined : driverStatusFilter,
      search: driverSearch.trim() ? driverSearch.trim() : undefined,
    });
    if (res.success) {
      setDrivers(res.drivers);
    } else {
      showToast(res.error || 'Failed to load drivers', 'danger');
    }
    setLoadingDrivers(false);
  }, [hasGarage, driverStatusFilter, driverSearch, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (activeTab === 'vehicles') loadVehicles();
    if (activeTab === 'drivers') loadDrivers();
  }, [activeTab, loadVehicles, loadDrivers]);

  // Handle Create Garage
  const handleCreateGarage = async () => {
    if (!newGarageName.trim() || !newGarageAddress.trim() || !newGaragePhone.trim()) {
      showToast('Please fill in all required garage fields', 'warning');
      return;
    }

    setSubmittingAction(true);
    const res = await garageService.createGarage({
      name: newGarageName,
      address: newGarageAddress,
      phone: newGaragePhone,
      capacity: Number(newGarageCapacity) || 10,
    });
    setSubmittingAction(false);

    if (res.success && res.garage) {
      showToast('Garage profile created and submitted for Admin approval!', 'success');
      setShowCreateGarageModal(false);
      loadDashboardData();
    } else {
      showToast(res.error || 'Failed to create garage profile', 'danger');
    }
  };

  // Handle Update Garage Profile
  const handleUpdateProfile = async () => {
    setSubmittingAction(true);
    const res = await garageService.updateProfile({
      name: editName,
      address: editAddress,
      phone: editPhone,
      capacity: Number(editCapacity) || 10,
    });
    setSubmittingAction(false);

    if (res.success && res.garage) {
      showToast('Garage profile updated successfully', 'success');
      setShowEditProfileModal(false);
      setGarage(res.garage);
    } else {
      showToast(res.error || 'Failed to update garage profile', 'danger');
    }
  };

  // Handle Register Vehicle
  const handleRegisterVehicle = async () => {
    if (!newShortNum.trim() || !newRegNum.trim()) {
      showToast('Short vehicle number and registration number are required', 'warning');
      return;
    }

    setSubmittingAction(true);
    const res = await garageService.registerVehicle({
      shortVehicleNumber: newShortNum,
      registrationNumber: newRegNum,
      modelName: newModelName,
      manufacturingYear: Number(newMfgYear) || 2024,
    });
    setSubmittingAction(false);

    if (res.success) {
      showToast(res.message || 'Vehicle registered successfully!', 'success');
      setShowAddVehicleModal(false);
      setNewShortNum('');
      setNewRegNum('');
      setNewModelName('');
      loadVehicles();
      loadDashboardData();
    } else {
      showToast(res.error || 'Failed to register vehicle', 'danger');
    }
  };

  // Handle Driver Confirmation
  const handleConfirmDriver = async (driverId: string, action: 'CONFIRM' | 'REJECT') => {
    setSubmittingAction(true);
    const res = await garageService.confirmDriver(driverId, action);
    setSubmittingAction(false);

    if (res.success) {
      showToast(res.message || `Driver ${action === 'CONFIRM' ? 'confirmed' : 'rejected'}`, 'success');
      loadDrivers();
      loadDashboardData();
    } else {
      showToast(res.error || 'Action failed', 'danger');
    }
  };

  // Open Assign Vehicle Modal
  const openAssignModal = (veh: GarageVehicle) => {
    setTargetVehicle(veh);
    setSelectedDriverId('');
    setShowAssignModal(true);
  };

  // Handle Vehicle Assignment
  const handleAssignVehicle = async () => {
    if (!targetVehicle || !selectedDriverId) {
      showToast('Please select a valid confirmed driver', 'warning');
      return;
    }

    setSubmittingAction(true);
    const res = await garageService.assignVehicle(targetVehicle._id, selectedDriverId);
    setSubmittingAction(false);

    if (res.success) {
      showToast(res.message || 'Vehicle assigned successfully!', 'success');
      setShowAssignModal(false);
      loadVehicles();
      loadDashboardData();
    } else {
      showToast(res.error || 'Assignment failed', 'danger');
    }
  };

  // Open Unassign Modal
  const openUnassignModal = (veh: GarageVehicle) => {
    setUnassignTargetVehicle(veh);
    setShowUnassignModal(true);
  };

  // Handle Unassign Vehicle
  const handleUnassignVehicle = async () => {
    if (!unassignTargetVehicle) return;

    setSubmittingAction(true);
    const res = await garageService.unassignVehicle(unassignTargetVehicle._id);
    setSubmittingAction(false);

    if (res.success) {
      showToast(res.message || 'Driver unlinked successfully', 'info');
      setShowUnassignModal(false);
      loadVehicles();
      loadDashboardData();
    } else {
      showToast(res.error || 'Failed to unlink vehicle', 'danger');
    }
  };

  // Open Driver History Modal
  const openHistoryModal = async (driverItem: GarageDriverItem) => {
    setHistoryDriver(driverItem);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    const res = await garageService.getDriverHistory(driverItem.driverId);
    if (res.success) {
      setHistoryItems(res.history);
    } else {
      showToast(res.error || 'Failed to load driver history', 'danger');
    }
    setLoadingHistory(false);
  };

  if (loading) {
    return <LoadingState message="Connecting to RIK-RIDE Garage Command Center..." />;
  }

  if (errorMsg) {
    return (
      <ErrorState
        title="Garage Hub Connection Failed"
        message={errorMsg}
        onRetry={loadDashboardData}
      />
    );
  }

  // If Garage Owner does not have a garage record registered yet
  if (!hasGarage || !garage) {
    return (
      <View style={styles.noGarageContainer}>
        <EmptyState
          title="No Garage Registered Yet"
          description="Your account holds Garage Owner privileges, but no garage profile is registered under your account yet."
          actionTitle="Register My Garage Profile"
          onAction={() => {
            setNewGaragePhone(user?.phone || '');
            setNewGarageName('');
            setNewGarageAddress('');
            setShowCreateGarageModal(true);
          }}
        />

        <Modal
          visible={showCreateGarageModal}
          onClose={() => setShowCreateGarageModal(false)}
          title="Register New Garage Profile"
          footer={
            <>
              <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowCreateGarageModal(false)} />
              <Button
                title="Submit for Approval"
                variant="primary"
                size="sm"
                loading={submittingAction}
                onPress={handleCreateGarage}
              />
            </>
          }
        >
          <View style={styles.formStack}>
            <Input label="Garage Name *" placeholder="e.g. Dhaka Central Rickshaw Hub" value={newGarageName} onChangeText={setNewGarageName} />
            <Input label="Address *" placeholder="e.g. Motijheel, Dhaka" value={newGarageAddress} onChangeText={setNewGarageAddress} />
            <Input label="Contact Phone *" placeholder="01700000002" value={newGaragePhone} onChangeText={setNewGaragePhone} keyboardType="phone-pad" />
            <Input label="Fleet Capacity" placeholder="10" value={newGarageCapacity} onChangeText={setNewGarageCapacity} keyboardType="number-pad" />
          </View>
        </Modal>
      </View>
    );
  }

  const isGarageApproved = garage.verificationStatus === 'APPROVED';

  return (
    <View style={styles.container}>
      {/* Top Garage Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Icon name="briefcase" size={24} color={colors.primary} />
            <Text style={[styles.garageTitle, { color: colors.textPrimary }]}>{garage.name}</Text>
            <Badge
              label={garage.verificationStatus}
              variant={
                garage.verificationStatus === 'APPROVED'
                  ? 'success'
                  : garage.verificationStatus === 'PENDING'
                  ? 'warning'
                  : 'danger'
              }
            />
          </View>
          <Text style={[styles.garageSub, { color: colors.textSecondary }]}>
            Owner: {user?.name || 'Garage Owner'} ({garage.phone}) • {garage.address}
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
              activeTab === 'vehicles' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab('vehicles')}
          >
            <Icon name="truck" size={14} color={activeTab === 'vehicles' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.navTabText, { color: activeTab === 'vehicles' ? '#FFFFFF' : colors.textSecondary }]}>
              Rickshaws ({stats?.totalRickshaws || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTabBtn,
              activeTab === 'drivers' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab('drivers')}
          >
            <Icon name="users" size={14} color={activeTab === 'drivers' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.navTabText, { color: activeTab === 'drivers' ? '#FFFFFF' : colors.textSecondary }]}>
              Drivers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTabBtn,
              activeTab === 'rides' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              setActiveTab('rides');
              loadGarageTripHistory();
            }}
          >
            <Icon name="navigation" size={14} color={activeTab === 'rides' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.navTabText, { color: activeTab === 'rides' ? '#FFFFFF' : colors.textSecondary }]}>
              Ride History
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

      {/* PENDING Garage Approval Notice Banner */}
      {!isGarageApproved && (
        <View style={[styles.alertBanner, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
          <Icon name="alert-triangle" size={20} color={colors.warning} />
          <View style={styles.alertTextWrapper}>
            <Text style={[styles.alertTitle, { color: colors.warning }]}>Garage Profile Pending Admin Approval</Text>
            <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
              Your garage profile status is <Text style={{ fontWeight: '700' }}>{garage.verificationStatus}</Text>. Vehicle registrations and driver confirmations remain restricted until Platform Administration approves your garage.
            </Text>
          </View>
        </View>
      )}

      {/* TAB 1: OVERVIEW HUB */}
      {activeTab === 'overview' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Real MongoDB Operational Summary Metrics */}
          <View style={styles.statsGrid}>
            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Total Rickshaws</Text>
                  <Icon name="truck" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.totalRickshaws || 0}</Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>Registered fleet units</Text>
              </CardBody>
            </Card>

            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Active Units</Text>
                  <Icon name="check-circle" size={18} color={colors.success} />
                </View>
                <Text style={[styles.statValue, { color: colors.success }]}>{stats?.activeRickshaws || 0}</Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>Available or on trip</Text>
              </CardBody>
            </Card>

            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Available Now</Text>
                  <Icon name="navigation" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.availableRickshaws || 0}</Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>Ready for dispatch</Text>
              </CardBody>
            </Card>

            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Assigned Drivers</Text>
                  <Icon name="user-check" size={18} color={colors.info} />
                </View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.assignedDrivers || 0}</Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>Linked with vehicle</Text>
              </CardBody>
            </Card>

            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Unassigned Fleet</Text>
                  <Icon name="slash" size={18} color={colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: colors.warning }]}>{stats?.unassignedRickshaws || 0}</Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>Needs driver assignment</Text>
              </CardBody>
            </Card>

            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Pending Drivers</Text>
                  <Icon name="clock" size={18} color={colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {stats?.pendingDriverConfirmations || 0}
                </Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>Awaiting confirmation</Text>
              </CardBody>
            </Card>

            <Card variant="elevated" style={styles.statCard}>
              <CardBody style={styles.statBody}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>Pending Vehicle Approvals</Text>
                  <Icon name="file-text" size={18} color={colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {stats?.pendingVehicleApprovals || 0}
                </Text>
                <Text style={[styles.statFoot, { color: colors.textSecondary }]}>Awaiting Admin review</Text>
              </CardBody>
            </Card>
          </View>

          {/* Quick Action Control Bar */}
          <Card variant="default" style={styles.quickCard}>
            <CardHeader title="Garage Operations & Fleet Actions" subtitle="Manage vehicles, driver confirmations, and profile" />
            <CardBody style={styles.quickBody}>
              <Button
                title="Register New Rickshaw"
                variant="primary"
                size="sm"
                icon={<Icon name="plus" size={14} color="#FFFFFF" />}
                disabled={!isGarageApproved}
                onPress={() => setShowAddVehicleModal(true)}
              />
              <Button
                title="Review Driver Confirmations"
                variant="outline"
                size="sm"
                icon={<Icon name="users" size={14} color={colors.textPrimary} />}
                onPress={() => setActiveTab('drivers')}
              />
              <Button
                title="Edit Garage Profile"
                variant="ghost"
                size="sm"
                icon={<Icon name="edit" size={14} color={colors.textPrimary} />}
                onPress={() => {
                  setEditName(garage.name);
                  setEditAddress(garage.address);
                  setEditPhone(garage.phone);
                  setEditCapacity(garage.capacity?.toString() || '10');
                  setShowEditProfileModal(true);
                }}
              />
            </CardBody>
          </Card>

          {/* Hardware-Independent Fleet Live Map Preview */}
          <Card variant="hero" style={styles.mapCard}>
            <CardHeader
              title="Garage Fleet GeoTelemetry Preview"
              subtitle="Hardware-independent spatial visualization foundation for Dhaka fleet monitoring"
              action={<Badge label="Hardware Independent" variant="neutral" />}
            />
            <CardBody>
              <MapContainer height={260} />
            </CardBody>
          </Card>
        </ScrollView>
      )}

      {/* TAB 2: REGISTERED VEHICLES (FLEET MANAGEMENT) */}
      {activeTab === 'vehicles' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Controls Bar */}
          <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.searchInputWrapper}>
              <Input
                placeholder="Search Short Number (e.g. TP1092)..."
                value={vehicleSearch}
                onChangeText={setVehicleSearch}
                leftIcon={<Icon name="search" size={16} color={colors.textMuted} />}
              />
            </View>

            <View style={styles.selectRow}>
              <Select
                value={vehicleStatusFilter}
                onChange={setVehicleStatusFilter}
                options={[
                  { label: 'All Operational Statuses', value: 'ALL' },
                  { label: 'Available', value: 'AVAILABLE' },
                  { label: 'On Trip', value: 'ON_RIDE' },
                  { label: 'Offline', value: 'OFFLINE' },
                ]}
              />
              <Select
                value={vehicleVerificationFilter}
                onChange={setVehicleVerificationFilter}
                options={[
                  { label: 'All Approval Statuses', value: 'ALL' },
                  { label: 'Pending Approval', value: 'PENDING' },
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Rejected', value: 'REJECTED' },
                  { label: 'Suspended', value: 'SUSPENDED' },
                ]}
              />
              <Button
                title="Register Rickshaw"
                variant="primary"
                size="sm"
                icon={<Icon name="plus" size={14} color="#FFFFFF" />}
                disabled={!isGarageApproved}
                onPress={() => setShowAddVehicleModal(true)}
              />
            </View>
          </View>

          {loadingVehicles ? (
            <LoadingState message="Fetching garage rickshaws..." />
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No Vehicles Found"
              description={
                isGarageApproved
                  ? 'No registered vehicles match your current search or filter criteria.'
                  : 'Your garage profile must be approved by Admin before registering vehicles.'
              }
              actionTitle={isGarageApproved ? 'Register First Vehicle' : undefined}
              onAction={isGarageApproved ? () => setShowAddVehicleModal(true) : undefined}
            />
          ) : (
            <View style={styles.vehiclesGrid}>
              {vehicles.map((veh) => (
                <Card key={veh._id} variant="elevated" style={styles.vehicleCard}>
                  <CardHeader
                    title={`Rickshaw ${veh.shortVehicleNumber}`}
                    subtitle={`Reg: ${veh.registrationNumber} • Model: ${veh.modelName || 'N/A'}`}
                    action={
                      <Badge
                        label={veh.verificationStatus}
                        variant={
                          veh.verificationStatus === 'APPROVED'
                            ? 'success'
                            : veh.verificationStatus === 'PENDING'
                            ? 'warning'
                            : 'danger'
                        }
                      />
                    }
                  />
                  <CardBody style={styles.vehicleCardBody}>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Short Number (Search ID):</Text>
                      <Text style={[styles.shortNumHighlight, { color: colors.primary }]}>{veh.shortVehicleNumber}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Operational Status:</Text>
                      <Badge
                        label={veh.status}
                        variant={veh.status === 'AVAILABLE' ? 'success' : veh.status === 'ON_RIDE' ? 'info' : 'neutral'}
                      />
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Assigned Driver:</Text>
                      <Text style={[styles.driverValue, { color: colors.textPrimary }]}>
                        {veh.assignedDriverId ? `${veh.assignedDriverId.name} (${veh.assignedDriverId.phone})` : 'Unassigned'}
                      </Text>
                    </View>

                    <View style={{ marginTop: spacing.xs }}>
                      <QRCodeDisplay
                        qrToken={veh.qrIdentifier}
                        vehicleId={veh.vehicleId || veh.shortVehicleNumber}
                        shortVehicleNumber={veh.shortVehicleNumber}
                        registrationNumber={veh.registrationNumber}
                        qrStatus={veh.qrStatus}
                      />
                    </View>
                  </CardBody>
                  <CardFooter style={styles.vehicleFooter}>
                    {veh.assignedDriverId ? (
                      <Button
                        title="Unlink Driver"
                        variant="outline"
                        size="sm"
                        icon={<Icon name="slash" size={12} color={colors.danger} />}
                        onPress={() => openUnassignModal(veh)}
                      />
                    ) : (
                      <Button
                        title="Assign Driver"
                        variant="primary"
                        size="sm"
                        icon={<Icon name="user-plus" size={12} color="#FFFFFF" />}
                        disabled={veh.verificationStatus !== 'APPROVED' || !isGarageApproved}
                        onPress={() => openAssignModal(veh)}
                      />
                    )}
                  </CardFooter>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB 3: ASSIGNED & PENDING DRIVERS */}
      {activeTab === 'drivers' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Controls Bar */}
          <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.searchInputWrapper}>
              <Input
                placeholder="Search Driver Name or Phone..."
                value={driverSearch}
                onChangeText={setDriverSearch}
                leftIcon={<Icon name="search" size={16} color={colors.textMuted} />}
              />
            </View>

            <View style={styles.selectRow}>
              <Select
                value={driverStatusFilter}
                onChange={setDriverStatusFilter}
                options={[
                  { label: 'All Garage Statuses', value: 'ALL' },
                  { label: 'Pending Confirmation', value: 'PENDING' },
                  { label: 'Active Confirmed', value: 'ACTIVE' },
                  { label: 'Terminated', value: 'TERMINATED' },
                ]}
              />
            </View>
          </View>

          {loadingDrivers ? (
            <LoadingState message="Fetching associated drivers..." />
          ) : drivers.length === 0 ? (
            <EmptyState
              title="No Associated Drivers"
              description="No drivers match your current search or confirmation status filters."
            />
          ) : (
            <View style={styles.driversGrid}>
              {drivers.map((drv) => (
                <Card key={drv.relationId} variant="elevated" style={styles.driverCard}>
                  <CardHeader
                    title={drv.name}
                    subtitle={`Phone: ${drv.phone} • Mode: ${drv.driverMode}`}
                    action={
                      <Badge
                        label={`Garage: ${drv.garageConfirmationStatus}`}
                        variant={
                          drv.garageConfirmationStatus === 'ACTIVE'
                            ? 'success'
                            : drv.garageConfirmationStatus === 'PENDING'
                            ? 'warning'
                            : 'danger'
                        }
                      />
                    }
                  />
                  <CardBody style={styles.driverCardBody}>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Platform Account Status:</Text>
                      <Badge
                        label={`Admin: ${drv.adminAccountStatus}`}
                        variant={drv.adminAccountStatus === 'ACTIVE' ? 'success' : 'warning'}
                      />
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Assigned Rickshaw:</Text>
                      <Text style={[styles.shortNumHighlight, { color: colors.primary }]}>
                        {drv.assignedVehicle ? drv.assignedVehicle.shortVehicleNumber : 'None'}
                      </Text>
                    </View>

                    {drv.assignedAt && (
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        Associated: {new Date(drv.assignedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </CardBody>

                  <CardFooter style={styles.driverFooter}>
                    {drv.garageConfirmationStatus === 'PENDING' ? (
                      <>
                        <Button
                          title="Confirm Driver"
                          variant="primary"
                          size="sm"
                          disabled={!isGarageApproved}
                          onPress={() => handleConfirmDriver(drv.driverId, 'CONFIRM')}
                        />
                        <Button
                          title="Decline"
                          variant="outline"
                          size="sm"
                          onPress={() => handleConfirmDriver(drv.driverId, 'REJECT')}
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          title="Assignment History"
                          variant="outline"
                          size="sm"
                          icon={<Icon name="clock" size={12} color={colors.textPrimary} />}
                          onPress={() => openHistoryModal(drv)}
                        />
                        {drv.garageConfirmationStatus === 'ACTIVE' && (
                          <Button
                            title="Terminate Relation"
                            variant="ghost"
                            size="sm"
                            onPress={() => handleConfirmDriver(drv.driverId, 'REJECT')}
                          />
                        )}
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB 4: GARAGE PROFILE & SETTINGS */}
      {activeTab === 'profile' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card variant="hero" style={styles.profileCard}>
            <CardHeader
              title="Approved Garage Record Profile"
              subtitle={`ID: ${garage._id}`}
              action={
                <Badge
                  label={garage.verificationStatus}
                  variant={garage.verificationStatus === 'APPROVED' ? 'success' : 'warning'}
                />
              }
            />
            <CardBody style={styles.profileBody}>
              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Garage Name:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{garage.name}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Physical Address:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{garage.address}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Contact Phone:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{garage.phone}</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Fleet Capacity:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{garage.capacity || 10} Vehicles</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Owner Account:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>{user?.name} ({user?.phone})</Text>
              </View>

              <View style={styles.profileDetailRow}>
                <Text style={[styles.profileLabel, { color: colors.textMuted }]}>Created Date:</Text>
                <Text style={[styles.profileVal, { color: colors.textPrimary }]}>
                  {new Date(garage.createdAt).toLocaleString()}
                </Text>
              </View>
            </CardBody>
            <CardFooter>
              <Button
                title="Edit Profile Information"
                variant="primary"
                size="sm"
                icon={<Icon name="edit" size={14} color="#FFFFFF" />}
                onPress={() => {
                  setEditName(garage.name);
                  setEditAddress(garage.address);
                  setEditPhone(garage.phone);
                  setEditCapacity(garage.capacity?.toString() || '10');
                  setShowEditProfileModal(true);
                }}
              />
            </CardFooter>
          </Card>
        </ScrollView>
      )}

      {/* TAB 5: GARAGE VEHICLE RIDE HISTORY */}
      {activeTab === 'rides' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card variant="elevated">
            <CardHeader
              title="Garage Fleet Ride History"
              subtitle="Completed journey records & telemetry paths for your garage vehicles"
            />
            <CardBody style={{ gap: spacing.md }}>
              {loadingGarageTrips ? (
                <LoadingState message="Fetching garage vehicle ride history..." />
              ) : garageTripHistory.length === 0 ? (
                <EmptyState
                  title="No Garage Vehicle Trips"
                  description="Completed trips from drivers operating your registered garage vehicles will appear here."
                />
              ) : (
                garageTripHistory.map((trip) => (
                  <View
                    key={trip.id}
                    style={[
                      styles.historyItem,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.historyHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Icon name="navigation" size={16} color={colors.primary} />
                        <Text style={[styles.historyVehTitle, { color: colors.textPrimary }]}>
                          {trip.rideId}
                        </Text>
                        <Badge label={`Vehicle ${trip.shortVehicleNumber}`} variant="info" />
                        <Badge label={trip.status} variant="success" />
                      </View>
                      <Text style={[styles.historyDates, { color: colors.textMuted }]}>
                        {trip.completedAt ? new Date(trip.completedAt).toLocaleString() : 'Completed'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Assigned Driver</Text>
                        <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>{trip.driverName || 'N/A'}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Passenger</Text>
                        <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>{trip.passengerName || trip.passengerPseudonym || 'Passenger'}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Distance & Duration</Text>
                        <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>
                          {(trip.distanceMeters / 1000).toFixed(2)} km ({Math.round(trip.durationSeconds / 60)} m)
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>Fare / Settlement</Text>
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
        </ScrollView>
      )}

      {/* MODAL: GARAGE DETAILED HISTORICAL JOURNEY & MAP */}
      <Modal
        visible={showTripModal}
        onClose={() => {
          setShowTripModal(false);
          setSelectedTrip(null);
        }}
        title={`Garage Fleet Journey: ${selectedTrip?.rideId || 'Trip Detail'}`}
      >
        {loadingTripDetail || !selectedTrip ? (
          <LoadingState message="Loading historical route telemetry map..." />
        ) : (
          <ScrollView style={{ maxHeight: 540 }}>
            <View style={{ gap: spacing.md }}>
              <RealMapContainer
                isHistoricalView={true}
                title={`Historical Path: ${selectedTrip.rideId}`}
                subtitle={`Official GPS Path • Vehicle ${selectedTrip.shortVehicleNumber} (${selectedTrip.driverName || 'Driver'})`}
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

              <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>Trip & Driver Audit</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Trip Reference:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.rideId}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Assigned Driver:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.driverName || 'N/A'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Passenger Name:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{selectedTrip.passengerName || selectedTrip.passengerPseudonym || 'Passenger'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Vehicle Short Number:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Vehicle {selectedTrip.shortVehicleNumber}</Text>
                </View>
              </View>

              <View style={{ padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>Telemetry & Settlement</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Distance Telemetry:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{(selectedTrip.distanceMeters / 1000).toFixed(2)} km</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Total Fare Amount:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>৳{selectedTrip.fareAmount || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Driver Earnings Share:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>৳{selectedTrip.settlement?.driverEarnings || selectedTrip.fareAmount || 0}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Platform Commission:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>৳{selectedTrip.settlement?.platformCommission || 0}</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* MODAL: REGISTER VEHICLE */}
      <Modal
        visible={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        title="Register New Garage Rickshaw"
        footer={
          <>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowAddVehicleModal(false)} />
            <Button
              title="Submit Vehicle Registration"
              variant="primary"
              size="sm"
              loading={submittingAction}
              onPress={handleRegisterVehicle}
            />
          </>
        }
      >
        <View style={styles.formStack}>
          <Input
            label="Short Vehicle Number (Search Identifier) *"
            placeholder="e.g. TP1092 or DHK-1042"
            value={newShortNum}
            onChangeText={(txt) => setNewShortNum(txt.toUpperCase())}
            helperText="Human-readable unique car identifier used for fleet search"
          />
          <Input
            label="Government Registration Number *"
            placeholder="e.g. DHK-HA-1092"
            value={newRegNum}
            onChangeText={(txt) => setNewRegNum(txt.toUpperCase())}
          />
          <Input
            label="Rickshaw Model Name"
            placeholder="e.g. Standard Electric Rickshaw v2"
            value={newModelName}
            onChangeText={setNewModelName}
          />
          <Input
            label="Manufacturing Year"
            placeholder="2024"
            value={newMfgYear}
            onChangeText={setNewMfgYear}
            keyboardType="number-pad"
          />
        </View>
      </Modal>

      {/* MODAL: EDIT GARAGE PROFILE */}
      <Modal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        title="Update Garage Profile Details"
        footer={
          <>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowEditProfileModal(false)} />
            <Button
              title="Save Changes"
              variant="primary"
              size="sm"
              loading={submittingAction}
              onPress={handleUpdateProfile}
            />
          </>
        }
      >
        <View style={styles.formStack}>
          <Input label="Garage Name" value={editName} onChangeText={setEditName} />
          <Input label="Address" value={editAddress} onChangeText={setEditAddress} />
          <Input label="Contact Phone" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
          <Input label="Fleet Capacity" value={editCapacity} onChangeText={setEditCapacity} keyboardType="number-pad" />
        </View>
      </Modal>

      {/* MODAL: ASSIGN DRIVER TO VEHICLE */}
      <Modal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Driver to Vehicle ${targetVehicle?.shortVehicleNumber || ''}`}
        footer={
          <>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowAssignModal(false)} />
            <Button
              title="Confirm Assignment"
              variant="primary"
              size="sm"
              loading={submittingAction}
              disabled={!selectedDriverId}
              onPress={handleAssignVehicle}
            />
          </>
        }
      >
        <View style={styles.formStack}>
          <Text style={[styles.modalInfoText, { color: colors.textSecondary }]}>
            Select an active confirmed Garage Driver to operate vehicle{' '}
            <Text style={{ fontWeight: '700', color: colors.primary }}>{targetVehicle?.shortVehicleNumber}</Text>.
          </Text>

          {drivers.filter((d) => d.garageConfirmationStatus === 'ACTIVE' && d.adminAccountStatus === 'ACTIVE').length === 0 ? (
            <View style={[styles.alertBanner, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
              <Text style={[styles.alertDesc, { color: colors.warning }]}>
                No active confirmed drivers available. Please confirm driver associations first in the Drivers tab.
              </Text>
            </View>
          ) : (
            <Select
              label="Select Confirmed Driver"
              value={selectedDriverId}
              onChange={setSelectedDriverId}
              options={[
                { label: '-- Select Driver --', value: '' },
                ...drivers
                  .filter((d) => d.garageConfirmationStatus === 'ACTIVE' && d.adminAccountStatus === 'ACTIVE')
                  .map((d) => ({
                    label: `${d.name} (${d.phone})${d.assignedVehicle ? ` - Currently holding ${d.assignedVehicle.shortVehicleNumber}` : ' - Unassigned'}`,
                    value: d.driverId,
                  })),
              ]}
            />
          )}
        </View>
      </Modal>

      {/* MODAL: UNASSIGN DRIVER CONFIRMATION */}
      <Modal
        visible={showUnassignModal}
        onClose={() => setShowUnassignModal(false)}
        title={`Unlink Driver from Vehicle ${unassignTargetVehicle?.shortVehicleNumber || ''}`}
        footer={
          <>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowUnassignModal(false)} />
            <Button
              title="Unlink Driver"
              variant="primary"
              size="sm"
              loading={submittingAction}
              onPress={handleUnassignVehicle}
            />
          </>
        }
      >
        <Text style={[styles.modalInfoText, { color: colors.textPrimary }]}>
          Are you sure you want to unlink driver{' '}
          <Text style={{ fontWeight: '700', color: colors.primary }}>
            {unassignTargetVehicle?.assignedDriverId?.name || 'Assigned Driver'}
          </Text>{' '}
          from vehicle <Text style={{ fontWeight: '700' }}>{unassignTargetVehicle?.shortVehicleNumber}</Text>?
        </Text>
        <Text style={[styles.subNoteText, { color: colors.textMuted }]}>
          This will free the rickshaw for new driver assignments. Historical assignment records will be safely preserved in the database.
        </Text>
      </Modal>

      {/* MODAL: DRIVER ASSIGNMENT HISTORY */}
      <Modal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Assignment History: ${historyDriver?.name || 'Driver'}`}
        footer={
          <Button title="Close" variant="outline" size="sm" onPress={() => setShowHistoryModal(false)} />
        }
      >
        {loadingHistory ? (
          <LoadingState message="Fetching driver history log..." />
        ) : historyItems.length === 0 ? (
          <EmptyState title="No Historical Assignments" description="This driver has no recorded vehicle assignment history." />
        ) : (
          <View style={styles.historyList}>
            {historyItems.map((item) => (
              <View key={item._id} style={[styles.historyItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyVehTitle, { color: colors.primary }]}>
                    {item.vehicleId ? `Vehicle ${item.vehicleId.shortVehicleNumber}` : 'Unknown Vehicle'}
                  </Text>
                  <Badge label={item.isCurrent ? 'CURRENT' : 'HISTORICAL'} variant={item.isCurrent ? 'success' : 'neutral'} />
                </View>
                <Text style={[styles.historyDates, { color: colors.textSecondary }]}>
                  Assigned: {new Date(item.assignedAt).toLocaleString()}
                </Text>
                {item.unassignedAt && (
                  <Text style={[styles.historyDates, { color: colors.textMuted }]}>
                    Unlinked: {new Date(item.unassignedAt).toLocaleString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  noGarageContainer: {
    paddingVertical: spacing.xl,
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
  garageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  garageSub: {
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
    minWidth: 170,
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
    fontSize: 26,
    fontWeight: '800',
  },
  statFoot: {
    fontSize: 11,
  },
  quickCard: {
    width: '100%',
  },
  quickBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mapCard: {
    width: '100%',
  },
  filterBar: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  searchInputWrapper: {
    width: '100%',
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  vehiclesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  vehicleCard: {
    flex: 1,
    minWidth: 320,
  },
  vehicleCardBody: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  shortNumHighlight: {
    fontSize: 14,
    fontWeight: '800',
  },
  driverValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  qrCodeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  vehicleFooter: {
    justifyContent: 'flex-end',
  },
  driversGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  driverCard: {
    flex: 1,
    minWidth: 320,
  },
  driverCardBody: {
    gap: spacing.xs,
  },
  dateText: {
    fontSize: 11,
    marginTop: 4,
  },
  driverFooter: {
    gap: spacing.xs,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  profileCard: {
    width: '100%',
  },
  profileBody: {
    gap: spacing.md,
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
  modalInfoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  subNoteText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.xs,
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyVehTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyDates: {
    fontSize: 12,
  },
});
