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
  const { colors } = useTheme();

  const getVariantStyles = (): { bg: string; border: string; text: string } => {
    switch (variant) {
      case 'secondary':
        return {
          bg: colors.surfaceElevated,
          border: colors.borderStrong,
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
        };
      case 'danger':
        return {
          bg: colors.danger,
          border: 'transparent',
          text: '#FFFFFF',
        };
      case 'primary':
      default:
        return {
          bg: colors.primary,
          border: 'transparent',
          text: colors.primaryForeground,
        };
    }
  };

  const getSizePadding = () => {
    switch (size) {
      case 'sm':
        return { py: spacing.xs, px: spacing.md, font: 12, height: 34 };
      case 'lg':
        return { py: spacing.md, px: spacing.xl, font: 15, height: 46 };
      case 'md':
      default:
        return { py: spacing.sm, px: spacing.lg, font: 13, height: 40 };
    }
  };

  const { bg, border, text } = getVariantStyles();
  const { py, px, font, height } = getSizePadding();

  const webButtonStyle = Platform.OS === 'web'
    ? {
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineColor: 'transparent',
        transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
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
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
