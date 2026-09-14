import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useRouter } from '../../navigation/RouterContext';
import { useBreakpoint } from '../../theme/breakpoints';
import { borderRadius, spacing } from '../../theme/spacing';
import { UserRole } from '../../navigation/roleConfig';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { mode, colors, toggleTheme } = useTheme();
  const { activeRole, setActiveRole } = useRouter();
  const { isMobile } = useBreakpoint();

  const roleOptions: { label: string; value: UserRole }[] = [
    { label: 'Passenger', value: 'PASSENGER' },
    { label: 'Self-Owned Driver', value: 'INDEPENDENT_DRIVER' },
    { label: 'Garage Driver', value: 'GARAGE_DRIVER' },
    { label: 'Garage Owner', value: 'GARAGE_OWNER' },
    { label: 'Admin', value: 'ADMIN' },
  ];

  return (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.leftSection}>
        {isMobile && (
          <TouchableOpacity
            onPress={onToggleMobileMenu}
            style={[styles.iconButton, { backgroundColor: colors.surfaceHover }]}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 18 }}>☰</Text>
          </TouchableOpacity>
        )}

        <View style={styles.brandContainer}>
          <Text style={[styles.brandText, { color: colors.primary }]}>RIK-RIDE</Text>
          <Text style={[styles.brandTag, { color: colors.textMuted }]}>Platform Shell</Text>
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
                      backgroundColor: isActive ? colors.accentSurface : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      { color: isActive ? colors.accent : colors.textSecondary, fontWeight: isActive ? '700' : '500' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Theme Toggle Button */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
            {mode === 'dark' ? '☀️ Light' : '🌙 Dark'}
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
    alignItems: 'baseline',
    gap: spacing.xs,
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
  themeToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
});
