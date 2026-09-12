import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
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
          border: 'transparent',
          text: colors.textPrimary,
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: colors.border,
          text: colors.textPrimary,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          border: 'transparent',
          text: colors.textSecondary,
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
        return { py: spacing.xs, px: spacing.sm, font: 13, height: 34 };
      case 'lg':
        return { py: spacing.md, px: spacing.lg, font: 16, height: 50 };
      case 'md':
      default:
        return { py: spacing.sm, px: spacing.md, font: 14, height: 42 };
    }
  };

  const { bg, border, text } = getVariantStyles();
  const { py, px, font, height } = getSizePadding();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
    gap: spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
});
