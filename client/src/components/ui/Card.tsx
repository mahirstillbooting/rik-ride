import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'selected' | 'hero' | 'highlight' | 'warning' | 'danger';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  showAccentBar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  showAccentBar = false,
  style,
}) => {
  const { colors } = useTheme();

  const getCardStyle = (): { bg: string; border: string; accentBar?: string } => {
    switch (variant) {
      case 'elevated':
        return {
          bg: colors.surfaceElevated,
          border: colors.borderStrong,
        };
      case 'interactive':
        return {
          bg: colors.surfaceHover,
          border: colors.borderStrong,
        };
      case 'selected':
        return {
          bg: colors.surfaceSelected,
          border: colors.primaryBorder,
        };
      case 'hero':
        return {
          bg: colors.surfaceElevated,
          border: colors.border,
        };
      case 'highlight':
        return {
          bg: colors.surfaceElevated,
          border: colors.primaryBorder,
        };
      case 'warning':
        return {
          bg: colors.surfaceElevated,
          border: 'rgba(245, 158, 11, 0.30)',
        };
      case 'danger':
        return {
          bg: colors.surfaceElevated,
          border: 'rgba(239, 68, 68, 0.30)',
        };
      case 'default':
      default:
        return {
          bg: colors.surface,
          border: colors.border,
        };
    }
  };

  const { bg, border, accentBar } = getCardStyle();
  const effectiveAccentBar = showAccentBar ? colors.primary : accentBar;

  const webCardStyle = Platform.OS === 'web'
    ? {
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease-in-out, background-color 0.18s ease-in-out',
        willChange: 'transform',
      }
    : {};

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: border,
        },
        webCardStyle as any,
        style,
      ]}
    >
      {effectiveAccentBar && (
        <View style={[styles.accentBar, { backgroundColor: effectiveAccentBar }]} />
      )}
      {children}
    </View>
  );
};

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.borderSubtle }, style]}>
      <View style={styles.headerTitleRow}>
        {icon && <View style={styles.headerIconWrapper}>{icon}</View>}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

export const CardBody: React.FC<{ children: ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.body, style]}>{children}</View>;

export const CardFooter: React.FC<{ children: ReactNode; style?: StyleProp<ViewStyle> }> = ({
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
  accentBar: {
    height: 2,
    width: '100%',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs + 2,
  },
  headerIconWrapper: {
    marginRight: 2,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionContainer: {
    marginLeft: spacing.sm,
  },
  body: {
    padding: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
