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
import { Icon } from '../components/ui/Icon';
import { spacing, borderRadius } from '../theme/spacing';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { RegisterModal } from './RegisterModal';

export const LoginView: React.FC = () => {
  const { colors } = useTheme();
  const { login, seedDevAccounts } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals for Forgot Password and Role Registration
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

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
          <View style={[styles.brandBadge, { backgroundColor: colors.accentSurface, borderColor: colors.primaryBorder }]}>
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
                <Icon name="alert-triangle" size={16} color={colors.danger} />
                <Text style={[styles.alertText, { color: colors.danger }]}>{errorMsg}</Text>
              </View>
            )}

            {seedNotice && (
              <View style={[styles.alertBox, { backgroundColor: colors.successSurface, borderColor: colors.success }]}>
                <Icon name="check-circle" size={16} color={colors.success} />
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
              leftIcon={<Icon name="user" size={16} color={colors.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="Enter your secure password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              leftIcon={<Icon name="lock" size={16} color={colors.textMuted} />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.eyeBtn}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.primary} />
                </TouchableOpacity>
              }
            />

            <View style={styles.forgotPassRow}>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={[styles.forgotPassText, { color: colors.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Sign In to RIK-RIDE"
              onPress={handleLogin}
              variant="primary"
              size="lg"
              loading={loading}
              style={styles.signInButton}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Button
              title="Create RIK-RIDE Account / Sign Up"
              onPress={() => setShowRegisterModal(true)}
              variant="outline"
              size="md"
              icon={<Icon name="user-plus" size={16} color={colors.primary} />}
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
              <View style={styles.devToggleRow}>
                <Icon name="settings" size={12} color={colors.textMuted} />
                <Text style={[styles.devToggleText, { color: colors.textMuted }]}>
                  {showDevPanel ? 'Hide Dev Utilities' : 'Dev Testing Panel'}
                </Text>
              </View>
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
                  style={[styles.devBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => fillTestAccount('01700000005')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Passenger</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => fillTestAccount('01700000004')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Self Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => fillTestAccount('01700000003')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Garage Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => fillTestAccount('01700000002')}
                >
                  <Text style={[styles.devBtnText, { color: colors.textPrimary }]}>Garage Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.primaryBorder, backgroundColor: colors.primarySurface }]}
                  onPress={() => fillTestAccount('01700000001')}
                >
                  <Text style={[styles.devBtnText, { color: colors.primary }]}>Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.warning, backgroundColor: colors.warningSurface }]}
                  onPress={() => fillTestAccount('01700000006')}
                >
                  <Text style={[styles.devBtnText, { color: colors.warning }]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { borderColor: colors.danger, backgroundColor: colors.dangerSurface }]}
                  onPress={() => fillTestAccount('01700000007')}
                >
                  <Text style={[styles.devBtnText, { color: colors.danger }]}>Suspended</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleSeedDev} style={styles.devSeedBtn}>
                <View style={styles.devSeedRow}>
                  <Icon name="zap" size={13} color={colors.primary} />
                  <Text style={[styles.devSeedBtnText, { color: colors.primary }]}>
                    Seed DB Dev Accounts
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ForgotPasswordModal
        visible={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSuccessReturnLogin={() => {
          setSeedNotice('Password reset successfully! You can now sign in with your new credentials.');
        }}
      />

      <RegisterModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccessReturnLogin={(notice) => {
          if (notice) setSeedNotice(notice);
        }}
      />
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
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
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
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
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
  forgotPassRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 4,
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    gap: spacing.xs + 2,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  eyeBtn: {
    padding: 4,
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
  devToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  devSeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  devSeedBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
