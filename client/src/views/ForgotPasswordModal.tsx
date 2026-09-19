import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { OtpInput } from '../components/ui/OtpInput';
import { authApiService } from '../services/authApiService';
import { spacing, borderRadius } from '../theme/spacing';

export interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessReturnLogin: () => void;
}

type ForgotStep = 'REQUEST_OTP' | 'VERIFY_OTP' | 'RESET_PASSWORD' | 'SUCCESS';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  onSuccessReturnLogin,
}) => {
  const { colors } = useTheme();

  const [step, setStep] = useState<ForgotStep>('REQUEST_OTP');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const handleResetState = () => {
    setStep('REQUEST_OTP');
    setEmail('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setNoticeMsg(null);
  };

  const handleClose = () => {
    handleResetState();
    onClose();
  };

  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    setErrorMsg(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    const res = await authApiService.requestForgotPasswordOtp(email.trim());
    setLoading(false);

    if (res.success) {
      setCooldown(res.cooldownSeconds || 60);
      setNoticeMsg(res.message || 'Verification OTP sent to your registered email address.');
      setStep('VERIFY_OTP');
    } else {
      setErrorMsg(res.error || 'Failed to dispatch password reset OTP.');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setErrorMsg(null);
    setLoadingResend(true);
    const res = await authApiService.requestForgotPasswordOtp(email.trim());
    setLoadingResend(false);

    if (res.success) {
      setCooldown(res.cooldownSeconds || 60);
      setNoticeMsg(res.message || 'A new verification OTP code has been sent to your email.');
    } else {
      setErrorMsg(res.error || 'Failed to resend OTP.');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    setErrorMsg(null);
    const targetOtp = codeToVerify || otp;

    if (!targetOtp || targetOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification OTP code.');
      return;
    }

    setLoading(true);
    const res = await authApiService.verifyForgotPasswordOtp(email.trim(), targetOtp);
    setLoading(false);

    if (res.success && res.resetToken) {
      setResetToken(res.resetToken);
      setNoticeMsg('OTP code verified successfully! Enter your new password below.');
      setStep('RESET_PASSWORD');
    } else {
      setErrorMsg(res.error || 'Invalid or expired OTP code.');
    }
  };

  // Step 3: Complete Password Reset
  const handleCompleteReset = async () => {
    setErrorMsg(null);

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    const res = await authApiService.resetPassword(email.trim(), resetToken, newPassword);
    setLoading(false);

    if (res.success) {
      setStep('SUCCESS');
    } else {
      setErrorMsg(res.error || 'Failed to reset password.');
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={
        step === 'SUCCESS'
          ? 'Password Reset Complete'
          : step === 'RESET_PASSWORD'
          ? 'Create New Password'
          : step === 'VERIFY_OTP'
          ? 'Verify Security OTP'
          : 'Forgot Password'
      }
    >
      <ScrollView contentContainerStyle={styles.modalContent}>
        {errorMsg && (
          <View style={[styles.alertBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
            <Icon name="alert-triangle" size={16} color={colors.danger} />
            <Text style={[styles.alertText, { color: colors.danger }]}>{errorMsg}</Text>
          </View>
        )}

        {noticeMsg && step !== 'SUCCESS' && (
          <View style={[styles.alertBanner, { backgroundColor: colors.infoSurface, borderColor: colors.info }]}>
            <Icon name="info" size={16} color={colors.info} />
            <Text style={[styles.alertText, { color: colors.info }]}>{noticeMsg}</Text>
          </View>
        )}

        {/* STEP 1: REQUEST OTP */}
        {step === 'REQUEST_OTP' && (
          <View style={styles.stepStack}>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Enter your registered RIK-RIDE account email address. We will send a secure 6-digit OTP code to verify your identity.
            </Text>

            <Input
              label="Registered Email Address"
              placeholder="e.g. user@rikride.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Icon name="mail" size={16} color={colors.textMuted} />}
            />

            <View style={styles.actionRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={handleClose}
              />
              <Button
                title="Send Security OTP"
                variant="primary"
                loading={loading}
                icon={<Icon name="send" size={14} color="#FFFFFF" />}
                onPress={handleRequestOtp}
              />
            </View>
          </View>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === 'VERIFY_OTP' && (
          <View style={styles.stepStack}>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              An OTP code was sent to <Text style={{ fontWeight: '700', color: colors.primary }}>{email}</Text>. Please enter the code below to continue.
            </Text>

            <OtpInput
              value={otp}
              onChangeOtp={setOtp}
              onComplete={(code) => handleVerifyOtp(code)}
              onResend={handleResendOtp}
              resendCooldownSeconds={cooldown}
              loadingResend={loadingResend}
              disabled={loading}
            />

            <View style={styles.actionRow}>
              <Button
                title="Back"
                variant="ghost"
                onPress={() => setStep('REQUEST_OTP')}
              />
              <Button
                title="Verify OTP Code"
                variant="primary"
                loading={loading}
                icon={<Icon name="shield-check" size={14} color="#FFFFFF" />}
                onPress={() => handleVerifyOtp()}
              />
            </View>
          </View>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {step === 'RESET_PASSWORD' && (
          <View style={styles.stepStack}>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Identity verified! Create a new secure password for your account (minimum 8 characters).
            </Text>

            <Input
              label="New Password"
              placeholder="Enter new password (min 8 characters)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
              leftIcon={<Icon name="lock" size={16} color={colors.textMuted} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                  <Icon name={showNewPass ? 'eye-off' : 'eye'} size={16} color={colors.primary} />
                </TouchableOpacity>
              }
            />

            <Input
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPass}
              autoCapitalize="none"
              leftIcon={<Icon name="lock" size={16} color={colors.textMuted} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={styles.eyeBtn}>
                  <Icon name={showConfirmPass ? 'eye-off' : 'eye'} size={16} color={colors.primary} />
                </TouchableOpacity>
              }
            />

            <View style={styles.actionRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={handleClose}
              />
              <Button
                title="Reset Password"
                variant="primary"
                loading={loading}
                icon={<Icon name="key" size={14} color="#FFFFFF" />}
                onPress={handleCompleteReset}
              />
            </View>
          </View>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'SUCCESS' && (
          <View style={styles.successBox}>
            <View style={[styles.successBadge, { backgroundColor: colors.successSurface, borderColor: colors.success }]}>
              <Icon name="check-circle" size={32} color={colors.success} />
              <Text style={[styles.successTitle, { color: colors.success }]}>
                Password Reset Successfully!
              </Text>
            </View>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
              Your account password has been updated. Old authentication sessions have been invalidated. You can now sign in with your new credentials.
            </Text>
            <Button
              title="Return to Sign In"
              variant="primary"
              size="lg"
              icon={<Icon name="log-in" size={16} color="#FFFFFF" />}
              onPress={() => {
                handleClose();
                onSuccessReturnLogin();
              }}
              style={{ width: '100%', marginTop: spacing.sm }}
            />
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: spacing.xs,
    gap: spacing.md,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  stepStack: {
    gap: spacing.md,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  eyeBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  successBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  successBadge: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    width: '100%',
    gap: spacing.xs,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  successDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
