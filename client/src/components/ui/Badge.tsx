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

  const getVariantColors = (): { bg: string; text: string } => {
    switch (variant) {
      case 'success':
        return { bg: colors.successSurface, text: colors.success };
      case 'warning':
        return { bg: colors.warningSurface, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerSurface, text: colors.danger };
      case 'info':
        return { bg: colors.infoSurface, text: colors.info };
      case 'neutral':
      default:
        return { bg: colors.surfaceHover, text: colors.textSecondary };
    }
  };

  const { bg, text } = getVariantColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
