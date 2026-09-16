import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors, mode } = useTheme();

  const getVariantStyles = (): { bg: string; border: string; text: string; shadow?: string } => {
    switch (variant) {
      case 'secondary':
        return {
          bg: colors.surfaceHover,
          border: colors.borderSubtle,
          text: colors.textPrimary,
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: colors.borderStrong,
          text: colors.textPrimary,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          border: 'transparent',
          text: colors.textSecondary,
        };
      case 'success':
        return {
          bg: colors.success,
          border: 'transparent',
          text: '#FFFFFF',
          shadow: '0 4px 14px rgba(16, 185, 129, 0.30)',
        };
      case 'danger':
        return {
          bg: colors.danger,
          border: 'transparent',
          text: '#FFFFFF',
          shadow: '0 4px 14px rgba(239, 68, 68, 0.30)',
        };
      case 'primary':
      default:
        return {
          bg: colors.primary,
          border: 'transparent',
          text: colors.primaryForeground,
          shadow: mode === 'dark'
            ? '0 4px 16px rgba(255, 122, 0, 0.35)'
            : '0 4px 14px rgba(255, 122, 0, 0.25)',
        };
    }
  };

  const getSizePadding = () => {
    switch (size) {
      case 'sm':
        return { py: spacing.xs, px: spacing.sm, font: 12, height: 36 };
      case 'lg':
        return { py: spacing.md, px: spacing.lg, font: 15, height: 48 };
      case 'md':
      default:
        return { py: spacing.sm, px: spacing.md, font: 13, height: 42 };
    }
  };

  const { bg, border, text, shadow } = getVariantStyles();
  const { py, px, font, height } = getSizePadding();

  // Smooth cubic-bezier hover & press transitions for web platform
  const webButtonStyle = Platform.OS === 'web'
    ? {
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineColor: 'transparent',
        boxShadow: shadow || 'none',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: 'translateZ(0)',
      }
    : {};

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: border !== 'transparent' ? 1 : 0,
          paddingVertical: py,
          paddingHorizontal: px,
          height,
          opacity: disabled ? 0.5 : 1,
        },
        webButtonStyle as any,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={text} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: text, fontSize: font }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
