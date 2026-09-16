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
  allowExpand?: boolean;
}

export const RealMapContainer: React.FC<RealMapContainerProps> = ({
  latitude: propLat,
  longitude: propLng,
  accuracy: propAccuracy,
  status = 'LOCATION_ACTIVE',
  title = 'Real-Time GeoTelemetry Engine',
  subtitle = 'Device GPS Synchronized',
  height = 360,
  allowExpand = true,
}) => {
  const { colors, mode } = useTheme();

  // Admin PC / Device Live Location State
  const [deviceCoords, setDeviceCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    source: string;
  }>({
    lat: propLat ?? 23.8103, // Default fallback if no GPS
    lng: propLng ?? 90.4125,
    accuracy: propAccuracy,
    source: propLat ? 'TELEMETRY' : 'INITIALIZING',
  });

  // Embedded Map References & State
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [isUserPanning, setIsUserPanning] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fullscreen Modal References & State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isModalUserPanning, setIsModalUserPanning] = useState(false);

  const modalMapContainerRef = useRef<HTMLDivElement | null>(null);
  const modalMapInstanceRef = useRef<any>(null);
  const modalMarkerRef = useRef<any>(null);
  const modalAccuracyCircleRef = useRef<any>(null);
  const modalTileLayerRef = useRef<any>(null);

  // -------------------------------------------------------------
  // 1. ACQUIRE ACTUAL ADMIN PC LIVE GPS LOCATION
  // -------------------------------------------------------------
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) return;

    // Request actual Admin PC browser geolocation
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setDeviceCoords({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || undefined,
          source: 'ADMIN_PC_LIVE_GPS',
        });
      },
      (err) => {
        console.warn('Browser GPS notification:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }, []);

  // Update coords if props explicitly change from parent
  useEffect(() => {
    if (propLat !== undefined && propLng !== undefined) {
      setDeviceCoords({
        lat: propLat,
        lng: propLng,
        accuracy: propAccuracy,
        source: 'TELEMETRY',
      });
    }
  }, [propLat, propLng, propAccuracy]);

  // Inject Leaflet & High-Visibility Dark Mode CSS animations
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const leafletCssId = 'leaflet-css-cdn';
    if (!document.getElementById(leafletCssId)) {
      const link = document.createElement('link');
      link.id = leafletCssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const animCssId = 'rik-map-modal-animations';
    if (!document.getElementById(animCssId)) {
      const styleEl = document.createElement('style');
      styleEl.id = animCssId;
      styleEl.innerHTML = `
        @keyframes rikModalFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes rikModalFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes rikModalExpandIn {
          0% { opacity: 0; transform: scale(0.92) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes rikModalExpandOut {
          0% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.95) translateY(8px); }
        }
        .rik-map-clickable {
          cursor: pointer;
        }
        /* Sleek High-Visibility Dark Tile Filter for OpenStreetMap (Bright crisp text labels) */
        .rik-dark-tile-layer {
          filter: brightness(0.85) contrast(1.15) invert(0.92) hue-rotate(185deg) saturate(0.75) !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Modal Open & Close Handlers with smooth animation & scroll preservation
  const handleOpenModal = () => {
    if (!allowExpand) return;
    setIsModalOpen(true);
    setIsModalClosing(false);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };

  const handleCloseModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsModalClosing(false);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }, 220);
  };

  // Keyboard listener for Escape key to close expanded map modal
  useEffect(() => {
    if (!isModalOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // -------------------------------------------------------------
  // 2. EMBEDDED MAP INITIALIZATION & UPDATES
  // -------------------------------------------------------------
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
          center: [deviceCoords.lat, deviceCoords.lng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        // 100% Free Public OpenStreetMap Tiles (NO API KEY, NO WATERMARK)
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc',
          className: mode === 'dark' ? 'rik-dark-tile-layer' : '',
        }).addTo(map);

        L.control
          .attribution({ position: 'bottomright' })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
          .addTo(map);

        const driverIcon = L.divIcon({
          className: 'rik-driver-location-marker',
          html: `
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(226, 118, 58, 0.32); animation: rikPulse 2s infinite ease-in-out;"></div>
              <div style="width: 15px; height: 15px; border-radius: 50%; background: #E2763A; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 10px rgba(0,0,0,0.45);"></div>
            </div>
            <style>
              @keyframes rikPulse {
                0% { transform: scale(0.8); opacity: 0.85; }
                50% { transform: scale(1.45); opacity: 0.2; }
                100% { transform: scale(0.8); opacity: 0.85; }
              }
            </style>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([deviceCoords.lat, deviceCoords.lng], { icon: driverIcon }).addTo(map);

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
        accuracyCircleRef.current = null;
      }
    };
  }, []);

  // Update tile layer dark mode filter on theme toggle
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current || Platform.OS !== 'web') return;
    const tileContainer = tileLayerRef.current.getContainer();
    if (tileContainer) {
      if (mode === 'dark') {
        tileContainer.classList.add('rik-dark-tile-layer');
      } else {
        tileContainer.classList.remove('rik-dark-tile-layer');
      }
    }
  }, [mode]);

  // Update embedded marker position & accuracy circle when deviceCoords changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || Platform.OS !== 'web') return;
    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    const newPos: [number, number] = [deviceCoords.lat, deviceCoords.lng];
    markerRef.current.setLatLng(newPos);

    if (deviceCoords.accuracy && deviceCoords.accuracy > 0) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setRadius(deviceCoords.accuracy);
      } else {
        accuracyCircleRef.current = L.circle(newPos, {
          radius: deviceCoords.accuracy,
          color: '#E2763A',
          fillColor: '#E2763A',
          fillOpacity: 0.10,
          weight: 1.5,
        }).addTo(mapInstanceRef.current);
      }
    }

    if (!isUserPanning) {
      mapInstanceRef.current.panTo(newPos, { animate: true, duration: 0.8 });
    }
  }, [deviceCoords, isUserPanning]);

  // Embedded map controls
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      setIsUserPanning(false);
      mapInstanceRef.current.setView([deviceCoords.lat, deviceCoords.lng], 16, { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // -------------------------------------------------------------
  // 3. EXPANDED FULLSCREEN MODAL MAP INITIALIZATION & UPDATES
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isModalOpen || Platform.OS !== 'web' || typeof window === 'undefined' || !modalMapContainerRef.current) return;

    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    if (!modalMapInstanceRef.current) {
      try {
        const map = L.map(modalMapContainerRef.current, {
          center: [deviceCoords.lat, deviceCoords.lng],
          zoom: 16,
          zoomControl: false,
          attributionControl: false,
        });

        // 100% Free Public OpenStreetMap Tiles (NO API KEY, NO WATERMARK)
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc',
          className: mode === 'dark' ? 'rik-dark-tile-layer' : '',
        }).addTo(map);

        L.control
          .attribution({ position: 'bottomright' })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
          .addTo(map);

        const driverIcon = L.divIcon({
          className: 'rik-driver-location-marker-modal',
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(226, 118, 58, 0.32); animation: rikPulse 2s infinite ease-in-out;"></div>
              <div style="width: 17px; height: 17px; border-radius: 50%; background: #E2763A; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 12px rgba(0,0,0,0.5);"></div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([deviceCoords.lat, deviceCoords.lng], { icon: driverIcon }).addTo(map);

        map.on('dragstart', () => {
          setIsModalUserPanning(true);
        });

        modalMapInstanceRef.current = map;
        modalMarkerRef.current = marker;
        modalTileLayerRef.current = tileLayer;

        // Invalidate size after modal scale transition completes to ensure full tile resolution
        setTimeout(() => {
          if (modalMapInstanceRef.current) {
            modalMapInstanceRef.current.invalidateSize({ animate: false });
          }
        }, 150);
      } catch (err: any) {
        console.error('Modal map initialization error:', err);
      }
    }

    return () => {
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
        modalMarkerRef.current = null;
        modalTileLayerRef.current = null;
        modalAccuracyCircleRef.current = null;
      }
    };
  }, [isModalOpen]);

  // Update modal tile layer dark mode filter on theme toggle
  useEffect(() => {
    if (!modalMapInstanceRef.current || !modalTileLayerRef.current || Platform.OS !== 'web') return;
    const tileContainer = modalTileLayerRef.current.getContainer();
    if (tileContainer) {
      if (mode === 'dark') {
        tileContainer.classList.add('rik-dark-tile-layer');
      } else {
        tileContainer.classList.remove('rik-dark-tile-layer');
      }
    }
  }, [mode]);

  // Update modal marker position & accuracy circle
  useEffect(() => {
    if (!modalMapInstanceRef.current || !modalMarkerRef.current || Platform.OS !== 'web') return;
    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    const newPos: [number, number] = [deviceCoords.lat, deviceCoords.lng];
    modalMarkerRef.current.setLatLng(newPos);

    if (deviceCoords.accuracy && deviceCoords.accuracy > 0) {
      if (modalAccuracyCircleRef.current) {
        modalAccuracyCircleRef.current.setLatLng(newPos);
        modalAccuracyCircleRef.current.setRadius(deviceCoords.accuracy);
      } else {
        modalAccuracyCircleRef.current = L.circle(newPos, {
          radius: deviceCoords.accuracy,
          color: '#E2763A',
          fillColor: '#E2763A',
          fillOpacity: 0.10,
          weight: 1.5,
        }).addTo(modalMapInstanceRef.current);
      }
    }

    if (!isModalUserPanning) {
      modalMapInstanceRef.current.panTo(newPos, { animate: true, duration: 0.8 });
    }
  }, [deviceCoords, isModalUserPanning]);

  // Modal map control handlers
  const handleModalRecenter = () => {
    if (modalMapInstanceRef.current) {
      setIsModalUserPanning(false);
      modalMapInstanceRef.current.setView([deviceCoords.lat, deviceCoords.lng], 16, { animate: true });
    }
  };

  const handleModalZoomIn = () => {
    if (modalMapInstanceRef.current) modalMapInstanceRef.current.zoomIn();
  };

  const handleModalZoomOut = () => {
    if (modalMapInstanceRef.current) modalMapInstanceRef.current.zoomOut();
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
      {/* Embedded Map Header Overlay */}
      <View style={[styles.mapHeaderOverlay, { backgroundColor: colors.overlay, borderColor: colors.borderSubtle }]}>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.mapTitle, { color: colors.textPrimary }]}>{title}</Text>
          </View>
          <Text style={[styles.mapSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <View style={styles.badgeGroup}>
          <Badge
            label={deviceCoords.source === 'ADMIN_PC_LIVE_GPS' ? 'LIVE PC GPS' : status.replace('_', ' ')}
            variant={status === 'LOCATION_ACTIVE' || deviceCoords.source === 'ADMIN_PC_LIVE_GPS' ? 'success' : 'warning'}
          />

          {allowExpand && (
            <TouchableOpacity
              style={[styles.expandHeaderBtn, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}
              onPress={handleOpenModal}
            >
              <Icon name="maximize-2" size={13} color={colors.primary} />
              <Text style={[styles.expandHeaderBtnText, { color: colors.primary }]}>Expand Map</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Leaflet Web Embedded Map Canvas */}
      <View style={styles.canvasContainer}>
        {Platform.OS === 'web' ? (
          <div
            ref={mapContainerRef}
            onClick={handleOpenModal}
            className="rik-map-clickable"
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

        {/* Floating Controls for Embedded Map */}
        <View style={styles.mapControls}>
          {allowExpand && (
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.primaryBorder }]}
              onPress={handleOpenModal}
            >
              <Icon name="maximize-2" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}

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

      {/* Embedded Map Footer Banner */}
      <View style={[styles.mapFooterBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {deviceCoords.source === 'ADMIN_PC_LIVE_GPS' ? 'Admin PC Location' : 'Current Position'}:{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{deviceCoords.lat.toFixed(5)}°, {deviceCoords.lng.toFixed(5)}°</Text>
          {deviceCoords.accuracy ? ` • Accuracy: ±${deviceCoords.accuracy.toFixed(1)}m` : ''}
        </Text>
        {allowExpand ? (
          <TouchableOpacity onPress={handleOpenModal}>
            <Text style={[styles.recenterLink, { color: colors.primary }]}>Fullscreen Map ↗</Text>
          </TouchableOpacity>
        ) : (
          isUserPanning && (
            <TouchableOpacity onPress={handleRecenter}>
              <Text style={[styles.recenterLink, { color: colors.primary }]}>Click to Recenter →</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* ------------------------------------------------------------- */}
      {/* 4. FULLSCREEN COMMAND-CENTER MAP MODAL (SAME PAGE OVERLAY)     */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && Platform.OS === 'web' && (
        <div
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(8, 9, 10, 0.82)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: isModalClosing ? 'rikModalFadeOut 220ms ease-in forwards' : 'rikModalFadeIn 250ms ease-out forwards',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '94vw',
              maxWidth: '1400px',
              height: '88vh',
              maxHeight: '900px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
              animation: isModalClosing
                ? 'rikModalExpandOut 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
                : 'rikModalExpandIn 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              position: 'relative',
            }}
          >
            {/* Expanded Modal Command Header */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceElevated,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: colors.primary }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                      {title || 'Dhaka GeoTelemetry Command Center'}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        color: colors.primary,
                        backgroundColor: colors.primarySurface,
                        border: `1px solid ${colors.primaryBorder}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      FULLSCREEN COMMAND MAP
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
                    {subtitle || 'Live Device GPS & Fleet Position Telemetry Stream'}
                  </div>
                </div>
              </div>

              {/* Header Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleModalRecenter}
                >
                  <Icon name="navigation" size={14} color={isModalUserPanning ? colors.primary : colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleModalZoomIn}
                >
                  <Icon name="plus" size={14} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleModalZoomOut}
                >
                  <Icon name="minus" size={14} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}
                  onPress={handleCloseModal}
                >
                  <Icon name="x" size={16} color={colors.primary} />
                </TouchableOpacity>
              </div>
            </div>

            {/* Expanded Modal Leaflet Canvas Container */}
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
              <div
                ref={modalMapContainerRef}
                style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
              />
            </div>

            {/* Expanded Modal Telemetry Footer Banner */}
            <div
              style={{
                padding: '10px 20px',
                borderTop: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceElevated,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: colors.textSecondary,
                zIndex: 10,
              }}
            >
              <div>
                {deviceCoords.source === 'ADMIN_PC_LIVE_GPS' ? 'Admin PC Live Location' : 'Current Telemetry Position'}:{' '}
                <strong style={{ color: colors.primary }}>
                  {deviceCoords.lat.toFixed(5)}°, {deviceCoords.lng.toFixed(5)}°
                </strong>
                {deviceCoords.accuracy ? ` • Accuracy: ±${deviceCoords.accuracy.toFixed(1)}m` : ''} • Stream Status:{' '}
                <span style={{ color: colors.success, fontWeight: '700' }}>
                  {deviceCoords.source === 'ADMIN_PC_LIVE_GPS' ? 'LIVE_PC_GPS' : status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {isModalUserPanning && (
                  <TouchableOpacity onPress={handleModalRecenter}>
                    <Text style={[styles.recenterLink, { color: colors.primary }]}>Click to Recenter Map →</Text>
                  </TouchableOpacity>
                )}
                <span style={{ color: colors.textMuted, fontSize: '11px' }}>Press ESC or click outside to close</span>
              </div>
            </div>
          </div>
        </div>
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
    alignItems: 'center',
    gap: spacing.xs,
  },
  expandHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  expandHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
  modalCloseBtn: {
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
