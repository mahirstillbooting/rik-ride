/**
 * Role-Based Route Definitions & Navigation Configuration
 * Supports 5 distinct roles/operating modes:
 * - ADMIN
 * - GARAGE_OWNER
 * - GARAGE_DRIVER (Garage-Registered Driver)
 * - INDEPENDENT_DRIVER (Self-Owned Driver)
 * - PASSENGER
 */

export type UserRole =
  | 'ADMIN'
  | 'GARAGE_OWNER'
  | 'GARAGE_DRIVER'
  | 'INDEPENDENT_DRIVER'
  | 'PASSENGER'
  | 'DRIVER';

export type DriverOperatingMode = 'GARAGE_REGISTERED' | 'SELF_OWNED';

export interface NavItem {
  id: string;
  label: string;
  iconName: string;
  badgeText?: string;
}

export interface RoleNavigationConfig {
  role: UserRole;
  displayName: string;
  description: string;
  navItems: NavItem[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleNavigationConfig> = {
  ADMIN: {
    role: 'ADMIN',
    displayName: 'Platform Admin',
    description: 'Central operational monitoring and entity approval command center',
    navItems: [
      { id: 'admin-overview', label: 'Overview', iconName: 'grid' },
      { id: 'admin-analytics', label: 'Analytics & Reports', iconName: 'bar-chart' },
      { id: 'admin-approvals', label: 'Approval Queue', iconName: 'check-square', badgeText: 'Queue' },
      { id: 'admin-users', label: 'Users', iconName: 'users' },
      { id: 'admin-garages', label: 'Garages', iconName: 'briefcase' },
      { id: 'admin-drivers', label: 'Drivers', iconName: 'navigation' },
      { id: 'admin-vehicles', label: 'Rickshaws / Fleet', iconName: 'truck' },
      { id: 'admin-safety', label: 'Safety & SOS', iconName: 'alert-triangle' },
      { id: 'admin-rides', label: 'Trip History & Investigations', iconName: 'navigation' },
      { id: 'admin-tickets', label: 'Support Tickets', iconName: 'life-buoy', badgeText: 'Support' },
      { id: 'admin-audit', label: 'Audit Activity', iconName: 'shield' },
      { id: 'admin-notifications', label: 'System Notifications', iconName: 'bell' },
      { id: 'admin-settings', label: 'Platform Settings', iconName: 'settings' },
    ],
  },
  GARAGE_OWNER: {
    role: 'GARAGE_OWNER',
    displayName: 'Garage Owner',
    description: 'Manage garage fleet, assigned drivers, and operational shifts',
    navItems: [
      { id: 'garage-dashboard', label: 'Garage Hub', iconName: 'home' },
      { id: 'garage-vehicles', label: 'Registered Vehicles', iconName: 'truck' },
      { id: 'garage-drivers', label: 'Assigned Drivers', iconName: 'users' },
      { id: 'garage-dispatch', label: 'Active Shifts & Dispatch', iconName: 'clock' },
      { id: 'garage-analytics', label: 'Garage Performance', iconName: 'bar-chart' },
      { id: 'garage-rides', label: 'Fleet Ride History', iconName: 'map-pin' },
      { id: 'garage-notifications', label: 'Notifications', iconName: 'bell' },
      { id: 'garage-profile', label: 'Garage Profile', iconName: 'user' },
    ],
  },
  GARAGE_DRIVER: {
    role: 'GARAGE_DRIVER',
    displayName: 'Garage-Registered Driver',
    description: 'Operates vehicle assigned by a registered Garage',
    navItems: [
      { id: 'gdriver-shift', label: 'Shift Control', iconName: 'key' },
      { id: 'gdriver-vehicle', label: 'Assigned Vehicle Info', iconName: 'info' },
      { id: 'gdriver-rides', label: 'Assigned Trips', iconName: 'map-pin' },
      { id: 'gdriver-support', label: 'Garage Dispatch Help', iconName: 'help-circle' },
      { id: 'gdriver-notifications', label: 'Notifications', iconName: 'bell' },
      { id: 'gdriver-profile', label: 'Driver Profile', iconName: 'user' },
    ],
  },
  INDEPENDENT_DRIVER: {
    role: 'INDEPENDENT_DRIVER',
    displayName: 'Self-Owned Driver',
    description: 'Operates self-owned vehicle independently',
    navItems: [
      { id: 'idriver-online', label: 'Drive / Go Online', iconName: 'radio' },
      { id: 'idriver-vehicle', label: 'My Vehicle & Docs', iconName: 'file-text' },
      { id: 'idriver-earnings', label: 'Earnings & Trips', iconName: 'dollar-sign' },
      { id: 'idriver-notifications', label: 'Notifications', iconName: 'bell' },
      { id: 'idriver-settings', label: 'Driver Profile', iconName: 'user' },
    ],
  },
  PASSENGER: {
    role: 'PASSENGER',
    displayName: 'Passenger',
    description: 'Request rides, track live trips, and view ride history',
    navItems: [
      { id: 'passenger-home', label: 'Book Ride', iconName: 'compass' },
      { id: 'passenger-activity', label: 'My Trips', iconName: 'clock' },
      { id: 'passenger-saved', label: 'Saved Places', iconName: 'heart' },
      { id: 'passenger-notifications', label: 'Notifications', iconName: 'bell' },
      { id: 'passenger-profile', label: 'Account & Settings', iconName: 'user' },
    ],
  },
  DRIVER: {
    role: 'DRIVER',
    displayName: 'Driver',
    description: 'Operates vehicle on RIK-RIDE platform',
    navItems: [
      { id: 'gdriver-shift', label: 'Shift Control', iconName: 'key' },
      { id: 'gdriver-vehicle', label: 'Assigned Vehicle Info', iconName: 'info' },
      { id: 'gdriver-rides', label: 'Assigned Trips', iconName: 'map-pin' },
      { id: 'gdriver-support', label: 'Garage Dispatch Help', iconName: 'help-circle' },
      { id: 'gdriver-notifications', label: 'Notifications', iconName: 'bell' },
      { id: 'gdriver-profile', label: 'Driver Profile', iconName: 'user' },
    ],
  },
};
