import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useRouter } from '../../navigation/RouterContext';
import { borderRadius, spacing } from '../../theme/spacing';

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
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => setActiveRouteId(item.id)}
              style={[
                styles.navItem,
                {
                  backgroundColor: isActive ? colors.accentSurface : 'transparent',
                  borderColor: isActive ? colors.accent : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                },
              ]}
            >
              <View style={styles.navItemContent}>
                <Text style={{ color: isActive ? colors.accent : colors.textMuted, fontSize: 10 }}>
                  ●
                </Text>
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: isActive ? colors.accent : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>

              {item.badgeText && (
                <View style={[styles.badge, { backgroundColor: colors.warningSurface }]}>
                  <Text style={[styles.badgeText, { color: colors.warning }]}>
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
    width: 240,
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
    fontWeight: '700',
  },
  roleDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  navList: {
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
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
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
