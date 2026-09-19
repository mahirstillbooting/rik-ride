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
import { garageService, GarageProfile } from '../services/garageService';

export const GarageProfileView: React.FC = () => {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [garage, setGarage] = useState<GarageProfile | null>(null);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    const fetchGarage = async () => {
      setLoading(true);
      const res = await garageService.getMyGarage();
      if (res.success && res.garage) {
        setGarage(res.garage);
      }
      setLoading(false);
    };
    fetchGarage();
  }, []);

  const handleImageSelected = (base64OrUrl: string) => {
    setProfileImage(base64OrUrl);
    showToast('Garage Owner profile photo updated', 'success');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {loading ? (
        <LoadingState message="Fetching garage entity & ownership profile..." />
      ) : (
        <>
          {/* SECTION E: VERIFICATION STATUS */}
          {user?.accountStatus === 'REJECTED' && (
            <View style={[styles.rejectionBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
              <Icon name="x-circle" size={20} color={colors.danger} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.rejectionTitle, { color: colors.danger }]}>Garage Owner Status: REJECTED</Text>
                <Text style={[styles.rejectionText, { color: colors.textPrimary }]}>
                  {user?.rejectionReason || 'Garage application or NID verification details mismatch. Submit a support ticket or contact System Administration.'}
                </Text>
              </View>
            </View>
          )}

          {/* SECTION A: GENERAL PROFILE INFORMATION */}
          <Card variant="hero" style={styles.card}>
            <CardHeader
              title="A. General Profile & Garage Hub"
              subtitle="Registered garage identity, avatar & owner credentials"
              icon={<Icon name="briefcase" size={18} color={colors.primary} />}
              action={<Badge label={garage?.verificationStatus || 'APPROVED'} variant="success" />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={styles.headerRow}>
                <ProfilePictureUploader
                  currentImage={profileImage || user?.profileImage}
                  onImageSelected={handleImageSelected}
                  onImageRemoved={() => setProfileImage('')}
                  size={76}
                />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.nameText, { color: colors.textPrimary }]}>{garage?.name || 'Registered Garage'}</Text>
                  <Text style={[styles.subText, { color: colors.textSecondary }]}>Address: {garage?.address || 'N/A'}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Badge label={`Garage ID: ${garage?.garageId || 'N/A'}`} variant="info" />
                    <Badge label={`Max Capacity: ${garage?.capacity || 10} Rickshaws`} variant="neutral" />
                  </View>
                </View>
              </View>
            </CardBody>
          </Card>

          {/* SECTION B: PROTECTED IDENTITY INFORMATION */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="B. Protected Owner Identity Information"
              subtitle="Legal owner NID & DOB credentials"
              icon={<Icon name="shield" size={18} color={colors.primary} />}
              action={<Badge label="LOCKED" variant="neutral" />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={[styles.protectedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Owner Legal Name (NID)</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name || 'Unverified'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date of Birth</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.dateOfBirth ? String(user.dateOfBirth) : 'N/A'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Owner NID Number</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.nidNumber || 'Not Submitted'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Verification Status</Text>
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
                  Owner identity credentials require administrative authorization to modify.
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

          {/* SECTION C & D: ACCOUNT & GARAGE DETAILS */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="C & D. Garage Operating Metrics & Controls"
              subtitle="Registered hub phone & platform role"
              icon={<Icon name="settings" size={18} color={colors.primary} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={[styles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Garage Owner</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name} ({user?.phone})</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Contact Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{garage?.phone || user?.phone}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Verification Status</Text>
                  <Text style={[styles.infoValue, { color: colors.success }]}>{garage?.verificationStatus || 'APPROVED'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Platform Role</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>Garage Owner</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs }}>
                <Button
                  title="Sign Out of Garage Portal"
                  variant="danger"
                  size="md"
                  icon={<Icon name="log-out" size={16} color="#FFFFFF" />}
                  onPress={logout}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  subText: {
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
