import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useRouter } from '../../navigation/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useBreakpoint } from '../../theme/breakpoints';
import { borderRadius, spacing } from '../../theme/spacing';
import { UserRole } from '../../navigation/roleConfig';
import { Icon } from '../ui/Icon';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { mode, colors, toggleTheme } = useTheme();
  const { activeRole, setActiveRole } = useRouter();
  const { authState, user, logout } = useAuth();
  const { isMobile } = useBreakpoint();

  const roleOptions: { label: string; value: UserRole }[] = [
    { label: 'Passenger', value: 'PASSENGER' },
    { label: 'Self Driver', value: 'INDEPENDENT_DRIVER' },
    { label: 'Garage Driver', value: 'GARAGE_DRIVER' },
    { label: 'Garage Owner', value: 'GARAGE_OWNER' },
    { label: 'Admin', value: 'ADMIN' },
  ];

  const webInteractiveStyle = Platform.OS === 'web'
    ? {
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
      }
    : {};

  return (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.leftSection}>
        {isMobile && (
          <TouchableOpacity
            onPress={onToggleMobileMenu}
            style={[styles.iconButton, { backgroundColor: colors.surfaceHover }, webInteractiveStyle as any]}
          >
            <Icon name="grid" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        <View style={styles.brandContainer}>
          <View style={[styles.brandDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.brandText, { color: colors.primary }]}>RIK-RIDE</Text>
          <Text style={[styles.brandTag, { color: colors.textMuted }]}>
            {authState === 'authenticated' && user ? `${user.role}` : 'Platform Identity'}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Role Selector Preview */}
        {!isMobile && (
          <View style={[styles.rolePickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.roleLabel, { color: colors.textMuted }]}>Role Mode:</Text>
            {roleOptions.map((opt) => {
              const isActive = activeRole === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setActiveRole(opt.value)}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: isActive ? colors.primarySurface : 'transparent',
                    },
                    webInteractiveStyle as any,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? '700' : '500' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Auth User Pill & Logout Button */}
        {authState === 'authenticated' && user && (
          <View style={styles.userSection}>
            {!isMobile && (
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.name}</Text>
                <Text style={[styles.userRole, { color: colors.primary }]}>{user.phone}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={logout}
              style={[styles.logoutBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.border }, webInteractiveStyle as any]}
            >
              <Icon name="log-out" size={14} color={colors.danger} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Theme Toggle Button */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: colors.surfaceHover, borderColor: colors.border }, webInteractiveStyle as any]}
        >
          <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={14} color={colors.textPrimary} />
          <Text style={[styles.themeToggleText, { color: colors.textPrimary }]}>
            {mode === 'dark' ? 'Light' : 'Dark'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 100,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  brandTag: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rolePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  roleChipText: {
    fontSize: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
  },
  userRole: {
    fontSize: 10,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
});
