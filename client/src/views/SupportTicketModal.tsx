import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { supportTicketApiService } from '../services/supportTicketApiService';
import { spacing, borderRadius } from '../theme/spacing';

export interface SupportTicketModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialField?: 'name' | 'dateOfBirth' | 'nidNumber' | 'address';
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialField = 'name',
}) => {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [requestedField, setRequestedField] = useState<'name' | 'dateOfBirth' | 'nidNumber' | 'address'>(initialField);
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [supportingDocumentRef, setSupportingDocumentRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectDoc = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSupportingDocumentRef(ev.target?.result as string);
          showToast('Supporting document attached', 'info');
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!proposedValue.trim()) {
      setErrorMsg('Please enter the proposed new value.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Please provide a reason / explanation for this requested change.');
      return;
    }

    setLoading(true);
    const res = await supportTicketApiService.createTicket({
      requestType: 'IDENTITY_CHANGE',
      requestedField,
      proposedValue: proposedValue.trim(),
      reason: reason.trim(),
      supportingDocumentRef: supportingDocumentRef || undefined,
    });
    setLoading(false);

    if (res.success) {
      showToast(`Support ticket ${res.ticket?.ticketId || ''} submitted successfully!`, 'success');
      setProposedValue('');
      setReason('');
      setSupportingDocumentRef('');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || 'Failed to submit support ticket.');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Request Identity Information Change">
      <ScrollView contentContainerStyle={styles.container}>
        {errorMsg && (
          <View style={[styles.alertBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
            <Icon name="alert-triangle" size={16} color={colors.danger} />
            <Text style={[styles.alertText, { color: colors.danger }]}>{errorMsg}</Text>
          </View>
        )}

        <View style={[styles.infoBanner, { backgroundColor: colors.infoSurface, borderColor: colors.info }]}>
          <Icon name="info" size={16} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            Protected identity fields require System Administrator review and approval. Changes will be reflected once verified.
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Select Target Protected Field</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: requestedField === 'name' ? colors.primarySurface : colors.surface,
                borderColor: requestedField === 'name' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setRequestedField('name')}
          >
            <Icon name="user" size={14} color={requestedField === 'name' ? colors.primary : colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textPrimary }]}>Legal Name</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: requestedField === 'dateOfBirth' ? colors.primarySurface : colors.surface,
                borderColor: requestedField === 'dateOfBirth' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setRequestedField('dateOfBirth')}
          >
            <Icon name="calendar" size={14} color={requestedField === 'dateOfBirth' ? colors.primary : colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textPrimary }]}>Date of Birth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: requestedField === 'nidNumber' ? colors.primarySurface : colors.surface,
                borderColor: requestedField === 'nidNumber' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setRequestedField('nidNumber')}
          >
            <Icon name="file-text" size={14} color={requestedField === 'nidNumber' ? colors.primary : colors.textMuted} />
            <Text style={[styles.chipText, { color: colors.textPrimary }]}>NID Number</Text>
          </TouchableOpacity>
        </View>

        <Input
          label={`Proposed New ${requestedField === 'name' ? 'Legal Name' : requestedField === 'dateOfBirth' ? 'Date of Birth (YYYY-MM-DD)' : 'NID Number'} *`}
          placeholder={
            requestedField === 'name'
              ? 'e.g. Anika Rahman Chowdhury'
              : requestedField === 'dateOfBirth'
              ? 'e.g. 1994-08-22'
              : 'e.g. 19942691234567899'
          }
          value={proposedValue}
          onChangeText={setProposedValue}
        />

        <Input
          label="Explanation & Reason for Change *"
          placeholder="e.g. Correcting name spelling to match updated official NID smart card."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
            Supporting Verification Document (Optional)
          </Text>
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handleSelectDoc}
          >
            <Icon name={supportingDocumentRef ? 'check-circle' : 'upload-cloud'} size={18} color={supportingDocumentRef ? colors.success : colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
              {supportingDocumentRef ? 'Supporting Document Attached' : 'Attach NID or Document Evidence (PDF/Image)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <Button title="Cancel" variant="ghost" onPress={onClose} />
          <Button
            title="Submit Support Ticket"
            variant="primary"
            loading={loading}
            icon={<Icon name="send" size={14} color="#FFFFFF" />}
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
