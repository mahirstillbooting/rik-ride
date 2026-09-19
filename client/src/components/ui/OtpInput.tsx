import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from './Icon';
import { Button } from './Button';
import { spacing, borderRadius } from '../../theme/spacing';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChangeOtp: (otp: string) => void;
  onComplete?: (otp: string) => void;
  onResend?: () => void;
  resendCooldownSeconds?: number;
  loadingResend?: boolean;
  disabled?: boolean;
  error?: string | null;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChangeOtp,
  onComplete,
  onResend,
  resendCooldownSeconds = 60,
  loadingResend = false,
  disabled = false,
  error = null,
}) => {
  const { colors } = useTheme();
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [cooldown, setCooldown] = useState(resendCooldownSeconds);

  // Sync cooldown timer when resendCooldownSeconds prop changes
  useEffect(() => {
    setCooldown(resendCooldownSeconds);
  }, [resendCooldownSeconds]);

  // Countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const digits = value.split('');
  while (digits.length < length) {
    digits.push('');
  }

  const handleDigitChange = (text: string, index: number) => {
    if (disabled) return;

    // Handle full OTP paste
    if (text.length > 1) {
      const cleanPasted = text.replace(/[^0-9]/g, '').slice(0, length);
      onChangeOtp(cleanPasted);
      if (cleanPasted.length === length && onComplete) {
        onComplete(cleanPasted);
      }
      const targetFocusIndex = Math.min(cleanPasted.length, length - 1);
      inputRefs.current[targetFocusIndex]?.focus();
      return;
    }

    const singleDigit = text.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = singleDigit;

    const updatedOtp = newDigits.join('').slice(0, length);
    onChangeOtp(updatedOtp);

    // Auto-advance focus to next digit box
    if (singleDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger complete callback when all 6 digits are entered
    if (updatedOtp.length === length && onComplete) {
      onComplete(updatedOtp);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendPress = () => {
    if (cooldown > 0 || loadingResend || !onResend) return;
    onResend();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Icon name="shield" size={16} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>
          Enter 6-Digit Verification Code
        </Text>
      </View>

      {/* 6 Digit Input Box Grid */}
      <View style={styles.digitsRow}>
        {Array.from({ length }).map((_, index) => {
          const digit = digits[index] || '';
          const isFocused = digit !== '';
          const hasError = Boolean(error);

          return (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.digitBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: hasError
                    ? colors.danger
                    : isFocused
                    ? colors.primary
                    : colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={digit}
              onChangeText={(txt) => handleDigitChange(txt, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? length : 1}
              selectTextOnFocus
              editable={!disabled}
              contextMenuHidden={false}
            />
          );
        })}
      </View>

      {/* Error / Attempt Status Notice */}
      {error && (
        <View style={[styles.alertBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
          <Icon name="alert-triangle" size={14} color={colors.danger} />
          <Text style={[styles.alertText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      {/* Resend Cooldown Footer */}
      {onResend && (
        <View style={styles.resendFooter}>
          {cooldown > 0 ? (
            <View style={styles.cooldownRow}>
              <Icon name="clock" size={14} color={colors.textMuted} />
              <Text style={[styles.cooldownText, { color: colors.textMuted }]}>
                Resend code in <Text style={{ fontWeight: '700', color: colors.primary }}>{cooldown}s</Text>
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleResendPress}
              disabled={loadingResend}
              style={styles.resendBtn}
            >
              <View style={styles.cooldownRow}>
                <Icon name="refresh-cw" size={14} color={colors.primary} />
                <Text style={[styles.resendBtnText, { color: colors.primary }]}>
                  {loadingResend ? 'Sending code...' : 'Resend Verification OTP'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  digitBox: {
    width: 44,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    width: '100%',
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  resendFooter: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cooldownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cooldownText: {
    fontSize: 13,
  },
  resendBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
