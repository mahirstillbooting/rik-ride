import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { spacing, borderRadius } from '../theme/spacing';

export const AdminSettingsView: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [baseFare, setBaseFare] = useState('15');
  const [perKmRate, setPerKmRate] = useState('10');
  const [perMinRate, setPerMinRate] = useState('1');
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [staleThreshold, setStaleThreshold] = useState('120');

  const handleSaveSettings = () => {
    showToast('Platform operational parameters updated successfully', 'success');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card variant="hero" style={styles.card}>
        <CardHeader
          title="Platform Operational Parameters & Fare Settings"
          subtitle="System-wide configuration, ride pricing defaults & telemetry thresholds"
          icon={<Icon name="settings" size={18} color={colors.primary} />}
          action={<Badge label="SYSTEM ADMIN" variant="info" />}
        />
        <CardBody style={{ gap: spacing.md }}>
          {/* Fare Parameters Section */}
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>Fare Engine Pricing Configuration</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Input
                label="Base Unlock Fare (৳)"
                value={baseFare}
                onChangeText={setBaseFare}
                keyboardType="numeric"
                helperText="Minimum initial fare charged upon ride start"
              />
            </View>

            <View style={styles.gridCol}>
              <Input
                label="Distance Rate per KM (৳)"
                value={perKmRate}
                onChangeText={setPerKmRate}
                keyboardType="numeric"
                helperText="Calculated from GPS journey path telemetry"
              />
            </View>

            <View style={styles.gridCol}>
              <Input
                label="Duration Rate per Min (৳)"
                value={perMinRate}
                onChangeText={setPerMinRate}
                keyboardType="numeric"
                helperText="Active ride wait time rate"
              />
            </View>
          </View>

          {/* Operational Telemetry Thresholds */}
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>Live GPS Telemetry Thresholds</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Input
                label="Stale GPS Heartbeat Timeout (Seconds)"
                value={staleThreshold}
                onChangeText={setStaleThreshold}
                keyboardType="numeric"
                helperText="Flag driver marker as offline if no GPS fix received"
              />
            </View>
          </View>

          {/* Maintenance Mode Toggle */}
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>Platform System Controls</Text>
          <View style={[styles.toggleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                Platform Maintenance Mode
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                When active, restricts new ride requests while preserving current active rides and safety monitoring.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: maintenanceActive ? colors.danger : colors.surfaceElevated,
                  borderColor: maintenanceActive ? colors.danger : colors.border,
                },
              ]}
              onPress={() => {
                const next = !maintenanceActive;
                setMaintenanceActive(next);
                showToast(`Maintenance mode ${next ? 'ACTIVATED' : 'DEACTIVATED'}`, next ? 'warning' : 'success');
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: maintenanceActive ? '#FFFFFF' : colors.textPrimary }}>
                {maintenanceActive ? 'ACTIVE' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* System Info Banner */}
          <View style={[styles.systemInfoBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
              Platform Version: <strong>RIK-RIDE v2.4.0 (Enterprise Fleet Edition)</strong>
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>
              Database Cluster Target: <strong>MongoDB Atlas (rik_ride Production Database)</strong>
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>
              Authenticated Admin: <strong>{user?.name} ({user?.phone})</strong>
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
            <Button
              title="Save System Parameters"
              variant="primary"
              size="md"
              icon={<Icon name="check" size={16} color="#FFFFFF" />}
              onPress={handleSaveSettings}
            />
          </View>
        </CardBody>
      </Card>
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridCol: {
    flex: 1,
    minWidth: 200,
  },
  toggleBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  systemInfoBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 2,
    marginTop: spacing.xs,
  },
});
