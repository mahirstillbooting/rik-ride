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
import { garageService, GarageProfile } from '../services/garageService';

export const GarageProfileView: React.FC = () => {
  const { colors } = useTheme();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [garage, setGarage] = useState<GarageProfile | null>(null);

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

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {loading ? (
        <LoadingState message="Fetching garage entity & ownership profile..." />
      ) : (
        <>
          {/* Garage Profile Hero Card */}
          <Card variant="hero" style={styles.card}>
            <CardHeader
              title="Garage Entity & Owner Profile"
              subtitle="Registered garage identity, fleet capacity & verification status"
              icon={<Icon name="briefcase" size={18} color={colors.primary} />}
              action={<Badge label={garage?.verificationStatus || 'APPROVED'} variant="success" />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={styles.headerRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                  <Icon name="briefcase" size={28} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.nameText, { color: colors.textPrimary }]}>{garage?.name || 'Registered Garage'}</Text>
                  <Text style={[styles.subText, { color: colors.textSecondary }]}>Address: {garage?.address || 'N/A'}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Badge label={`Garage ID: ${garage?.garageId || 'N/A'}`} variant="info" />
                    <Badge label={`Max Capacity: ${garage?.capacity || 10} Rickshaws`} variant="neutral" />
                  </View>
                </View>
              </View>

              {/* Identity Grid */}
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
            </CardBody>
          </Card>

          {/* Account Security Card */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="Garage Owner Session & Controls"
              subtitle="Session Management"
              icon={<Icon name="shield" size={18} color={colors.primary} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Managing garage owner authentication session. To modify registered garage location or capacity limits, submit an approval update to Platform Administration.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  subText: {
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
