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
  const { colors } = useTheme();

  const getVariantStyles = (): { bg: string; border: string; text: string } => {
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
        return { py: spacing.xs, px: spacing.sm, font: 12, height: 36 };
      case 'lg':
        return { py: spacing.md, px: spacing.lg, font: 15, height: 48 };
      case 'md':
      default:
        return { py: spacing.sm, px: spacing.md, font: 13, height: 42 };
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
        transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, opacity 0.15s ease-in-out',
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
