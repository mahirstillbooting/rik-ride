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
import { spacing, borderRadius } from '../theme/spacing';

export const PassengerProfileView: React.FC = () => {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [emergencyPhone, setEmergencyPhone] = useState('01700000000');
  const [preferredPayment, setPreferredPayment] = useState<'CASH' | 'MFS'>('CASH');

  const handleSavePreferences = () => {
    showToast('Passenger account preferences saved', 'success');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Primary Passenger Identity Card */}
      <Card variant="hero" style={styles.card}>
        <CardHeader
          title="Passenger Account Profile"
          subtitle="Authenticated platform identity & personal settings"
          icon={<Icon name="user" size={18} color={colors.primary} />}
          action={<Badge label={user?.accountStatus || 'ACTIVE'} variant="success" />}
        />
        <CardBody style={{ gap: spacing.md }}>
          <View style={styles.profileHeaderRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
              <Icon name="user" size={28} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.nameText, { color: colors.textPrimary }]}>{user?.name || 'Passenger User'}</Text>
              <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{user?.phone || 'Phone Unregistered'}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge label="PASSENGER" variant="info" />
                {user?.email && <Badge label={user.email} variant="neutral" />}
              </View>
            </View>
          </View>

          {/* Identity Field Overview Grid */}
          <View style={[styles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Platform Role</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Passenger User</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Account Status</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>Active / Operational</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Registered Phone</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.phone}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Safety SOS Escalation</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>Admin Command Fallback</Text>
            </View>
          </View>
        </CardBody>
      </Card>

      {/* Safety & Preferences Card */}
      <Card variant="default" style={styles.card}>
        <CardHeader
          title="Safety & Account Preferences"
          subtitle="Emergency contact & payment defaults"
          icon={<Icon name="shield" size={18} color={colors.primary} />}
        />
        <CardBody style={{ gap: spacing.md }}>
          <Input
            label="Emergency Contact Phone"
            placeholder="e.g. 01711223344"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            helperText="Notified during emergency Red SOS escalations"
          />

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              Preferred Ride Payment Method
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Cash Settlement"
                variant={preferredPayment === 'CASH' ? 'primary' : 'outline'}
                size="sm"
                onPress={() => setPreferredPayment('CASH')}
              />
              <Button
                title="MFS Mobile Wallet"
                variant={preferredPayment === 'MFS' ? 'primary' : 'outline'}
                size="sm"
                onPress={() => setPreferredPayment('MFS')}
              />
            </View>
          </View>

          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
              Interface Theme Preference
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Current Active Theme Mode: <strong>{mode.toUpperCase()} MODE</strong>
              </Text>
              <Button
                title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
                variant="outline"
                size="sm"
                onPress={toggleTheme}
              />
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: spacing.md, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              title="Save Preferences"
              variant="primary"
              size="md"
              onPress={handleSavePreferences}
            />

            <Button
              title="Sign Out of RIK-RIDE"
              variant="danger"
              size="md"
              icon={<Icon name="log-out" size={16} color="#FFFFFF" />}
              onPress={logout}
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
