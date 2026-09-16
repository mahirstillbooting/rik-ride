import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, DimensionValue } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';
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
}

export const RealMapContainer: React.FC<RealMapContainerProps> = ({
  latitude = 23.8103, // Default Dhaka fallback
  longitude = 90.4125,
  accuracy,
  status = 'LOCATION_ACTIVE',
  title = 'Real-Time GeoTelemetry Engine',
  subtitle = 'Device GPS Synchronized',
  height = 360,
}) => {
  const { colors, mode } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [isUserPanning, setIsUserPanning] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Inject Leaflet CSS dynamically on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const cssId = 'leaflet-css-cdn';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;
    try {
      L = require('leaflet');
    } catch (e: any) {
      setMapError('Failed to load Leaflet map library');
      return;
    }

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: [latitude, longitude],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        // Add CartoDB Tile Layer (Dark Matter for Dark Mode, Positron for Light Mode)
        const tileUrl =
          mode === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        const tileLayer = L.tileLayer(tileUrl, {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        // Add attribution control
        L.control
          .attribution({ position: 'bottomright' })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>')
          .addTo(map);

        // Create Custom Driver Location Icon (RIK-RIDE Muted Orange Accent)
        const driverIcon = L.divIcon({
          className: 'rik-driver-location-marker',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(226, 118, 58, 0.25); animation: rikPulse 2s infinite ease-in-out;"></div>
              <div style="width: 14px; height: 14px; border-radius: 50%; background: #E2763A; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
            </div>
            <style>
              @keyframes rikPulse {
                0% { transform: scale(0.8); opacity: 0.8; }
                50% { transform: scale(1.4); opacity: 0.2; }
                100% { transform: scale(0.8); opacity: 0.8; }
              }
            </style>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([latitude, longitude], { icon: driverIcon }).addTo(map);

        // Track user drag/pan interaction to prevent stealing camera focus
        map.on('dragstart', () => {
          setIsUserPanning(true);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        tileLayerRef.current = tileLayer;
        setMapLoaded(true);
      } catch (err: any) {
        setMapError(err.message || 'Error initializing interactive map');
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Dynamically update tile layer when theme mode changes
  useEffect(() => {
    if (!mapInstanceRef.current || Platform.OS !== 'web') return;

    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mode === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(
      mapInstanceRef.current
    );
  }, [mode]);

  // Update marker position & accuracy circle when latitude/longitude updates
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || Platform.OS !== 'web') return;

    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    const newPos: [number, number] = [latitude, longitude];
    markerRef.current.setLatLng(newPos);

    // Update or create accuracy circle
    if (accuracy && accuracy > 0) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setRadius(accuracy);
      } else {
        accuracyCircleRef.current = L.circle(newPos, {
          radius: accuracy,
          color: '#E2763A',
          fillColor: '#E2763A',
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(mapInstanceRef.current);
      }
    }

    // Auto-center map if user is NOT actively panning manually
    if (!isUserPanning) {
      mapInstanceRef.current.panTo(newPos, { animate: true, duration: 0.8 });
    }
  }, [latitude, longitude, accuracy, isUserPanning]);

  // Recenter button click handler
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      setIsUserPanning(false);
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  if (mapError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}>
        <Icon name="alert-triangle" size={20} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.danger }]}>{mapError}</Text>
      </View>
    );
  }

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
          <Badge label={status.replace('_', ' ')} variant={status === 'LOCATION_ACTIVE' ? 'success' : 'warning'} />
          <Badge label="Interactive Leaflet GPS" variant="info" />
        </View>
      </View>

      {/* Leaflet Web Map Container */}
      <View style={styles.canvasContainer}>
        {Platform.OS === 'web' ? (
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              zIndex: 1,
            }}
          />
        ) : (
          <View style={[styles.fallbackBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={{ color: colors.textSecondary }}>Real Map requires Web Browser Environment</Text>
          </View>
        )}

        {/* Floating Recenter & Zoom Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={handleRecenter}
          >
            <Icon name="navigation" size={14} color={isUserPanning ? colors.primary : colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={handleZoomIn}
          >
            <Icon name="plus" size={14} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={handleZoomOut}
          >
            <Icon name="minus" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Coordinates Footer Banner */}
      <View style={[styles.mapFooterBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Current Position: <Text style={{ color: colors.primary, fontWeight: '700' }}>{latitude.toFixed(5)}°, {longitude.toFixed(5)}°</Text>
          {accuracy ? ` • Accuracy: ±${accuracy.toFixed(1)}m` : ''}
        </Text>
        {isUserPanning && (
          <TouchableOpacity onPress={handleRecenter}>
            <Text style={[styles.recenterLink, { color: colors.primary }]}>Click to Recenter →</Text>
          </TouchableOpacity>
        )}
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
    position: 'relative',
  },
  mapHeaderOverlay: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
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
  fallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
    zIndex: 1000,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFooterBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  footerText: {
    fontSize: 12,
  },
  recenterLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
