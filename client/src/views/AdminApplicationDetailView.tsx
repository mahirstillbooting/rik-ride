import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { useToast } from '../components/ui/Toast';
import { spacing, borderRadius } from '../theme/spacing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';

export interface AdminApplicationDetailViewProps {
  applicationId: string;
  onBack: () => void;
  onActionComplete?: () => void;
}

export const AdminApplicationDetailView: React.FC<AdminApplicationDetailViewProps> = ({
  applicationId,
  onBack,
  onActionComplete,
}) => {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Lightbox Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Rejection Reason Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectCategory, setRejectCategory] = useState('NID Mismatch');
  const [rejectCustomReason, setRejectCustomReason] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${env.apiUrl}/api/admin/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAppData(data.application);
      } else {
        showToast(data.error || 'Failed to load application details.', 'danger');
      }
    } catch (e: any) {
      showToast('Network error loading application details.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [applicationId]);

  const handleApprove = async () => {
    if (!appData) return;
    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${env.apiUrl}/api/admin/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType: appData.entityType,
          entityId: appData.id,
          action: 'APPROVE',
        }),
      });
      const data = await res.json();
      setActionLoading(false);

      if (data.success) {
        showToast(`Application APPROVED successfully!`, 'success');
        fetchDetail();
        if (onActionComplete) onActionComplete();
      } else {
        showToast(data.error || 'Approval failed.', 'danger');
      }
    } catch (e) {
      setActionLoading(false);
      showToast('Failed to process approval action.', 'danger');
    }
  };

  const handleConfirmReject = async () => {
    if (!appData) return;
    const finalReason = `${rejectCategory}: ${rejectCustomReason.trim() || 'Document or identity verification check failed.'}`;
    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${env.apiUrl}/api/admin/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType: appData.entityType,
          entityId: appData.id,
          action: 'REJECT',
          reason: finalReason,
        }),
      });
      const data = await res.json();
      setActionLoading(false);
      setShowRejectModal(false);

      if (data.success) {
        showToast(`Application REJECTED with recorded reason.`, 'warning');
        fetchDetail();
        if (onActionComplete) onActionComplete();
      } else {
        showToast(data.error || 'Rejection failed.', 'danger');
      }
    } catch (e) {
      setActionLoading(false);
      showToast('Failed to process rejection action.', 'danger');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topHeaderBar}>
        <Button
          title="Back to Applications Queue"
          variant="outline"
          size="sm"
          icon={<Icon name="arrow-left" size={14} color={colors.textPrimary} />}
          onPress={onBack}
        />
        <Badge label={`Application ID: ${applicationId}`} variant="info" />
      </View>

      {loading ? (
        <LoadingState message="Fetching complete application identity & document records..." />
      ) : appData ? (
        <>
          {/* SECTION 1: APPLICANT OVERVIEW */}
          <Card variant="hero" style={styles.card}>
            <CardHeader
              title="Section 1. Applicant Overview"
              subtitle="Registered user account, phone & role"
              icon={<Icon name="user" size={18} color={colors.primary} />}
              action={
                <Badge
                  label={appData.accountStatus || appData.verificationStatus || 'PENDING'}
                  variant={
                    (appData.accountStatus || appData.verificationStatus) === 'ACTIVE' || (appData.accountStatus || appData.verificationStatus) === 'APPROVED'
                      ? 'success'
                      : (appData.accountStatus || appData.verificationStatus) === 'REJECTED'
                      ? 'danger'
                      : 'warning'
                  }
                />
              }
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={styles.applicantHeaderRow}>
                {appData.applicant?.profileImage ? (
                  <Image source={{ uri: appData.applicant.profileImage }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarBox, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                    <Icon name="user" size={28} color={colors.primary} />
                  </View>
                )}

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.nameText, { color: colors.textPrimary }]}>{appData.title}</Text>
                  <Text style={[styles.subText, { color: colors.textSecondary }]}>
                    Phone: {appData.applicant?.phone || 'N/A'} | Email: {appData.applicant?.email || 'N/A'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Badge label={appData.role || appData.entityType} variant="info" />
                    {appData.driverMode && <Badge label={appData.driverMode} variant="neutral" />}
                  </View>
                </View>
              </View>

              {appData.rejectionReason && (
                <View style={[styles.rejectionBox, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
                  <Icon name="x-circle" size={16} color={colors.danger} />
                  <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '600' }}>
                    Rejection Reason: {appData.rejectionReason}
                  </Text>
                </View>
              )}
            </CardBody>
          </Card>

          {/* SECTION 2: IDENTITY DETAILS */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="Section 2. Official Identity Credentials"
              subtitle="Submitted NID, legal name & date of birth"
              icon={<Icon name="file-text" size={18} color={colors.primary} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={[styles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Submitted Legal Name</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{appData.identity?.legalName || 'N/A'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date of Birth</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {appData.identity?.dateOfBirth ? String(appData.identity.dateOfBirth) : 'N/A'}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>National ID (NID) Number</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{appData.identity?.nidNumber || 'Not Required / Not Submitted'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>City / Area</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {appData.identity?.city || 'Dhaka'} / {appData.identity?.area || 'Central'}
                  </Text>
                </View>
              </View>
            </CardBody>
          </Card>

          {/* SECTION 3: SUBMITTED DOCUMENTS INSPECTOR */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="Section 3. Submitted Identity Documents"
              subtitle="NID photos & proof document inspection"
              icon={<Icon name="shield-check" size={18} color={colors.primary} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              {appData.documents && appData.documents.length > 0 ? (
                <View style={styles.docGrid}>
                  {appData.documents.map((doc: any, index: number) => (
                    <View key={index} style={[styles.docCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Text style={[styles.docTitle, { color: colors.textPrimary }]}>{doc.title}</Text>
                      {doc.url ? (
                        <TouchableOpacity
                          style={styles.docImageWrapper}
                          onPress={() => setPreviewDoc({ title: doc.title, url: doc.url })}
                        >
                          <Image source={{ uri: doc.url }} style={styles.docImagePreview} />
                          <View style={styles.zoomOverlay}>
                            <Icon name="eye" size={14} color="#FFFFFF" />
                            <Text style={styles.zoomText}>View Document</Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.noDocBox}>
                          <Icon name="file-text" size={24} color={colors.textMuted} />
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>No document attached</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.noDocBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Icon name="file-text" size={24} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                    No identity document attachments uploaded for this application.
                  </Text>
                </View>
              )}
            </CardBody>
          </Card>

          {/* SECTION 4: ROLE & ENTITY SPECIFIC DETAILS */}
          {appData.roleInfo && (
            <Card variant="default" style={styles.card}>
              <CardHeader
                title="Section 4. Entity & Operational Specifications"
                subtitle="Role-specific garage, vehicle, driver linkage, or support ticket data"
                icon={<Icon name="briefcase" size={18} color={colors.primary} />}
              />
              <CardBody style={{ gap: spacing.md }}>
                <View style={[styles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {appData.entityType === 'GARAGE' && (
                    <>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Garage Custom ID</Text>
                        <Text style={[styles.infoValue, { color: colors.primary }]}>{appData.roleInfo.garageId || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Vehicle Capacity</Text>
                        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{appData.roleInfo.capacity || 10} Rickshaws</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Total Registered Rickshaws</Text>
                        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{appData.roleInfo.totalVehicles ?? 0}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Active Confirmed Drivers</Text>
                        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{appData.roleInfo.activeDrivers ?? 0}</Text>
                      </View>
                    </>
                  )}

                  {appData.entityType === 'VEHICLE' && (
                    <>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Short Vehicle Number</Text>
                        <Text style={[styles.infoValue, { color: colors.primary }]}>{appData.shortVehicleNumber || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Official Registration Number</Text>
                        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{appData.registrationNumber || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Ownership Mode</Text>
                        <Badge label={appData.roleInfo.ownershipType || 'GARAGE_REGISTERED'} variant="info" />
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Model & Manufacturing Year</Text>
                        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                          {appData.identity?.modelName || 'Electric Rickshaw'} ({appData.identity?.manufacturingYear || '2024'})
                        </Text>
                      </View>
                      {appData.roleInfo.garage && (
                        <View style={styles.infoItem}>
                          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Associated Garage Hub</Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {appData.roleInfo.garage.name} ({appData.roleInfo.garage.garageId || 'Hub'})
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {appData.entityType === 'SUPPORT_TICKET' && (
                    <>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Ticket Reference ID</Text>
                        <Text style={[styles.infoValue, { color: colors.primary }]}>{appData.ticketId}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Requested Field to Modify</Text>
                        <Badge label={appData.requestedField} variant="warning" />
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Current Value in System</Text>
                        <Text style={[styles.infoValue, { color: colors.textMuted }]}>{appData.currentValue || '(Empty)'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Proposed New Value</Text>
                        <Text style={[styles.infoValue, { color: colors.success, fontWeight: '800' }]}>{appData.proposedValue}</Text>
                      </View>
                      <View style={{ width: '100%', marginTop: 6 }}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>User Explanation & Reason</Text>
                        <Text style={[styles.infoValue, { color: colors.textPrimary, marginTop: 2 }]}>{appData.reason}</Text>
                      </View>
                    </>
                  )}

                  {appData.entityType === 'USER' && (
                    <>
                      <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>User Platform Role</Text>
                        <Badge label={appData.role} variant="info" />
                      </View>
                      {appData.driverMode && (
                        <View style={styles.infoItem}>
                          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Driver Operating Mode</Text>
                          <Badge label={appData.driverMode} variant="neutral" />
                        </View>
                      )}
                      {appData.roleInfo?.garage && (
                        <View style={styles.infoItem}>
                          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Owned Garage Hub</Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {appData.roleInfo.garage.name} ({appData.roleInfo.garage.garageId || 'Hub'})
                          </Text>
                        </View>
                      )}
                      {appData.roleInfo?.garageLink && (
                        <View style={styles.infoItem}>
                          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Associated Garage Hub</Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {appData.roleInfo.garageLink.name} ({appData.roleInfo.garageLink.garageId || 'Hub'})
                          </Text>
                        </View>
                      )}
                      {appData.roleInfo?.vehicle && (
                        <View style={styles.infoItem}>
                          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Assigned Rickshaw</Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {appData.roleInfo.vehicle.shortVehicleNumber} ({appData.roleInfo.vehicle.registrationNumber})
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </CardBody>
            </Card>
          )}

          {/* SECTION 4 & ACTION BAR */}
          <Card variant="default" style={styles.card}>
            <CardHeader
              title="Section 4. Administrative Verification Decision"
              subtitle="Protected backend approval or rejection with audit record"
              icon={<Icon name="check-square" size={18} color={colors.primary} />}
            />
            <CardBody style={{ gap: spacing.md }}>
              <View style={styles.actionBtnRow}>
                <Button
                  title="REJECT APPLICATION"
                  variant="danger"
                  size="lg"
                  loading={actionLoading}
                  icon={<Icon name="x-circle" size={16} color="#FFFFFF" />}
                  onPress={() => setShowRejectModal(true)}
                />

                <Button
                  title="APPROVE & VERIFY IDENTITY"
                  variant="primary"
                  size="lg"
                  loading={actionLoading}
                  icon={<Icon name="check-circle" size={16} color="#FFFFFF" />}
                  onPress={handleApprove}
                />
              </View>
            </CardBody>
          </Card>
        </>
      ) : null}

      {/* DOCUMENT LIGHTBOX MODAL */}
      {previewDoc && (
        <Modal visible={!!previewDoc} onClose={() => setPreviewDoc(null)} title={`Inspect: ${previewDoc.title}`}>
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs }}>
            <Image source={{ uri: previewDoc.url }} style={styles.fullImageLightbox} resizeMode="contain" />
            <Button title="Close Document Preview" variant="outline" onPress={() => setPreviewDoc(null)} />
          </View>
        </Modal>
      )}

      {/* REJECTION REASON MODAL */}
      <Modal visible={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Application with Recorded Reason">
        <View style={{ gap: spacing.md, paddingVertical: spacing.xs }}>
          <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>
            Select Primary Rejection Category:
          </Text>

          <View style={styles.catGrid}>
            {['NID Mismatch', 'Date of Birth Mismatch', 'Invalid NID Document', 'Incomplete Information', 'Garage/Vehicle Issue'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: rejectCategory === cat ? colors.dangerSurface : colors.surface,
                    borderColor: rejectCategory === cat ? colors.danger : colors.border,
                  },
                ]}
                onPress={() => setRejectCategory(cat)}
              >
                <Icon name={rejectCategory === cat ? 'check-circle' : 'circle'} size={14} color={rejectCategory === cat ? colors.danger : colors.textMuted} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Additional Explanation / Notes for Applicant *"
            placeholder="Specify exact reason (e.g. NID number does not match submitted NID scan)."
            value={rejectCustomReason}
            onChangeText={setRejectCustomReason}
            multiline
            numberOfLines={3}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs }}>
            <Button title="Cancel" variant="ghost" onPress={() => setShowRejectModal(false)} />
            <Button
              title="Confirm Rejection"
              variant="danger"
              loading={actionLoading}
              icon={<Icon name="x-circle" size={14} color="#FFFFFF" />}
              onPress={handleConfirmReject}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    width: '100%',
  },
  applicantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  subText: {
    fontSize: 13,
    marginTop: 2,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  infoGrid: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    minWidth: 160,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  docCard: {
    flex: 1,
    minWidth: 220,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  docImageWrapper: {
    height: 140,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  docImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  noDocBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 100,
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  fullImageLightbox: {
    width: '100%',
    height: 320,
    borderRadius: borderRadius.md,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
