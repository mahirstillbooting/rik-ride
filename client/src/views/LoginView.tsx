import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { spacing, borderRadius } from '../theme/spacing';

export const LoginView: React.FC = () => {
  const { colors } = useTheme();
  const { login, seedDevAccounts } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Isolated development utility modal toggle (for dev testing only)
  const [showDevPanel, setShowDevPanel] = useState(false);
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
      setErrorMsg(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleSeedDev = async () => {
    setLoading(true);
    const result = await seedDevAccounts();
    setLoading(false);

    if (result.success) {
      setSeedNotice('Test accounts pre-populated in database! Password: Password123!');
    } else {
      setErrorMsg('Failed to seed development accounts');
    }
  };

  const fillTestAccount = (phone: string) => {
    setIdentifier(phone);
    setPassword('Password123!');
    setErrorMsg(null);
    setShowDevPanel(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        {/* Brand Identity Header */}
        <View style={styles.brandHeader}>
          <View style={[styles.brandBadge, { backgroundColor: colors.accentSurface, borderColor: colors.primary }]}>
            <View style={[styles.brandDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.brandBadgeText, { color: colors.primary }]}>RIK-RIDE PLATFORM</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Sign In</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your credentials to access your mobility account
          </Text>
        </View>

        {/* Authentication Card Container */}
        <Card variant="default" style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Subtle Top Accent Indicator */}
          <View style={[styles.topAccentBar, { backgroundColor: colors.primary }]} />

          <CardBody style={styles.cardBody}>
            {errorMsg && (
              <View style={[styles.alertBox, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
                <Text style={styles.alertIcon}>⚠️</Text>
                <Text style={[styles.alertText, { color: colors.danger }]}>{errorMsg}</Text>
              </View>
            )}

            {seedNotice && (
              <View style={[styles.alertBox, { backgroundColor: colors.successSurface, borderColor: colors.success }]}>
                <Text style={styles.alertIcon}>✅</Text>
                <Text style={[styles.alertText, { color: colors.success }]}>{seedNotice}</Text>
              </View>
            )}

            <Input
              label="Phone Number or Email"
              placeholder="e.g. 01700000005 or user@rikride.com"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="username"
            />

            <Input
              label="Password"
              placeholder="Enter your secure password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.showPasswordText, { color: colors.primary }]}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              }
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
        </Card>

        {/* Help & Support Info */}
        <View style={styles.supportFooter}>
          <Text style={[styles.supportText, { color: colors.textMuted }]}>
            Need assistance? Contact RIK-RIDE Support
          </Text>

          {/* Isolated Dev Tool Link for non-production testing */}
          {process.env.NODE_ENV !== 'production' && (
            <TouchableOpacity
              onPress={() => setShowDevPanel(!showDevPanel)}
              style={styles.devToggleLink}
            >
              <Text style={[styles.devToggleText, { color: colors.textMuted }]}>
                {showDevPanel ? '▲ Hide Dev Utilities' : '⚙️ Dev Testing Panel'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Isolated Dev Testing Drawer */}
          {showDevPanel && (
            <View style={[styles.devPanel, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.devPanelTitle, { color: colors.textSecondary }]}>
                DEVELOPMENT TEST CREDENTIALS
              </Text>
              <View style={styles.devBtnGrid}>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border }]}
                  onPress={() => fillTestAccount('01700000005')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Passenger</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border }]}
                  onPress={() => fillTestAccount('01700000004')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Self Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border }]}
                  onPress={() => fillTestAccount('01700000003')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Garage Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border }]}
                  onPress={() => fillTestAccount('01700000002')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Garage Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border }]}
                  onPress={() => fillTestAccount('01700000001')}
                >
                  <Text style={[styles.devBtnText, { color: colors.primary }]}>Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.warning }]}
                  onPress={() => fillTestAccount('01700000006')}
                >
                  <Text style={[styles.devBtnText, { color: colors.warning }]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.danger }]}
                  onPress={() => fillTestAccount('01700000007')}
                >
                  <Text style={[styles.devBtnText, { color: colors.danger }]}>Suspended</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleSeedDev} style={styles.devSeedBtn}>
                <Text style={[styles.devSeedBtnText, { color: colors.primary }]}>
                  ⚡ Seed DB Dev Accounts
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: 6,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  loginCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  topAccentBar: {
    height: 3,
    width: '100%',
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  alertIcon: {
    fontSize: 14,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  showPasswordText: {
    fontSize: 12,
    fontWeight: '700',
  },
  signInButton: {
    marginTop: spacing.xs,
  },
  supportFooter: {
    marginTop: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  supportText: {
    fontSize: 12,
    textAlign: 'center',
  },
  devToggleLink: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  devToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  devPanel: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  devPanelTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  devBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  devBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  devBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  devSeedBtn: {
    marginTop: spacing.xs,
    paddingVertical: 4,
  },
  devSeedBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
