import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { LoadingState } from '../components/ui/LoadingState';
import { spacing, borderRadius } from '../theme/spacing';
import { driverService, DriverProfileData, DriverGarageRelation, DriverVehicleData } from '../services/driverService';

export const DriverProfileView: React.FC = () => {
  const { colors } = useTheme();
  const { user, logout: authLogout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DriverProfileData | null>(null);
  const [garageRelation, setGarageRelation] = useState<DriverGarageRelation | null>(null);
  const [vehicle, setVehicle] = useState<DriverVehicleData | null>(null);

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

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {loading ? (
        <LoadingState message="Fetching driver identity & verification records..." />
      ) : (
        <>
          {/* Driver Identity Card */}
          <Card variant="hero" style={styles.card}>
            <CardHeader
              title="Driver Official Profile & Identity"
              subtitle="Authenticated driver credentials, operating mode & license verification"
              icon={<Icon name="navigation" size={18} color={colors.primary} />}
              action={<Badge label={user?.accountStatus || 'ACTIVE'} variant="success" />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={styles.profileHeaderRow}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                  <Icon name="navigation" size={28} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.nameText, { color: colors.textPrimary }]}>{user?.name || profile?.name || 'Driver User'}</Text>
                  <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{user?.phone}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Badge
                      label={user?.driverMode === 'GARAGE_REGISTERED' ? 'GARAGE REGISTERED' : 'SELF-OWNED DRIVER'}
                      variant={user?.driverMode === 'GARAGE_REGISTERED' ? 'neutral' : 'info'}
                    />
                    <Badge label="NID VERIFIED" variant="success" />
                  </View>
                </View>
              </View>

              {/* Data Grid */}
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
            </CardBody>
          </Card>

          {/* Account Controls */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="Driver Account & Session Security"
              subtitle="System access controls"
              icon={<Icon name="shield" size={18} color={colors.primary} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Protected identity fields (NID, License #, Garage Assignment) require administrative review to update. Contact platform support or your Garage Owner for authorization updates.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
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
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  phoneText: {
    fontSize: 13,
    marginTop: 2,
  },
  infoGrid: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 4,
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
