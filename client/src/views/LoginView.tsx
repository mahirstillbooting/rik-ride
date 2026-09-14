import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../navigation/RouterContext';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { spacing, borderRadius } from '../theme/spacing';

export const LoginView: React.FC = () => {
  const { colors } = useTheme();
  const { login, seedDevAccounts } = useAuth();
  const { setActiveRole } = useRouter();

  const [identifier, setIdentifier] = useState('01700000005'); // Default: Passenger
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter your phone number or email and password.');
      return;
    }

    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Authentication failed');
    }
  };

  const handleSeedDev = async () => {
    setLoading(true);
    const result = await seedDevAccounts();
    setLoading(false);

    if (result.success) {
      setSeedNotice('Development test accounts created! Password: Password123!');
    } else {
      setErrorMsg('Failed to seed development accounts');
    }
  };

  const selectTestAccount = (phone: string, role: string) => {
    setIdentifier(phone);
    setPassword('Password123!');
    setErrorMsg(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Brand Card */}
        <Card variant="hero" style={styles.loginCard}>
          <CardHeader
            title="RIK-RIDE Authentication"
            subtitle="Platform Identity & Role-Based Access"
            action={<Badge label="Secure Identity" variant="info" />}
          />
          <CardBody style={styles.cardBody}>
            {errorMsg && (
              <View style={[styles.alertBox, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
                <Text style={[styles.alertText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
              </View>
            )}

            {seedNotice && (
              <View style={[styles.alertBox, { backgroundColor: colors.successSurface, borderColor: colors.success }]}>
                <Text style={[styles.alertText, { color: colors.success }]}>✅ {seedNotice}</Text>
              </View>
            )}

            <Input
              label="Phone Number or Email"
              placeholder="e.g. 01700000005 or admin@rikride.com"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="Enter your secure password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Sign In to RIK-RIDE"
              onPress={handleLogin}
              variant="primary"
              size="lg"
              loading={loading}
              style={styles.signInButton}
            />
          </CardBody>

          {/* Development Quick Test Selector */}
          <CardFooter style={styles.cardFooter}>
            <View style={styles.devSeedSection}>
              <Text style={[styles.devSectionTitle, { color: colors.textMuted }]}>
                DEVELOPMENT QUICK ROLE ACCOUNTS:
              </Text>
              <View style={styles.roleBtnRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => selectTestAccount('01700000005', 'PASSENGER')}
                >
                  <Text style={[styles.roleBtnText, { color: colors.textPrimary }]}>Passenger</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => selectTestAccount('01700000004', 'SELF_OWNED_DRIVER')}
                >
                  <Text style={[styles.roleBtnText, { color: colors.textPrimary }]}>Self Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => selectTestAccount('01700000003', 'GARAGE_DRIVER')}
                >
                  <Text style={[styles.roleBtnText, { color: colors.textPrimary }]}>Garage Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => selectTestAccount('01700000002', 'GARAGE_OWNER')}
                >
                  <Text style={[styles.roleBtnText, { color: colors.textPrimary }]}>Garage Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => selectTestAccount('01700000001', 'ADMIN')}
                >
                  <Text style={[styles.roleBtnText, { color: colors.primary }]}>Admin</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statusBtnRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.warning }]}
                  onPress={() => selectTestAccount('01700000006', 'PENDING')}
                >
                  <Text style={[styles.roleBtnText, { color: colors.warning }]}>Pending Approval</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}
                  onPress={() => selectTestAccount('01700000007', 'SUSPENDED')}
                >
                  <Text style={[styles.roleBtnText, { color: colors.danger }]}>Suspended Account</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleSeedDev} style={styles.seedLink}>
                <Text style={[styles.seedLinkText, { color: colors.primary }]}>
                  ⚙️ Bootstrap/Seed Development Accounts in DB
                </Text>
              </TouchableOpacity>
            </View>
          </CardFooter>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 480,
  },
  loginCard: {
    width: '100%',
  },
  cardBody: {
    gap: spacing.xs,
  },
  alertBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
  },
  signInButton: {
    marginTop: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  devSeedSection: {
    width: '100%',
    gap: spacing.xs,
  },
  devSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  roleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  roleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  seedLink: {
    marginTop: spacing.xs,
    alignSelf: 'center',
  },
  seedLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
