import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from './Icon';
import { BkashIcon } from './BkashIcon';
import { NagadIcon } from './NagadIcon';

export interface PaymentMethodBadgeProps {
  method?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({
  method = 'CASH',
  size = 'sm',
  showLabel = true,
}) => {
  const { colors } = useTheme();
  const cleanMethod = (method || 'CASH').toUpperCase();
  const isBkash = cleanMethod === 'BKASH' || cleanMethod === 'BKASH_MFS';
  const isNagad = cleanMethod === 'NAGAD' || cleanMethod === 'NAGAD_MFS';
  const isCash = cleanMethod === 'CASH';
  const iconSize = size === 'sm' ? 14 : 18;
  const fontSize = size === 'sm' ? 12 : 14;

  const labelColor = isBkash
    ? '#E2136E'
    : isNagad
    ? '#F7941D'
    : isCash
    ? colors.success
    : colors.textPrimary;

  const labelText = isBkash ? 'bKash' : isNagad ? 'Nagad' : cleanMethod;

  return (
    <View style={styles.container}>
      {isBkash ? (
        <BkashIcon size={iconSize} />
      ) : isNagad ? (
        <NagadIcon size={iconSize} />
      ) : (
        <Icon
          name={isCash ? 'dollar-sign' : 'credit-card'}
          size={iconSize}
          color={isCash ? colors.success : colors.primary}
        />
      )}
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize,
              color: labelColor,
              fontWeight: isBkash || isNagad ? '800' : '700',
            },
          ]}
        >
          {labelText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    letterSpacing: -0.2,
  },
});
