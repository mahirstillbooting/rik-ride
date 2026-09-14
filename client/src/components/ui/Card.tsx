import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing, shadows } from '../../theme/spacing';

export type CardVariant = 'default' | 'elevated' | 'hero' | 'highlight';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, variant = 'default', style }) => {
  const { colors, mode } = useTheme();

  const getCardStyle = (): { bg: string; border: string; glow?: string } => {
    switch (variant) {
      case 'elevated':
        return {
          bg: colors.surfaceElevated,
          border: colors.borderSubtle,
        };
      case 'hero':
        return {
          bg: colors.cardHeroBg,
          border: colors.cardHeroBorder,
          glow: mode === 'dark' ? colors.accentGlow : undefined,
        };
      case 'highlight':
        return {
          bg: colors.surface,
          border: colors.accent,
          glow: mode === 'dark' ? colors.accentGlow : undefined,
        };
      case 'default':
      default:
        return {
          bg: colors.surface,
          border: colors.border,
        };
    }
  };

  const { bg, border, glow } = getCardStyle();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: border,
        },
        shadows.sm,
        glow ? { shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 8 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, style }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.borderSubtle }, style]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

export const CardBody: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.body, style]}>{children}</View>;

export const CardFooter: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.footer, { borderTopColor: colors.borderSubtle }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  actionContainer: {
    marginLeft: spacing.sm,
  },
  body: {
    padding: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
