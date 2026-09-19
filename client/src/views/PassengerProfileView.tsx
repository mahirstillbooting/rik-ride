import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { ProfilePictureUploader } from '../components/ui/ProfilePictureUploader';
import { SupportTicketModal } from './SupportTicketModal';
import { authApiService } from '../services/authApiService';
import { spacing, borderRadius } from '../theme/spacing';

export const PassengerProfileView: React.FC = () => {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState(user?.city || 'Dhaka');
  const [area, setArea] = useState(user?.area || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [saving, setSaving] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    const res = await authApiService.updateProfile({
      email,
      city,
      area,
      address,
    });
    setSaving(false);

    if (res.success) {
      showToast('General profile details updated successfully', 'success');
      if (refreshUser) refreshUser();
    } else {
      showToast(res.error || 'Failed to update profile', 'danger');
    }
  };

  const handleImageSelected = async (base64OrUrl: string) => {
    setProfileImage(base64OrUrl);
    showToast('Profile photo updated locally. Click Save General Profile to persist.', 'info');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* SECTION E: VERIFICATION & ACCOUNT STATUS BANNER */}
      {user?.accountStatus === 'REJECTED' && (
        <View style={[styles.rejectionBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
          <Icon name="x-circle" size={20} color={colors.danger} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.rejectionTitle, { color: colors.danger }]}>Account Approval Status: REJECTED</Text>
            <Text style={[styles.rejectionText, { color: colors.textPrimary }]}>
              {user?.rejectionReason || 'Identity document mismatch or invalid information. Please submit a new application.'}
            </Text>
          </View>
        </View>
      )}

      {/* SECTION A: GENERAL PROFILE INFORMATION */}
      <Card variant="hero" style={styles.card}>
        <CardHeader
          title="A. General Profile Information"
          subtitle="Public details, avatar & contact preferences"
          icon={<Icon name="user" size={18} color={colors.primary} />}
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
              <Text style={[styles.nameText, { color: colors.textPrimary }]}>{user?.name || 'Passenger User'}</Text>
              <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{user?.phone || 'Phone Unregistered'}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge label="PASSENGER" variant="info" />
                {user?.email && <Badge label={user.email} variant="neutral" />}
              </View>
            </View>
          </View>

          <Input
            label="Email Address"
            placeholder="user@example.com"
            value={email}
            onChangeText={setEmail}
            leftIcon={<Icon name="mail" size={16} color={colors.textMuted} />}
          />

          <View style={styles.rowTwo}>
            <View style={styles.flexOne}>
              <Input
                label="City"
                value={city}
                onChangeText={setCity}
                leftIcon={<Icon name="map-pin" size={16} color={colors.textMuted} />}
              />
            </View>
            <View style={styles.flexOne}>
              <Input
                label="Area / Thana"
                placeholder="e.g. Dhanmondi"
                value={area}
                onChangeText={setArea}
              />
            </View>
          </View>

          <Input
            label="Address"
            placeholder="House #, Road #, Area"
            value={address}
            onChangeText={setAddress}
          />

          <Button
            title="Save General Profile"
            variant="primary"
            loading={saving}
            icon={<Icon name="save" size={16} color="#FFFFFF" />}
            onPress={handleSaveProfile}
          />
        </CardBody>
      </Card>

      {/* SECTION B: PROTECTED IDENTITY INFORMATION */}
      <Card variant="default" style={styles.card}>
        <CardHeader
          title="B. Protected Identity Information"
          subtitle="Legal NID credentials — Protected against direct edits"
          icon={<Icon name="shield" size={18} color={colors.primary} />}
          action={<Badge label="LOCKED" variant="neutral" />}
        />
        <CardBody style={{ gap: spacing.md }}>
          <View style={[styles.protectedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Legal Name (NID)</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name || 'Unverified'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date of Birth</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.dateOfBirth ? String(user.dateOfBirth) : 'N/A'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>National ID (NID) Number</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.nidNumber || 'Not Required for Passengers'}</Text>
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
              Protected fields cannot be directly edited. Submit an official support ticket to request changes.
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

      {/* SECTION C & D: ACCOUNT & ROLE SPECIFIC INFORMATION */}
      <Card variant="default" style={styles.card}>
        <CardHeader
          title="C & D. Account & Platform Preferences"
          subtitle="System security & interface settings"
          icon={<Icon name="settings" size={18} color={colors.primary} />}
        />
        <CardBody style={{ gap: spacing.md }}>
          <View style={[styles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Platform Role</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Passenger User</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Operational Status</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>{user?.accountStatus || 'ACTIVE'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Registered Phone</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.phone}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Active Theme</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>{mode.toUpperCase()} MODE</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xs }}>
            <Button title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`} variant="outline" size="sm" onPress={toggleTheme} />
            <Button title="Sign Out of RIK-RIDE" variant="danger" size="md" icon={<Icon name="log-out" size={16} color="#FFFFFF" />} onPress={logout} />
          </View>
        </CardBody>
      </Card>

      <SupportTicketModal visible={showTicketModal} onClose={() => setShowTicketModal(false)} />
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
  rowTwo: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexOne: {
    flex: 1,
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
