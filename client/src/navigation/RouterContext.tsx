import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, ROLE_CONFIGS, RoleNavigationConfig, NavItem } from './roleConfig';

interface RouterContextType {
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeRouteId: string;
  setActiveRouteId: (routeId: string) => void;
  currentRoleConfig: RoleNavigationConfig;
  currentNavItem: NavItem;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRoleState] = useState<UserRole>('PASSENGER');
  const [activeRouteId, setActiveRouteId] = useState<string>('passenger-home');

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    const defaultRoute = ROLE_CONFIGS[role].navItems[0].id;
    setActiveRouteId(defaultRoute);
  };

  const currentRoleConfig = ROLE_CONFIGS[activeRole];
  const currentNavItem =
    currentRoleConfig.navItems.find((item) => item.id === activeRouteId) ||
    currentRoleConfig.navItems[0];

  return (
    <RouterContext.Provider
      value={{
        activeRole,
        setActiveRole,
        activeRouteId,
        setActiveRouteId,
        currentRoleConfig,
        currentNavItem,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
