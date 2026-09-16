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
  pill?: boolean;
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
  pill = false,
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
          bg: colors.surfaceElevated,
          border: colors.border,
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
          shadow: mode === 'dark' ? '0 4px 14px rgba(16, 185, 129, 0.25)' : '0 4px 14px rgba(5, 150, 105, 0.20)',
        };
      case 'danger':
        return {
          bg: colors.danger,
          border: 'transparent',
          text: '#FFFFFF',
          shadow: mode === 'dark' ? '0 4px 14px rgba(239, 68, 68, 0.25)' : '0 4px 14px rgba(220, 38, 38, 0.20)',
        };
      case 'primary':
      default:
        return {
          bg: colors.primary,
          border: 'transparent',
          text: colors.primaryForeground,
          shadow: mode === 'dark'
            ? '0 4px 16px rgba(255, 122, 0, 0.35)'
            : '0 4px 14px rgba(255, 122, 0, 0.22)',
        };
    }
  };

  const getSizePadding = () => {
    switch (size) {
      case 'sm':
        return { py: spacing.xs, px: spacing.md, font: 12, height: 36 };
      case 'lg':
        return { py: spacing.md, px: spacing.xl, font: 15, height: 48 };
      case 'md':
      default:
        return { py: spacing.sm, px: spacing.lg, font: 13, height: 42 };
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
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: 'translateZ(0)',
      }
    : {};

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: border !== 'transparent' ? 1 : 0,
          borderRadius: pill ? borderRadius.full : borderRadius.md,
          paddingVertical: py,
          paddingHorizontal: px,
          height,
          opacity: disabled ? 0.45 : 1,
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
