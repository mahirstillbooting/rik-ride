import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  DimensionValue,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { RealMapContainer } from './RealMapContainer';

export interface RickshawMarker {
  id: string;
  shortVehicleNumber: string;
  driverName: string;
  status: 'AVAILABLE' | 'ON_RIDE' | 'OFFLINE';
  lat: number;
  lng: number;
}

export interface MapContainerProps {
  height?: number | string;
  title?: string;
  subtitle?: string;
  markers?: RickshawMarker[];
  showRoute?: boolean;
  style?: StyleProp<ViewStyle>;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  status?: string;
  allowExpand?: boolean;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  height = 340,
  title = 'Real-Time GeoTelemetry Command Center',
  subtitle = 'Dhaka Sector — Device GPS Synchronized',
  markers: propMarkers,
  showRoute = true,
  style,
  latitude,
  longitude,
  accuracy,
  status,
  allowExpand = true,
}) => {
  const { colors, mode } = useTheme();
  const [selectedMarker, setSelectedMarker] = useState<RickshawMarker | null>(null);

  // If running on web, delegate map rendering to RealMapContainer for real Leaflet geographic map
  if (Platform.OS === 'web') {
    return (
      <RealMapContainer
        height={height}
        title={title}
        subtitle={subtitle}
        latitude={latitude ?? (propMarkers && propMarkers[0] ? propMarkers[0].lat : 23.8103)}
        longitude={longitude ?? (propMarkers && propMarkers[0] ? propMarkers[0].lng : 90.4125)}
        accuracy={accuracy}
        status={status || 'LOCATION_ACTIVE'}
        allowExpand={allowExpand}
      />
    );
  }

  // Default sample active rickshaws in Dhaka
  const markers: RickshawMarker[] = propMarkers || [
    { id: '1', shortVehicleNumber: 'D-1024', driverName: 'Karim Ahmed', status: 'AVAILABLE', lat: 23.8103, lng: 90.4125 },
    { id: '2', shortVehicleNumber: 'D-1028', driverName: 'Rahim Uddin', status: 'ON_RIDE', lat: 23.8135, lng: 90.4168 },
    { id: '3', shortVehicleNumber: 'D-1035', driverName: 'Abul Hussain', status: 'AVAILABLE', lat: 23.8075, lng: 90.4082 },
  ];

  return (
    <View
      style={[
        styles.mapCard,
        {
          height: height as DimensionValue,
          backgroundColor: colors.mapBg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {/* Map Header Overlay */}
      <View style={[styles.mapHeaderOverlay, { backgroundColor: colors.overlay, borderColor: colors.borderSubtle }]}>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.mapTitle, { color: colors.textPrimary }]}>{title}</Text>
          </View>
          <Text style={[styles.mapSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <View style={styles.badgeGroup}>
          <Badge label="Device GPS" variant="info" />
          <Badge label={mode === 'dark' ? 'Dark Map' : 'Light Map'} variant="neutral" />
        </View>
      </View>

      {/* Map Canvas Presentation */}
      <View style={styles.canvasContainer}>
        {/* Dynamic Grid Overlay Effect */}
        <View
          style={[
            styles.gridPattern,
            {
              borderColor: colors.borderSubtle,
              backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.40)',
            },
          ]}
        />

        {/* Route Path Indicator Line */}
        {showRoute && (
          <View style={[styles.routePath, { borderColor: colors.primary }]} />
        )}

        {/* User Location Marker */}
        <View style={[styles.userPin, { left: '42%', top: '48%' }]}>
          <View style={[styles.userPinPulse, { backgroundColor: colors.primaryMuted }]} />
          <View style={[styles.userPinCore, { backgroundColor: colors.primary, borderColor: colors.surface }]} />
          <Text style={[styles.markerTag, { color: colors.textPrimary, backgroundColor: colors.surfaceElevated }]}>
            You
          </Text>
        </View>

        {/* Rickshaw Fleet Markers */}
        {markers.map((marker, index) => {
          const positions: Array<{ left: DimensionValue; top: DimensionValue }> = [
            { left: '28%', top: '35%' },
            { left: '68%', top: '30%' },
            { left: '60%', top: '65%' },
          ];
          const pos = positions[index % positions.length];

          return (
            <TouchableOpacity
              key={marker.id}
              style={[styles.markerWrapper, pos]}
              onPress={() => setSelectedMarker(marker)}
            >
              <View
                style={[
                  styles.markerIconBox,
                  {
                    backgroundColor: marker.status === 'AVAILABLE' ? colors.primary : colors.surfaceElevated,
                    borderColor: colors.borderStrong,
                  },
                ]}
              >
                <Icon name="truck" size={12} color={colors.primaryForeground} />
              </View>
              <View style={[styles.markerPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.markerPillText, { color: colors.primary }]}>{marker.shortVehicleNumber}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Interactive Map Control Buttons */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Icon name="plus" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Icon name="refresh-cw" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Marker Details Popup */}
      {selectedMarker && (
        <View style={[styles.selectedCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}>
          <View style={styles.selectedRow}>
            <View>
              <Text style={[styles.selectedTitle, { color: colors.textPrimary }]}>
                Rickshaw {selectedMarker.shortVehicleNumber}
              </Text>
              <Text style={[styles.selectedDesc, { color: colors.textSecondary }]}>
                Driver: {selectedMarker.driverName} • Status: {selectedMarker.status}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedMarker(null)}>
              <Icon name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapCard: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapHeaderOverlay: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  mapSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gridPattern: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    opacity: 0.15,
  },
  routePath: {
    position: 'absolute',
    left: '30%',
    top: '36%',
    width: '38%',
    height: '28%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 80,
    opacity: 0.7,
  },
  userPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  userPinPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: -6,
  },
  userPinCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  markerTag: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  markerIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 3,
  },
  markerPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
    zIndex: 15,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    zIndex: 20,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
