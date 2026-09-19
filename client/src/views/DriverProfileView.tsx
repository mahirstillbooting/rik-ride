import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { LoadingState } from '../components/ui/LoadingState';
import { ProfilePictureUploader } from '../components/ui/ProfilePictureUploader';
import { SupportTicketModal } from './SupportTicketModal';
import { useToast } from '../components/ui/Toast';
import { spacing, borderRadius } from '../theme/spacing';
import { driverService, DriverProfileData, DriverGarageRelation, DriverVehicleData } from '../services/driverService';

export const DriverProfileView: React.FC = () => {
  const { colors } = useTheme();
  const { user, logout: authLogout, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DriverProfileData | null>(null);
  const [garageRelation, setGarageRelation] = useState<DriverGarageRelation | null>(null);
  const [vehicle, setVehicle] = useState<DriverVehicleData | null>(null);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    const fetchDriverData = async () => {
      setLoading(true);
      const [profRes, garRes, vehRes] = await Promise.all([
        driverService.getDriverProfile(),
        driverService.getGarageInfo().catch(() => ({ success: false })),
        driverService.getVehicleInfo().catch(() => ({ success: false })),
      ]);

      if (profRes.success && profRes.driver) {
        setProfile(profRes.driver);
      }
      if (garRes.success && (garRes as any).associations?.[0]) {
        setGarageRelation((garRes as any).associations[0]);
      }
      if (vehRes.success && (vehRes as any).vehicle) {
        setVehicle((vehRes as any).vehicle);
      }
      setLoading(false);
    };

    fetchDriverData();
  }, []);

  const handleImageSelected = (base64OrUrl: string) => {
    setProfileImage(base64OrUrl);
    showToast('Driver profile photo updated', 'success');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {loading ? (
        <LoadingState message="Fetching driver identity & verification records..." />
      ) : (
        <>
          {/* SECTION E: VERIFICATION & APPROVAL STATUS */}
          {user?.accountStatus === 'REJECTED' && (
            <View style={[styles.rejectionBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
              <Icon name="x-circle" size={20} color={colors.danger} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.rejectionTitle, { color: colors.danger }]}>Driver Application Status: REJECTED</Text>
                <Text style={[styles.rejectionText, { color: colors.textPrimary }]}>
                  {user?.rejectionReason || 'Driver identity documents mismatch or unverified NID details. Please submit a support ticket or a new corrected application.'}
                </Text>
              </View>
            </View>
          )}

          {/* SECTION A: GENERAL PROFILE INFORMATION */}
          <Card variant="hero" style={styles.card}>
            <CardHeader
              title="A. General Profile Information"
              subtitle="Authenticated driver profile, avatar & contact number"
              icon={<Icon name="navigation" size={18} color={colors.primary} />}
              action={<Badge label={user?.accountStatus || 'ACTIVE'} variant={user?.accountStatus === 'ACTIVE' ? 'success' : 'warning'} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={styles.profileHeaderRow}>
                <ProfilePictureUploader
                  currentImage={profileImage || user?.profileImage}
                  onImageSelected={handleImageSelected}
                  onImageRemoved={() => setProfileImage('')}
                  size={76}
                />

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.nameText, { color: colors.textPrimary }]}>{user?.name || profile?.name || 'Driver User'}</Text>
                  <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{user?.phone}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Badge
                      label={user?.driverMode === 'GARAGE_REGISTERED' ? 'GARAGE REGISTERED' : 'SELF-OWNED DRIVER'}
                      variant={user?.driverMode === 'GARAGE_REGISTERED' ? 'neutral' : 'info'}
                    />
                    <Badge label={user?.nidStatus === 'VERIFIED' ? 'NID VERIFIED' : 'NID PENDING'} variant={user?.nidStatus === 'VERIFIED' ? 'success' : 'warning'} />
                  </View>
                </View>
              </View>
            </CardBody>
          </Card>

          {/* SECTION B: PROTECTED IDENTITY INFORMATION */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="B. Protected Identity Information"
              subtitle="Official NID & license records — Immutably protected"
              icon={<Icon name="shield" size={18} color={colors.primary} />}
              action={<Badge label="LOCKED" variant="neutral" />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={[styles.protectedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Legal Full Name (NID)</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name || 'Unverified'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date of Birth</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.dateOfBirth ? String(user.dateOfBirth) : 'N/A'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>National ID (NID) Number</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.nidNumber || 'Not Submitted'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>NID Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name={user?.nidStatus === 'VERIFIED' ? 'check-circle' : 'shield-alert'} size={14} color={user?.nidStatus === 'VERIFIED' ? colors.success : colors.warning} />
                    <Text style={[styles.infoValue, { color: user?.nidStatus === 'VERIFIED' ? colors.success : colors.warning }]}>
                      {user?.nidStatus || 'PENDING'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1, marginRight: spacing.sm }}>
                  Driver legal identity credentials require administrative authorization to modify.
                </Text>
                <Button
                  title="Request Change"
                  variant="outline"
                  size="sm"
                  icon={<Icon name="life-buoy" size={14} color={colors.primary} />}
                  onPress={() => setShowTicketModal(true)}
                />
              </View>
            </CardBody>
          </Card>

          {/* SECTION C & D: ACCOUNT & ROLE-SPECIFIC INFORMATION */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="C & D. Operating Mode & Garage Assignment"
              subtitle="Vehicle relationship, garage hub & session security"
              icon={<Icon name="truck" size={18} color={colors.primary} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={[styles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Operating Mode</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {user?.driverMode || profile?.driverMode || 'GARAGE_REGISTERED'}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Registered Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.phone}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Assigned Rickshaw</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {vehicle ? `Vehicle ${vehicle.shortVehicleNumber} (${vehicle.registrationNumber})` : 'Unassigned'}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Garage Hub</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {garageRelation ? garageRelation.garageName : 'Independent / Self-Owned'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs }}>
                <Button
                  title="Sign Out of Driver Session"
                  variant="danger"
                  size="md"
                  icon={<Icon name="log-out" size={16} color="#FFFFFF" />}
                  onPress={authLogout}
                />
              </View>
            </CardBody>
          </Card>

          <SupportTicketModal visible={showTicketModal} onClose={() => setShowTicketModal(false)} />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    width: '100%',
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  rejectionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  phoneText: {
    fontSize: 13,
    marginTop: 2,
  },
  protectedBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoGrid: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    minWidth: 160,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
