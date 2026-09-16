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
  | 'location-outline'
  | 'layers'
  | 'edit'
  | 'slash'
  | 'power'
  | 'user-check'
  | 'user-plus'
  | 'check-circle'
  | 'activity';

export interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({ name, size = 18, color, style }) => {
  const { colors } = useTheme();
  const iconColor = color || colors.textPrimary;

  // Map icon names to Feather or Ionicons
  switch (name) {
    case 'grid':
    case 'check-square':
    case 'users':
    case 'briefcase':
    case 'navigation':
    case 'truck':
    case 'alert-triangle':
    case 'shield':
    case 'settings':
    case 'sun':
    case 'moon':
    case 'log-out':
    case 'search':
    case 'filter':
    case 'check':
    case 'x':
    case 'clock':
    case 'map-pin':
    case 'plus':
    case 'chevron-right':
    case 'chevron-left':
    case 'chevron-down':
    case 'chevron-up':
    case 'lock':
    case 'eye':
    case 'eye-off':
    case 'phone':
    case 'mail':
    case 'info':
    case 'refresh-cw':
    case 'arrow-right':
    case 'wifi':
    case 'zap':
    case 'home':
    case 'compass':
    case 'heart':
    case 'user':
    case 'dollar-sign':
    case 'file-text':
    case 'radio':
    case 'key':
    case 'help-circle':
    case 'bar-chart':
    case 'layers':
    case 'edit':
    case 'slash':
    case 'power':
    case 'user-check':
    case 'user-plus':
    case 'check-circle':
    case 'activity':
      return <Feather name={name as any} size={size} color={iconColor} style={style} />;
    case 'location-outline':
      return <Ionicons name="location-outline" size={size} color={iconColor} style={style} />;
    default:
      return <Feather name="circle" size={size} color={iconColor} style={style} />;
  }
};
