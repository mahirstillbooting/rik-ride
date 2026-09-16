import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';
import { Badge } from './Badge';

export interface RealMapContainerProps {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  status?: string;
  title?: string;
  subtitle?: string;
  height?: number | string;
  onRecenter?: () => void;
  allowExpand?: boolean;
  driverMarkers?: any[];
  passengerMarkers?: any[];
  style?: StyleProp<ViewStyle>;
}

export const RealMapContainer: React.FC<RealMapContainerProps> = ({
  latitude = 23.8103,
  longitude = 90.4125,
  accuracy,
  status = 'LOCATION_ACTIVE',
  title = 'Real-Time GeoTelemetry Engine',
  subtitle = 'Device GPS Synchronized',
  height = 360,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.mapCard,
        {
          height: height as DimensionValue,
          backgroundColor: colors.mapBg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.mapHeaderOverlay, { backgroundColor: colors.overlay, borderColor: colors.borderSubtle }]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.mapTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.mapSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
        <Badge label={status} variant="info" />
      </View>
      <View style={styles.fallbackBox}>
        <Text style={{ color: colors.textSecondary }}>
          Real Map Telemetry [{latitude.toFixed(4)}, {longitude.toFixed(4)}]
        </Text>
        {accuracy ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>Accuracy: ±{accuracy.toFixed(1)}m</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapCard: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapHeaderOverlay: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  mapSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  fallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
});
