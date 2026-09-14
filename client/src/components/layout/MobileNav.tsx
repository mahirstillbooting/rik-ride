import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useRouter } from '../../navigation/RouterContext';
import { borderRadius, spacing, shadows } from '../../theme/spacing';
import { UserRole } from '../../navigation/roleConfig';
import { Icon } from '../ui/Icon';

interface MobileNavProps {
  drawerVisible: boolean;
  onCloseDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  drawerVisible,
  onCloseDrawer,
}) => {
  const { colors } = useTheme();
  const { activeRole, setActiveRole, currentRoleConfig, activeRouteId, setActiveRouteId } =
    useRouter();

  const roleOptions: { label: string; value: UserRole }[] = [
    { label: 'Passenger', value: 'PASSENGER' },
    { label: 'Self Driver', value: 'INDEPENDENT_DRIVER' },
    { label: 'Garage Driver', value: 'GARAGE_DRIVER' },
    { label: 'Garage Owner', value: 'GARAGE_OWNER' },
    { label: 'Admin', value: 'ADMIN' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar on Mobile */}
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        {currentRoleConfig.navItems.slice(0, 4).map((item) => {
          const isActive = item.id === activeRouteId;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setActiveRouteId(item.id)}
              style={styles.bottomNavItem}
            >
              <Icon
                name={item.iconName}
                size={18}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.bottomNavText,
                  {
                    color: isActive ? colors.primary : colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mobile Drawer Overlay */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="slide"
        onRequestClose={onCloseDrawer}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={onCloseDrawer}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.drawerContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.lg,
            ]}
          >
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>
                Switch Role & Navigation
              </Text>
              <TouchableOpacity onPress={onCloseDrawer}>
                <Icon name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Role Picker Section */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Role Operating Mode
            </Text>
            <View style={styles.roleGrid}>
              {roleOptions.map((opt) => {
                const isActive = activeRole === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setActiveRole(opt.value);
                      onCloseDrawer();
                    }}
                    style={[
                      styles.roleCard,
                      {
                        backgroundColor: isActive
                          ? colors.primarySurface
                          : colors.background,
                        borderColor: isActive ? colors.primaryBorder : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleCardText,
                        {
                          color: isActive ? colors.primary : colors.textPrimary,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Navigation Routes */}
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary, marginTop: spacing.md },
              ]}
            >
              {currentRoleConfig.displayName} Routes
            </Text>
            {currentRoleConfig.navItems.map((item) => {
              const isActive = item.id === activeRouteId;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setActiveRouteId(item.id);
                    onCloseDrawer();
                  }}
                  style={[
                    styles.drawerNavItem,
                    {
                      backgroundColor: isActive
                        ? colors.primarySurface
                        : 'transparent',
                    },
                  ]}
                >
                  <Icon
                    name={item.iconName}
                    size={16}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.drawerNavLabel,
                      {
                        color: isActive ? colors.primary : colors.textPrimary,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: spacing.xs,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  bottomNavText: {
    fontSize: 10,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  drawerContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: '80%',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  roleCardText: {
    fontSize: 12,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  drawerNavLabel: {
    fontSize: 14,
  },
});

