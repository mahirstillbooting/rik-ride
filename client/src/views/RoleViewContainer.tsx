import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from '../navigation/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AdminDashboardView } from './AdminDashboardView';
import { GarageDashboardView } from './GarageDashboardView';
import { DriverDashboardView } from './DriverDashboardView';
import { PassengerDashboardView } from './PassengerDashboardView';
import { NotificationFeedView } from './NotificationFeedView';
import { PassengerProfileView } from './PassengerProfileView';
import { PassengerSavedPlacesView } from './PassengerSavedPlacesView';
import { DriverProfileView } from './DriverProfileView';
import { GarageProfileView } from './GarageProfileView';

export const RoleViewContainer: React.FC = () => {
  const { currentRoleConfig, activeRouteId } = useRouter();
  const { user } = useAuth();

  // Role: ADMIN
  if (currentRoleConfig.role === 'ADMIN' || user?.role === 'ADMIN') {
    if (activeRouteId === 'admin-notifications') {
      return <NotificationFeedView />;
    }
    return <AdminDashboardView />;
  }

  // Role: GARAGE_OWNER
  if (currentRoleConfig.role === 'GARAGE_OWNER' || user?.role === 'GARAGE_OWNER') {
    if (activeRouteId === 'garage-notifications') {
      return <NotificationFeedView />;
    }
    if (activeRouteId === 'garage-profile') {
      return <GarageProfileView />;
    }
    return <GarageDashboardView />;
  }

  // Role: GARAGE_DRIVER, INDEPENDENT_DRIVER, or DRIVER
  if (
    currentRoleConfig.role === 'GARAGE_DRIVER' ||
    currentRoleConfig.role === 'INDEPENDENT_DRIVER' ||
    user?.role === 'DRIVER'
  ) {
    if (activeRouteId === 'gdriver-notifications' || activeRouteId === 'idriver-notifications') {
      return <NotificationFeedView />;
    }
    if (activeRouteId === 'gdriver-profile' || activeRouteId === 'idriver-settings') {
      return <DriverProfileView />;
    }
    return <DriverDashboardView />;
  }

  // Role: PASSENGER
  if (currentRoleConfig.role === 'PASSENGER' || user?.role === 'PASSENGER') {
    if (activeRouteId === 'passenger-notifications') {
      return <NotificationFeedView />;
    }
    if (activeRouteId === 'passenger-profile') {
      return <PassengerProfileView />;
    }
    if (activeRouteId === 'passenger-saved') {
      return <PassengerSavedPlacesView />;
    }
    return <PassengerDashboardView />;
  }

  return <PassengerDashboardView />;
};
