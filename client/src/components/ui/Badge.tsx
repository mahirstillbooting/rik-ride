import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
}) => {
  const { colors } = useTheme();

  const getVariantColors = (): { bg: string; text: string; border?: string } => {
    switch (variant) {
      case 'success':
        return { bg: colors.successSurface, text: colors.success, border: 'rgba(16, 185, 129, 0.20)' };
      case 'warning':
        return { bg: colors.warningSurface, text: colors.warning, border: 'rgba(245, 158, 11, 0.20)' };
      case 'danger':
        return { bg: colors.dangerSurface, text: colors.danger, border: 'rgba(239, 68, 68, 0.20)' };
      case 'info':
        return { bg: colors.infoSurface, text: colors.info, border: colors.primaryBorder };
      case 'neutral':
      default:
        return { bg: colors.surfaceElevated, text: colors.textSecondary, border: colors.border };
    }
  };

  const { bg, text, border } = getVariantColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border || 'transparent', borderWidth: 1 }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
