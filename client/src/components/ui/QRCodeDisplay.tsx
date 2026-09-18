import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import qrcode from 'qrcode-generator';
import { useTheme } from '../../theme/ThemeContext';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { spacing, borderRadius } from '../../theme/spacing';

export interface QRCodeDisplayProps {
  qrToken?: string;
  vehicleId?: string;
  shortVehicleNumber?: string;
  registrationNumber?: string;
  qrStatus?: 'ACTIVE' | 'REVOKED' | 'REPLACED' | 'DISABLED' | string;
  size?: number;
  showDetails?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrToken,
  vehicleId,
  shortVehicleNumber,
  registrationNumber,
  qrStatus = 'ACTIVE',
  size = 180,
  showDetails = true,
}) => {
  const { colors } = useTheme();

  // Generate SVG Matrix using qrcode-generator
  const qrSvgHtml = useMemo(() => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(qrToken || vehicleId || 'RR-V1-UNASSIGNED');
      qr.make();
      const count = qr.getModuleCount();
      const cellSize = Math.floor(size / count);
      const margin = 2;
      const actualSize = count * cellSize + margin * 2 * cellSize;

      let rects = '';
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            const x = (col + margin) * cellSize;
            const y = (row + margin) * cellSize;
            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#18181B"/>`;
          }
        }
      }

      return `<svg width="${actualSize}" height="${actualSize}" viewBox="0 0 ${actualSize} ${actualSize}" style="background:#FFFFFF; border-radius:8px;">${rects}</svg>`;
    } catch (e) {
      console.warn('QR Code generation notice:', e);
      return null;
    }
  }, [qrToken, vehicleId, size]);

  const isRevoked = qrStatus === 'REVOKED' || qrStatus === 'DISABLED';

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      {/* QR Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="qr-code" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Physical Rickshaw QR</Text>
        </View>
        <Badge
          label={qrStatus}
          variant={qrStatus === 'ACTIVE' ? 'success' : isRevoked ? 'danger' : 'warning'}
        />
      </View>

      {/* QR Matrix Render Box */}
      <View style={styles.qrBoxWrapper}>
        <View style={[styles.qrMatrixContainer, isRevoked && { opacity: 0.3 }]}>
          {Platform.OS === 'web' && qrSvgHtml ? (
            <div dangerouslySetInnerHTML={{ __html: qrSvgHtml }} />
          ) : (
            <View style={{ width: size, height: size, backgroundColor: '#FFFFFF', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <Icon name="qr-code" size={size - 30} color="#18181B" />
            </View>
          )}
        </View>

        {isRevoked && (
          <View style={styles.revokedOverlay}>
            <Icon name="alert-triangle" size={24} color="#DC2626" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626', marginTop: 4 }}>
              QR CODE REVOKED
            </Text>
            <Text style={{ fontSize: 11, color: '#991B1B', textAlign: 'center' }}>
              This QR code is disabled and will not scan.
            </Text>
          </View>
        )}
      </View>

      {/* Human-Readable Details Box */}
      {showDetails && (
        <View style={[styles.detailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Short Vehicle No:</Text>
            <Text style={[styles.detailVal, { color: colors.textPrimary }]}>Vehicle {shortVehicleNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Permanent Vehicle ID:</Text>
            <Text style={[styles.detailVal, { color: colors.primary }]}>{vehicleId}</Text>
          </View>
          {registrationNumber && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Plate Registration:</Text>
              <Text style={[styles.detailVal, { color: colors.textPrimary }]}>{registrationNumber}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  qrBoxWrapper: {
    position: 'relative',
    padding: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrMatrixContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(254, 242, 242, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  detailsBox: {
    width: '100%',
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '700',
  },
});
