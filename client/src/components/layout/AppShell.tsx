import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useBreakpoint } from '../../theme/breakpoints';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PageContainer } from './PageContainer';
import { RoleViewContainer } from '../../views/RoleViewContainer';
import { ProtectedGuard } from '../../navigation/ProtectedGuard';
import { ToastProvider } from '../ui/Toast';

export const AppShellContent: React.FC = () => {
  const { colors } = useTheme();
  const { isMobile } = useBreakpoint();
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Header onToggleMobileMenu={() => setMobileDrawerVisible(true)} />

      {/* Main Body Layout */}
      <View style={styles.body}>
        {/* Protected Guard Wraps Role Navigation & Page Content */}
        <ProtectedGuard>
          {/* Sidebar on Tablet & Desktop */}
          {!isMobile && <Sidebar />}

          {/* Page Content Container */}
          <PageContainer>
            <RoleViewContainer />
          </PageContainer>
        </ProtectedGuard>
      </View>

      {/* Mobile Navigation & Drawer Overlay */}
      {isMobile && (
        <MobileNav
          drawerVisible={mobileDrawerVisible}
          onCloseDrawer={() => setMobileDrawerVisible(false)}
        />
      )}
    </View>
  );
};

export const AppShell: React.FC = () => {
  return (
    <ToastProvider>
      <AppShellContent />
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
});
