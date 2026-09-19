import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from './Icon';
import { BkashIcon } from './BkashIcon';

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
  const isCash = cleanMethod === 'CASH';
  const iconSize = size === 'sm' ? 14 : 18;
  const fontSize = size === 'sm' ? 12 : 14;

  return (
    <View style={styles.container}>
      {isBkash ? (
        <BkashIcon size={iconSize} />
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
              color: isBkash ? '#E2136E' : isCash ? colors.success : colors.textPrimary,
              fontWeight: isBkash ? '800' : '700',
            },
          ]}
        >
          {isBkash ? 'bKash' : cleanMethod}
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
