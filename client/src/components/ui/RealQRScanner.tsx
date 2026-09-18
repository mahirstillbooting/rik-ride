import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import jsQR from 'jsqr';
import { useTheme } from '../../theme/ThemeContext';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Icon } from './Icon';
import { spacing, borderRadius } from '../../theme/spacing';

export interface RealQRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (qrPayload: string) => void;
  title?: string;
  subtitle?: string;
  manualEntryOption?: boolean;
}

export type CameraPermissionState = 'NOT_REQUESTED' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE';

export const RealQRScanner: React.FC<RealQRScannerProps> = ({
  visible,
  onClose,
  onScanSuccess,
  title = 'Scan Rickshaw QR Code',
  subtitle = 'Position the vehicle QR code inside the frame to verify rickshaw identity.',
  manualEntryOption = true,
}) => {
  const { colors } = useTheme();

  const [permissionState, setPermissionState] = useState<CameraPermissionState>('NOT_REQUESTED');
  const [scanning, setScanning] = useState(false);
  const [detectedToken, setDetectedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Input State
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Refs for Web camera stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks and cancel scanning loop
  const stopCamera = useCallback(() => {
    setScanning(false);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Frame decoding loop using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const payload = code.data.trim();
        setDetectedToken(payload);
        stopCamera();
        onScanSuccess(payload);
        return;
      }
    }

    if (scanning) {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
  }, [scanning, stopCamera, onScanSuccess]);

  // Start Web Camera Stream
  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    setDetectedToken(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('UNAVAILABLE');
      setErrorMsg('Camera access API is not available on this browser or environment.');
      return;
    }

    try {
      setPermissionState('NOT_REQUESTED');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setPermissionState('GRANTED');
      setScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.warn('Camera permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('DENIED');
        setErrorMsg('Camera permission was denied. Please allow camera access in your browser settings.');
      } else {
        setPermissionState('UNAVAILABLE');
        setErrorMsg(`Camera error: ${err.message || 'Unable to start camera stream'}`);
      }
    }
  }, []);

  // Trigger scan loop when camera starts
  useEffect(() => {
    if (scanning && permissionState === 'GRANTED') {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [scanning, permissionState, scanFrame]);

  // Start camera when modal opens, stop on close
  useEffect(() => {
    if (visible) {
      if (Platform.OS === 'web') {
        startCamera();
      } else {
        setPermissionState('GRANTED');
        setScanning(true);
      }
    } else {
      stopCamera();
      setShowManualInput(false);
      setManualCode('');
    }
  }, [visible, startCamera, stopCamera]);

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    stopCamera();
    onScanSuccess(code);
  };

  return (
    <Modal
      visible={visible}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={title}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

        {/* CAMERA VIEWPORT BOX */}
        {!showManualInput && (
          <View style={[styles.viewportBox, { backgroundColor: '#000000', borderColor: colors.primary }]}>
            {Platform.OS === 'web' ? (
              <View style={styles.webVideoContainer}>
                {/* HTML5 Video Element */}
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Hidden canvas for jsQR frame decoding */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </View>
            ) : (
              <View style={styles.nativeFallbackView}>
                <Icon name="camera" size={36} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 8 }}>
                  Camera Scanner Viewport
                </Text>
                <Text style={{ fontSize: 11, color: '#A1A1AA', textAlign: 'center', marginTop: 2 }}>
                  Point camera at physical Rickshaw QR code
                </Text>
              </View>
            )}

            {/* Target Bounding Frame Overlay */}
            {permissionState === 'GRANTED' && (
              <View style={styles.targetFrame}>
                <View style={[styles.cornerBracket, styles.topLeft]} />
                <View style={[styles.cornerBracket, styles.topRight]} />
                <View style={[styles.cornerBracket, styles.bottomLeft]} />
                <View style={[styles.cornerBracket, styles.bottomRight]} />
                <View style={styles.scanLine} />
              </View>
            )}

            {/* Permission / Status Overlays */}
            {permissionState === 'DENIED' && (
              <View style={styles.overlayMessage}>
                <Icon name="alert-triangle" size={28} color="#EF4444" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444', marginTop: 6, textAlign: 'center' }}>
                  Camera Permission Denied
                </Text>
                <Text style={{ fontSize: 11, color: '#FCA5A5', textAlign: 'center', marginTop: 2 }}>
                  Please enable camera permissions in your browser or app settings to scan physical QR codes.
                </Text>
              </View>
            )}

            {permissionState === 'UNAVAILABLE' && (
              <View style={styles.overlayMessage}>
                <Icon name="camera" size={28} color="#F59E0B" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#F59E0B', marginTop: 6, textAlign: 'center' }}>
                  Camera Unavailable
                </Text>
                <Text style={{ fontSize: 11, color: '#FDE68A', textAlign: 'center', marginTop: 2 }}>
                  {errorMsg || 'No active camera hardware detected on this device.'}
                </Text>
              </View>
            )}

            {detectedToken && (
              <View style={[styles.overlayMessage, { backgroundColor: 'rgba(16, 185, 129, 0.95)' }]}>
                <Icon name="check-circle" size={32} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF', marginTop: 4 }}>
                  QR Code Detected!
                </Text>
                <Text style={{ fontSize: 11, color: '#E0E7FF', textAlign: 'center' }}>
                  Resolving vehicle identity with backend...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* MANUAL INPUT ENTRY FALLBACK FORM */}
        {showManualInput && (
          <View style={[styles.manualBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="edit-2" size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                Manual Vehicle Code Search
              </Text>
            </View>

            <Input
              label="Vehicle ID or Short Car Number"
              placeholder="e.g. DH-GAR-0001-V001 or D-1024"
              value={manualCode}
              onChangeText={setManualCode}
            />

            <View style={styles.actionRow}>
              <Button
                title="Back to Camera"
                variant="outline"
                size="sm"
                icon={<Icon name="camera" size={14} color={colors.primary} />}
                onPress={() => {
                  setShowManualInput(false);
                  if (Platform.OS === 'web') startCamera();
                }}
              />
              <Button
                title="Search Vehicle"
                variant="primary"
                size="sm"
                icon={<Icon name="search" size={14} color="#FFFFFF" />}
                onPress={handleManualSubmit}
              />
            </View>
          </View>
        )}

        {/* BOTTOM ACTION BUTTONS */}
        {!showManualInput && manualEntryOption && (
          <View style={styles.actionRow}>
            <Button
              title="Enter Code Manually"
              variant="outline"
              size="sm"
              icon={<Icon name="edit-2" size={14} color={colors.primary} />}
              onPress={() => {
                stopCamera();
                setShowManualInput(true);
              }}
            />
            {permissionState === 'DENIED' && (
              <Button
                title="Retry Camera"
                variant="primary"
                size="sm"
                icon={<Icon name="refresh-cw" size={14} color="#FFFFFF" />}
                onPress={startCamera}
              />
            )}
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
  },
  viewportBox: {
    width: '100%',
    height: 260,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webVideoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  nativeFallbackView: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  targetFrame: {
    position: 'absolute',
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#D97706',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981',
  },
  overlayMessage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(24, 24, 27, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    zIndex: 10,
  },
  manualBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
