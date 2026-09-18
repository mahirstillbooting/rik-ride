import React from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export type IconName =
  | 'grid'
  | 'check-square'
  | 'users'
  | 'briefcase'
  | 'navigation'
  | 'truck'
  | 'alert-triangle'
  | 'shield'
  | 'settings'
  | 'sun'
  | 'moon'
  | 'log-out'
  | 'search'
  | 'filter'
  | 'check'
  | 'x'
  | 'clock'
  | 'map-pin'
  | 'plus'
  | 'minus'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-up'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'phone'
  | 'mail'
  | 'info'
  | 'refresh-cw'
  | 'arrow-right'
  | 'wifi'
  | 'zap'
  | 'home'
  | 'compass'
  | 'heart'
  | 'user'
  | 'dollar-sign'
  | 'file-text'
  | 'radio'
  | 'key'
  | 'help-circle'
  | 'bar-chart'
  | 'bar-chart-2'
  | 'location-outline'
  | 'layers'
  | 'edit'
  | 'edit-2'
  | 'slash'
  | 'power'
  | 'user-check'
  | 'user-plus'
  | 'check-circle'
  | 'alert-circle'
  | 'x-circle'
  | 'activity'
  | 'bell'
  | 'wallet'
  | 'credit-card'
  | 'trash'
  | 'trash-2'
  | 'star'
  | 'calendar'
  | 'trending-up'
  | 'camera'
  | 'maximize'
  | 'maximize-2'
  | 'minimize'
  | 'square'
  | 'play';

export interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: any;
}

// Semantic Alias Dictionary: maps non-standard or domain-specific names to standard Feather icons
const SEMANTIC_ICON_MAP: Record<string, string> = {
  notification: 'bell',
  notifications: 'bell',
  bell: 'bell',
  delete: 'trash-2',
  remove: 'trash-2',
  trash: 'trash-2',
  unlink: 'trash-2',
  disconnect: 'trash-2',
  wallet: 'credit-card',
  payment: 'credit-card',
  bkash: 'credit-card',
  BKASH: 'credit-card',
  nagad: 'credit-card',
  NAGAD: 'credit-card',
  mfs: 'credit-card',
  OTHER_MFS: 'credit-card',
  cash: 'dollar-sign',
  CASH: 'dollar-sign',
  card: 'credit-card',
  CARD: 'credit-card',
  rickshaw: 'truck',
  vehicle: 'truck',
  driver: 'user',
  passenger: 'user',
  garage: 'briefcase',
  emergency: 'alert-triangle',
  siren: 'alert-triangle',
  circle: 'info', // STRICT RULE: Never render empty circle; map generic circle requests to info icon
};

export const Icon: React.FC<IconProps> = ({ name, size = 18, color, style }) => {
  const { colors } = useTheme();
  const iconColor = color || colors.textPrimary;

  // Resolve semantic alias if available
  const resolvedName = SEMANTIC_ICON_MAP[name] || name;

  // Special case: Ionicons
  if (resolvedName === 'location-outline') {
    return <Ionicons name="location-outline" size={size} color={iconColor} style={style} />;
  }

  // Feather Icon fallback safety: If resolved name is an empty string or explicitly 'circle', map to 'info'
  const featherName = resolvedName === 'circle' || !resolvedName ? 'info' : resolvedName;

  return <Feather name={featherName as any} size={size} color={iconColor} style={style} />;
};
