import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useRouter } from '../../navigation/RouterContext';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from '../ui/Icon';

export const Sidebar: React.FC = () => {
  const { colors } = useTheme();
  const { currentRoleConfig, activeRouteId, setActiveRouteId } = useRouter();

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      <View style={[styles.roleHeader, { borderBottomColor: colors.borderSubtle }]}>
        <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
          {currentRoleConfig.displayName}
        </Text>
        <Text style={[styles.roleDesc, { color: colors.textMuted }]}>
          {currentRoleConfig.description}
        </Text>
      </View>

      <View style={styles.navList}>
        {currentRoleConfig.navItems.map((item) => {
          const isActive = item.id === activeRouteId;
          const webItemStyle = Platform.OS === 'web'
            ? {
                transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out',
                cursor: 'pointer',
              }
            : {};

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => setActiveRouteId(item.id)}
              style={[
                styles.navItem,
                {
                  backgroundColor: isActive ? colors.primarySurface : 'transparent',
                  borderColor: isActive ? colors.primaryBorder : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                },
                webItemStyle as any,
              ]}
            >
              <View style={styles.navItemContent}>
                <Icon
                  name={item.iconName}
                  size={16}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: isActive ? colors.primary : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>

              {item.badgeText && (
                <View style={[styles.badge, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {item.badgeText}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 230,
    borderRightWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  roleHeader: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  roleDesc: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  navList: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navLabel: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

