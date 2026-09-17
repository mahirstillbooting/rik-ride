import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { View, Text, StyleSheet, TouchableOpacity, Platform, DimensionValue } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { Button } from './Button';
import { NearbyRickshaw } from '../../services/passengerLocationService';

export interface MapMarkerItem {
  id: string;
  type: 'DRIVER' | 'PASSENGER';
  lat: number;
  lng: number;
  accuracy?: number;
  label: string;
  sublabel: string;
}

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
  driverMarkers?: MapMarkerItem[];
  passengerMarkers?: MapMarkerItem[];
  rickshawMarkers?: NearbyRickshaw[];
  isPassengerView?: boolean;
  onTargetedRequest?: (rickshaw: NearbyRickshaw) => void;
  routePolyline?: Array<[number, number]>;
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
  driverMarkers = [],
  passengerMarkers = [],
  rickshawMarkers = [],
  isPassengerView = false,
  onTargetedRequest,
  routePolyline,
}) => {
  const { colors, mode } = useTheme();

  // Selected Rickshaw & Detail Modal States
  const [selectedRickshaw, setSelectedRickshaw] = useState<NearbyRickshaw | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Device Live Location State
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
  const rickshawLayerGroupRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

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
  const modalRickshawLayerGroupRef = useRef<any>(null);
  const modalPolylineRef = useRef<any>(null);

  // Acquire Browser Geolocation if no props provided
  useEffect(() => {
    if (propLat !== undefined && propLng !== undefined) return;
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setDeviceCoords({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || undefined,
          source: 'DEVICE_GPS',
        });
      },
      (err) => {
        console.warn('Browser GPS notice:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }, [propLat, propLng]);

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

  // Inject Leaflet & High-Visibility Dark Mode CSS
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
        @keyframes rikPulse {
          0% { transform: scale(0.85); opacity: 0.85; }
          50% { transform: scale(1.4); opacity: 0.2; }
          100% { transform: scale(0.85); opacity: 0.85; }
        }
        .rik-map-clickable {
          cursor: pointer;
        }
        .rik-dark-tile-layer {
          filter: brightness(0.85) contrast(1.15) invert(0.92) hue-rotate(185deg) saturate(0.75) !important;
        }
        .leaflet-tooltip.rik-custom-leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip.rik-custom-leaflet-tooltip::before {
          display: none !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Modal Open & Close Handlers
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

  // Keyboard listener for ESC key
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

  // Ref to hold current onTargetedRequest callback for global window listener
  const onTargetedRequestRef = useRef(onTargetedRequest);
  useEffect(() => {
    onTargetedRequestRef.current = onTargetedRequest;
  }, [onTargetedRequest]);

  // Expose global window callbacks for Leaflet HTML popover button clicks
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    (window as any).__rikCallDriver = (phone: string) => {
      handleCallDriver(phone);
    };
    (window as any).__rikShowDetails = (vehicleId: string) => {
      const found = rickshawMarkers.find((r) => r.vehicleId === vehicleId);
      if (found) {
        setSelectedRickshaw(found);
        setShowDetailModal(true);
      }
    };
    (window as any).__rikTargetedRequest = (vehicleId: string) => {
      const found = rickshawMarkers.find((r) => r.vehicleId === vehicleId);
      if (found && onTargetedRequestRef.current) {
        onTargetedRequestRef.current(found);
      }
    };
  }, [rickshawMarkers]);

  // Direct Call Handler
  const handleCallDriver = (phone: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${phone}`;
    }
  };

  // -------------------------------------------------------------
  // RENDER RICKSHAW MARKERS ON LEAFLET MAP INSTANCE
  // -------------------------------------------------------------
  const updateRickshawMarkersOnMap = (map: any, layerGroupRef: React.MutableRefObject<any>) => {
    if (!map || Platform.OS !== 'web') return;
    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    } else {
      layerGroupRef.current.clearLayers();
    }

    rickshawMarkers.forEach((r) => {
      const rickshawIcon = L.divIcon({
        className: 'rik-available-rickshaw-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(217, 119, 6, 0.25); animation: rikPulse 2.5s infinite ease-in-out;"></div>
            <div style="width: 30px; height: 30px; border-radius: 10px; background: #18181B; border: 2px solid #D97706; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.7);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([r.latitude, r.longitude], { icon: rickshawIcon });

      // Hover Tooltip / Popover for Desktop (with 3 interactive action buttons)
      const tooltipContent = `
        <div style="padding: 10px 12px; font-family: system-ui, -apple-system, sans-serif; background: #18181B; color: #FAFAFA; border: 1.5px solid #D97706; border-radius: 10px; min-width: 230px; box-shadow: 0 10px 25px rgba(0,0,0,0.85); transition: opacity 200ms ease-in-out;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 13px; font-weight: 800; color: #D97706;">Rickshaw ${r.shortVehicleNumber}</span>
            <span style="font-size: 10px; font-weight: 800; color: #10B981; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); padding: 2px 6px; border-radius: 4px;">${r.status}</span>
          </div>
          <div style="font-size: 12px; color: #D4D4D8; margin-bottom: 4px;">
            Driver: <strong>${r.driverName}</strong>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #A1A1AA; padding-bottom: 8px; border-bottom: 1px solid #27272A; margin-bottom: 8px;">
            <div>
              ${r.avgRating ? `<span style="color: #F59E0B; font-weight: 800;">★ ${r.avgRating}</span> <span style="color: #71717A;">(${r.ratingsCount})</span>` : `<span style="color: #A1A1AA; font-style: italic;">★ New driver</span>`}
            </div>
            ${r.distanceKm !== null ? `<span style="color: #D97706; font-weight: 700;">${r.distanceKm} km away</span>` : ''}
          </div>
          <!-- 3 Compact Action Buttons -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <button onclick="window.__rikCallDriver('${r.driverPhone}')" title="Call Driver" style="flex: 1; padding: 5px 6px; background: #27272A; border: 1px solid #3F3F46; border-radius: 6px; color: #FAFAFA; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Call
            </button>
            <button onclick="window.__rikShowDetails('${r.vehicleId}')" title="View Details" style="flex: 1; padding: 5px 6px; background: #27272A; border: 1px solid #3F3F46; border-radius: 6px; color: #FAFAFA; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              Info
            </button>
            <button onclick="window.__rikTargetedRequest('${r.vehicleId}')" title="Request this Rickshaw" style="flex: 1; padding: 5px 6px; background: #D97706; border: 1px solid #F59E0B; border-radius: 6px; color: #FFFFFF; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
              Request
            </button>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -18],
        opacity: 1,
        interactive: true,
        className: 'rik-custom-leaflet-tooltip',
      });

      // Click / Tap Handler: Select Rickshaw for anchored bottom card
      marker.on('click', () => {
        setSelectedRickshaw(r);
      });

      marker.addTo(layerGroupRef.current);
    });
  };

  // -------------------------------------------------------------
  // EMBEDDED MAP INITIALIZATION & UPDATES
  // -------------------------------------------------------------
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;
    try {
      L = require('leaflet');
    } catch {
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

        // 100% Free Public OpenStreetMap Tiles
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc',
          className: mode === 'dark' ? 'rik-dark-tile-layer' : '',
        }).addTo(map);

        L.control
          .attribution({ position: 'bottomright' })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
          .addTo(map);

        // Marker Icon: Passenger "YOU ARE HERE" Pin vs Driver Vehicle Marker
        const mainIcon = L.divIcon({
          className: isPassengerView ? 'rik-passenger-user-marker' : 'rik-driver-location-marker',
          html: isPassengerView
            ? `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
                <div style="position: absolute; top: 12px; width: 32px; height: 32px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); animation: rikPulse 2s infinite ease-in-out;"></div>
                <div style="background: #10B981; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1.5px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0,0,0,0.5); letter-spacing: 0.5px; white-space: nowrap; margin-bottom: 2px;">YOU ARE HERE</div>
                <div style="width: 14px; height: 14px; border-radius: 50%; background: #10B981; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.6);"></div>
              </div>
            `
            : `
              <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(226, 118, 58, 0.32); animation: rikPulse 2s infinite ease-in-out;"></div>
                <div style="width: 15px; height: 15px; border-radius: 50%; background: #E2763A; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 10px rgba(0,0,0,0.45);"></div>
              </div>
            `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([deviceCoords.lat, deviceCoords.lng], { icon: mainIcon }).addTo(map);

        map.on('dragstart', () => {
          setIsUserPanning(true);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        tileLayerRef.current = tileLayer;
        setMapLoaded(true);

        updateRickshawMarkersOnMap(map, rickshawLayerGroupRef);
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
        rickshawLayerGroupRef.current = null;
        if (polylineRef.current) {
          polylineRef.current.remove();
          polylineRef.current = null;
        }
      }
    };
  }, []);

  // Update embedded route polyline when routePolyline prop changes
  useEffect(() => {
    if (!mapInstanceRef.current || Platform.OS !== 'web') return;
    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    if (routePolyline && routePolyline.length > 1) {
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(routePolyline);
      } else {
        polylineRef.current = L.polyline(routePolyline, {
          color: '#D97706',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(mapInstanceRef.current);
      }
    } else if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  }, [routePolyline]);

  // Update embedded rickshaw markers when prop changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateRickshawMarkersOnMap(mapInstanceRef.current, rickshawLayerGroupRef);
    }
  }, [rickshawMarkers]);

  // Update dark mode class on theme toggle
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

  // Update position & accuracy circle
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
          color: isPassengerView ? '#10B981' : '#E2763A',
          fillColor: isPassengerView ? '#10B981' : '#E2763A',
          fillOpacity: 0.10,
          weight: 1.5,
        }).addTo(mapInstanceRef.current);
      }
    }

    if (!isUserPanning) {
      mapInstanceRef.current.panTo(newPos, { animate: true, duration: 0.8 });
    }
  }, [deviceCoords, isUserPanning, isPassengerView]);

  // Map Controls
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
  // FULLSCREEN MODAL MAP INITIALIZATION & UPDATES
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

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc',
          className: mode === 'dark' ? 'rik-dark-tile-layer' : '',
        }).addTo(map);

        L.control
          .attribution({ position: 'bottomright' })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
          .addTo(map);

        const mainIcon = L.divIcon({
          className: isPassengerView ? 'rik-passenger-user-marker-modal' : 'rik-driver-location-marker-modal',
          html: isPassengerView
            ? `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
                <div style="position: absolute; top: 12px; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); animation: rikPulse 2s infinite ease-in-out;"></div>
                <div style="background: #10B981; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1.5px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0,0,0,0.5); letter-spacing: 0.5px; white-space: nowrap; margin-bottom: 2px;">YOU ARE HERE</div>
                <div style="width: 16px; height: 16px; border-radius: 50%; background: #10B981; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.6);"></div>
              </div>
            `
            : `
              <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(226, 118, 58, 0.32); animation: rikPulse 2s infinite ease-in-out;"></div>
                <div style="width: 17px; height: 17px; border-radius: 50%; background: #E2763A; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 12px rgba(0,0,0,0.5);"></div>
              </div>
            `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([deviceCoords.lat, deviceCoords.lng], { icon: mainIcon }).addTo(map);

        map.on('dragstart', () => {
          setIsModalUserPanning(true);
        });

        modalMapInstanceRef.current = map;
        modalMarkerRef.current = marker;
        modalTileLayerRef.current = tileLayer;

        updateRickshawMarkersOnMap(map, modalRickshawLayerGroupRef);

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
        modalRickshawLayerGroupRef.current = null;
        if (modalPolylineRef.current) {
          modalPolylineRef.current.remove();
          modalPolylineRef.current = null;
        }
      }
    };
  }, [isModalOpen]);

  // Update modal route polyline when routePolyline prop changes
  useEffect(() => {
    if (!modalMapInstanceRef.current || Platform.OS !== 'web' || !isModalOpen) return;
    let L: any;
    try {
      L = require('leaflet');
    } catch {
      return;
    }

    if (routePolyline && routePolyline.length > 1) {
      if (modalPolylineRef.current) {
        modalPolylineRef.current.setLatLngs(routePolyline);
      } else {
        modalPolylineRef.current = L.polyline(routePolyline, {
          color: '#D97706',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(modalMapInstanceRef.current);
      }
    } else if (modalPolylineRef.current) {
      modalPolylineRef.current.remove();
      modalPolylineRef.current = null;
    }
  }, [routePolyline, isModalOpen]);

  // Update modal rickshaw markers when prop changes
  useEffect(() => {
    if (modalMapInstanceRef.current) {
      updateRickshawMarkersOnMap(modalMapInstanceRef.current, modalRickshawLayerGroupRef);
    }
  }, [rickshawMarkers]);

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
            <View style={[styles.pulseDot, { backgroundColor: isPassengerView ? colors.success : colors.primary }]} />
            <Text style={[styles.mapTitle, { color: colors.textPrimary }]}>{title}</Text>
          </View>
          <Text style={[styles.mapSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <View style={styles.badgeGroup}>
          <Badge
            label={`${rickshawMarkers.length} AVAILABLE RICKSHAWS`}
            variant={rickshawMarkers.length > 0 ? 'success' : 'neutral'}
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

        {/* Floating Map Controls for Embedded Map (Fixed high z-index & proper icons) */}
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

        {/* Anchored Rickshaw Summary Card (Mobile / Tap Marker Interaction) */}
        {selectedRickshaw && (
          <View style={[styles.selectedCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}>
            <View style={styles.selectedRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.selectedTitle, { color: colors.primary }]}>
                    Rickshaw {selectedRickshaw.shortVehicleNumber}
                  </Text>
                  <Badge label={selectedRickshaw.status} variant="success" />
                </View>
                <Text style={[styles.selectedDesc, { color: colors.textPrimary }]}>
                  Driver: {selectedRickshaw.driverName} • {selectedRickshaw.avgRating ? `★ ${selectedRickshaw.avgRating} (${selectedRickshaw.ratingsCount})` : '★ New driver'}
                  {selectedRickshaw.distanceKm !== null ? ` • ${selectedRickshaw.distanceKm} km away` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRickshaw(null)} style={{ padding: 4 }}>
                <Icon name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionBtnRow}>
              <Button
                title="Call Driver"
                variant="outline"
                size="sm"
                icon={<Icon name="phone" size={14} color={colors.textPrimary} />}
                onPress={() => handleCallDriver(selectedRickshaw.driverPhone)}
              />
              <Button
                title="View Details"
                variant="outline"
                size="sm"
                icon={<Icon name="info" size={14} color={colors.textPrimary} />}
                onPress={() => setShowDetailModal(true)}
              />
              {isPassengerView && onTargetedRequest && (
                <Button
                  title="Request Rickshaw"
                  variant="primary"
                  size="sm"
                  icon={<Icon name="navigation" size={14} color="#FFFFFF" />}
                  onPress={() => onTargetedRequest(selectedRickshaw)}
                />
              )}
            </View>
          </View>
        )}
      </View>

      {/* Embedded Map Footer Banner */}
      <View style={[styles.mapFooterBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {isPassengerView ? 'Your Position' : 'Position'}:{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {deviceCoords.lat.toFixed(5)}°, {deviceCoords.lng.toFixed(5)}°
          </Text>
          {deviceCoords.accuracy ? ` • Accuracy: ±${deviceCoords.accuracy.toFixed(1)}m` : ''}
        </Text>
        {allowExpand ? (
          <TouchableOpacity onPress={handleOpenModal}>
            <Text style={[styles.recenterLink, { color: colors.primary }]}>Fullscreen Map ↗</Text>
          </TouchableOpacity>
        ) : (
          isUserPanning && (
            <TouchableOpacity onPress={handleRecenter}>
              <Text style={[styles.recenterLink, { color: colors.primary }]}>Recenter →</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* FULLSCREEN COMMAND-CENTER MAP MODAL (PORTAL TO DOCUMENT.BODY) */}
      {isModalOpen && Platform.OS === 'web' && typeof document !== 'undefined' && createPortal(
        <div
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(8, 9, 10, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 999999,
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
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95)',
              animation: isModalClosing
                ? 'rikModalExpandOut 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
                : 'rikModalExpandIn 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
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
                      {title}
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
                      EXPANDED RADAR MAP
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
                    {subtitle}
                  </div>
                </div>
              </div>

              {/* Icon Only Action Buttons */}
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

            {/* Modal Leaflet Canvas Container */}
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
              <div
                ref={modalMapContainerRef}
                style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
              />

              {/* Floating Map Control Stack for Expanded Modal Canvas (ICON ONLY) */}
              <View style={[styles.mapControls, { zIndex: 9999, bottom: 60 }]}>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.primaryBorder }]}
                  onPress={handleCloseModal}
                >
                  <Icon name="minimize-2" size={14} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={handleModalRecenter}
                >
                  <Icon name="navigation" size={14} color={isModalUserPanning ? colors.primary : colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={handleModalZoomIn}
                >
                  <Icon name="plus" size={14} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={handleModalZoomOut}
                >
                  <Icon name="minus" size={14} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Anchored Rickshaw Summary Card in Expanded Modal */}
              {selectedRickshaw && (
                <View style={[styles.selectedCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, zIndex: 99999 }]}>
                  <View style={styles.selectedRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.selectedTitle, { color: colors.primary }]}>
                          Rickshaw {selectedRickshaw.shortVehicleNumber}
                        </Text>
                        <Badge label={selectedRickshaw.status} variant="success" />
                      </View>
                      <Text style={[styles.selectedDesc, { color: colors.textPrimary }]}>
                        Driver: {selectedRickshaw.driverName} • {selectedRickshaw.avgRating ? `★ ${selectedRickshaw.avgRating} (${selectedRickshaw.ratingsCount})` : '★ New driver'}
                        {selectedRickshaw.distanceKm !== null ? ` • ${selectedRickshaw.distanceKm} km away` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedRickshaw(null)} style={{ padding: 4 }}>
                      <Icon name="x" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionBtnRow}>
                    <Button
                      title="Call Driver"
                      variant="outline"
                      size="sm"
                      icon={<Icon name="phone" size={14} color={colors.textPrimary} />}
                      onPress={() => handleCallDriver(selectedRickshaw.driverPhone)}
                    />
                    <Button
                      title="View Details"
                      variant="outline"
                      size="sm"
                      icon={<Icon name="info" size={14} color={colors.textPrimary} />}
                      onPress={() => setShowDetailModal(true)}
                    />
                    {isPassengerView && onTargetedRequest && (
                      <Button
                        title="Request Rickshaw"
                        variant="primary"
                        size="sm"
                        icon={<Icon name="navigation" size={14} color="#FFFFFF" />}
                        onPress={() => onTargetedRequest(selectedRickshaw)}
                      />
                    )}
                  </View>
                </View>
              )}
            </div>

            {/* Modal Footer */}
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
                Position:{' '}
                <strong style={{ color: colors.primary }}>
                  {deviceCoords.lat.toFixed(5)}°, {deviceCoords.lng.toFixed(5)}°
                </strong>{' '}
                • Available Rickshaws nearby:{' '}
                <strong style={{ color: colors.success }}>{rickshawMarkers.length}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ color: colors.textMuted, fontSize: '11px' }}>Press ESC or click outside to close</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DRIVER & VEHICLE INFORMATION DETAIL MODAL */}
      <Modal
        visible={showDetailModal && !!selectedRickshaw}
        onClose={() => setShowDetailModal(false)}
        title={`Driver & Vehicle Information — ${selectedRickshaw?.shortVehicleNumber || ''}`}
      >
        {selectedRickshaw && (
          <View style={styles.detailModalBody}>
            {/* Driver Summary Box */}
            <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.detailHeaderRow}>
                <Icon name="user" size={20} color={colors.primary} />
                <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
                  Driver Profile
                </Text>
                <Badge label={selectedRickshaw.status} variant="success" />
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Driver Name</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedRickshaw.driverName}</Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Aggregate Rating</Text>
                  <Text style={[styles.detailVal, { color: selectedRickshaw.avgRating ? colors.warning : colors.textMuted }]}>
                    {selectedRickshaw.avgRating ? `★ ${selectedRickshaw.avgRating} (${selectedRickshaw.ratingsCount} ratings)` : '★ New driver'}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Completed Rides</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                    {selectedRickshaw.completedRidesCount} rides
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Platform Verification</Text>
                  <Badge label="APPROVED DRIVER" variant="success" />
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Vehicle Authorization</Text>
                  <Badge
                    label={selectedRickshaw.isDriverVerifiedForVehicle !== false ? 'AUTHORIZED / LINKED DRIVER' : 'DRIVER NOT LINKED'}
                    variant={selectedRickshaw.isDriverVerifiedForVehicle !== false ? 'success' : 'warning'}
                  />
                </View>
              </View>
            </View>

            {/* Vehicle Summary Box */}
            <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.detailHeaderRow}>
                <Icon name="truck" size={20} color={colors.primary} />
                <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
                  Electric Rickshaw Specification
                </Text>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Short Vehicle #</Text>
                  <Text style={[styles.detailVal, { color: colors.primary }]}>{selectedRickshaw.shortVehicleNumber}</Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Registration Number</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedRickshaw.registrationNumber}</Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>QR Identifier</Text>
                  <Text style={[styles.detailVal, { color: colors.textSecondary, fontFamily: Platform.OS === 'web' ? 'monospace' : 'System' }]}>
                    {selectedRickshaw.qrIdentifier}
                  </Text>
                </View>

                <View style={styles.detailGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Ownership Mode</Text>
                  <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{selectedRickshaw.ownershipType}</Text>
                </View>
              </View>
            </View>

            {/* Action Row */}
            <View style={styles.detailActionRow}>
              <Button
                title={`Call Driver (${selectedRickshaw.driverName})`}
                variant="outline"
                size="md"
                icon={<Icon name="phone" size={16} color={colors.textPrimary} />}
                onPress={() => handleCallDriver(selectedRickshaw.driverPhone)}
              />
              {isPassengerView && onTargetedRequest && (
                <Button
                  title="Request this Rickshaw"
                  variant="primary"
                  size="md"
                  icon={<Icon name="navigation" size={16} color="#FFFFFF" />}
                  onPress={() => {
                    setShowDetailModal(false);
                    onTargetedRequest(selectedRickshaw);
                  }}
                />
              )}
            </View>
          </View>
        )}
      </Modal>
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
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: 60,
    gap: spacing.xs,
    zIndex: 1000,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
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
    borderWidth: 1.5,
    zIndex: 9999,
    gap: spacing.sm,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  selectedDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  mapFooterBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 11,
  },
  recenterLink: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalBody: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailSection: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  detailGridItem: {
    flex: 1,
    minWidth: 150,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailActionRow: {
    marginTop: spacing.xs,
  },
});
