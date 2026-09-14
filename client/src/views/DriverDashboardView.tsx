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
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Icon } from '../components/ui/Icon';
import { spacing, borderRadius } from '../theme/spacing';
import {
  driverService,
  DriverProfileData,
  DriverGarageRelation,
  DriverVehicleData,
  DriverHistoryRecord,
} from '../services/driverService';

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

  // Self-Owned Vehicle Modal State
  const [showSelfVehicleModal, setShowSelfVehicleModal] = useState(false);
  const [selfShortNum, setSelfShortNum] = useState('');
  const [selfRegNum, setSelfRegNum] = useState('');
  const [selfModelName, setSelfModelName] = useState('');
  const [selfMfgYear, setSelfMfgYear] = useState('2024');
  const [submittingVehicle, setSubmittingVehicle] = useState(false);

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

  // Load History Log
  const loadHistoryData = useCallback(async () => {
    setLoadingHistory(true);
    const res = await driverService.getDriverHistory();
    if (res.success && res.assignmentHistory) {
      setAssignmentHistory(res.assignmentHistory);
    }
    setLoadingHistory(false);
  }, []);

  // Load Garage Associations Log
  const loadGarageData = useCallback(async () => {
    const res = await driverService.getGarageInfo();
    if (res.success && res.associations) {
      setGarageHistory(res.associations);
    }
  }, []);

  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  useEffect(() => {
    if (activeTab === 'history') loadHistoryData();
    if (activeTab === 'garage') loadGarageData();
  }, [activeTab, loadHistoryData, loadGarageData]);

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

      {/* Operational State Banner */}
      <View style={[styles.alertBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Icon name="power" size={18} color={colors.textMuted} />
        <View style={styles.alertTextWrapper}>
          <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>
            Shift Operational State: <Text style={{ color: colors.warning }}>OFF-SHIFT / NOT ACTIVE</Text>
          </Text>
          <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
            Real-time GPS telemetry, live shift controls, and ride dispatches will be activated in future modules.
          </Text>
        </View>
      </View>

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

          {/* Ride & Rating History Foundation Placeholders */}
          <Card variant="default" style={styles.placeholderCard}>
            <CardHeader title="Completed Rides & Ratings Foundation" subtitle="Future trip metrics module" />
            <CardBody>
              <EmptyState
                title="No Trip Metrics Yet"
                description="Completed trips, passenger ratings, and earnings history will be tracked here in future business modules."
              />
            </CardBody>
          </Card>
        </ScrollView>
      )}

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
