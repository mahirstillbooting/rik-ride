import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { useToast } from '../components/ui/Toast';
import { supportTicketApiService } from '../services/supportTicketApiService';
import { spacing, borderRadius } from '../theme/spacing';

export const AdminSupportTicketsView: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Selected Ticket Resolution Modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTickets = async (page = 1) => {
    try {
      setLoading(true);
      const res = await supportTicketApiService.getAdminTickets({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: 10,
      });

      if (res.success) {
        setTickets(res.tickets || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        showToast(res.error || 'Failed to fetch support tickets.', 'danger');
      }
    } catch (e) {
      showToast('Network error fetching support tickets queue.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
  }, [statusFilter]);

  const handleSearchSubmit = () => {
    fetchTickets(1);
  };

  const handleResolve = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedTicket) return;
    try {
      setActionLoading(true);
      const res = await supportTicketApiService.resolveTicket(selectedTicket._id, action, resolutionReason.trim());
      setActionLoading(false);

      if (res.success) {
        showToast(res.message || `Ticket ${action}D successfully!`, action === 'APPROVE' ? 'success' : 'warning');
        setSelectedTicket(null);
        setResolutionReason('');
        fetchTickets(pagination.page);
      } else {
        showToast(res.error || 'Failed to resolve support ticket.', 'danger');
      }
    } catch (e) {
      setActionLoading(false);
      showToast('Error processing ticket resolution.', 'danger');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card variant="hero" style={styles.card}>
        <CardHeader
          title="Protected Identity Change Support Tickets"
          subtitle="Administrative review queue for user identity modification requests"
          icon={<Icon name="life-buoy" size={18} color={colors.primary} />}
          action={<Badge label={`Total Queue: ${pagination.total}`} variant="info" />}
        />
        <CardBody style={{ gap: spacing.md }}>
          {/* Search & Filter Controls */}
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Search ticket ID, user name, phone, or proposed value..."
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearchSubmit}
                leftIcon={<Icon name="search" size={16} color={colors.textMuted} />}
              />
            </View>
            <Button
              title="Filter"
              variant="outline"
              size="sm"
              icon={<Icon name="filter" size={14} color={colors.primary} />}
              onPress={handleSearchSubmit}
            />
          </View>

          {/* Status Chips */}
          <View style={styles.chipRow}>
            {[
              { label: 'All Tickets', val: '' },
              { label: 'Open', val: 'OPEN' },
              { label: 'Under Review', val: 'UNDER_REVIEW' },
              { label: 'Approved', val: 'APPROVED' },
              { label: 'Rejected', val: 'REJECTED' },
            ].map((chip) => (
              <TouchableOpacity
                key={chip.val}
                style={[
                  styles.chip,
                  {
                    backgroundColor: statusFilter === chip.val ? colors.primarySurface : colors.surface,
                    borderColor: statusFilter === chip.val ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(chip.val)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: statusFilter === chip.val ? colors.primary : colors.textPrimary,
                  }}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ticket List Queue */}
          {loading ? (
            <LoadingState message="Loading support ticket requests..." />
          ) : tickets.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {tickets.map((t) => (
                <View key={t._id} style={[styles.ticketRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.ticketIdText, { color: colors.primary }]}>{t.ticketId}</Text>
                      <Badge label={t.requestedField.toUpperCase()} variant="neutral" />
                      <Badge
                        label={t.status}
                        variant={t.status === 'APPROVED' ? 'success' : t.status === 'REJECTED' ? 'danger' : 'warning'}
                      />
                    </View>

                    <Text style={[styles.applicantText, { color: colors.textPrimary }]}>
                      Applicant: {t.userId?.name || 'Unknown User'} ({t.userRole}) | Phone: {t.userId?.phone}
                    </Text>

                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      Current: <Text style={{ fontWeight: '700' }}>{t.currentValue || 'N/A'}</Text> ➔ Proposed: <Text style={{ fontWeight: '700', color: colors.success }}>{t.proposedValue}</Text>
                    </Text>
                  </View>

                  {/* Semantic VIEW Action Button (Eye Icon) */}
                  <Button
                    title="View Request"
                    variant="outline"
                    size="sm"
                    icon={<Icon name="eye" size={14} color={colors.primary} />}
                    onPress={() => setSelectedTicket(t)}
                  />
                </View>
              ))}

              {/* Server-Side Pagination */}
              {pagination.pages > 1 && (
                <View style={styles.paginationRow}>
                  <Button
                    title="Previous"
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onPress={() => fetchTickets(pagination.page - 1)}
                  />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                    Page {pagination.page} of {pagination.pages}
                  </Text>
                  <Button
                    title="Next"
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onPress={() => fetchTickets(pagination.page + 1)}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Icon name="life-buoy" size={28} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                No support tickets found matching current query filters.
              </Text>
            </View>
          )}
        </CardBody>
      </Card>

      {/* TICKET RESOLUTION DETAIL MODAL */}
      {selectedTicket && (
        <Modal
          visible={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Review Ticket: ${selectedTicket.ticketId}`}
        >
          <ScrollView contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }}>
            <View style={[styles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Applicant</Text>
                <Text style={styles.infoValue}>{selectedTicket.userId?.name} ({selectedTicket.userRole})</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Target Field</Text>
                <Text style={styles.infoValue}>{selectedTicket.requestedField}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Current Value</Text>
                <Text style={styles.infoValue}>{selectedTicket.currentValue || 'N/A'}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Proposed Value</Text>
                <Text style={[styles.infoValue, { color: colors.success }]}>{selectedTicket.proposedValue}</Text>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>User Explanation & Reason:</Text>
              <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 18 }}>{selectedTicket.reason}</Text>
            </View>

            {selectedTicket.supportingDocumentRef && (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>Supporting Verification Document:</Text>
                <Image source={{ uri: selectedTicket.supportingDocumentRef }} style={styles.docModalImage} resizeMode="contain" />
              </View>
            )}

            {selectedTicket.status === 'OPEN' || selectedTicket.status === 'UNDER_REVIEW' ? (
              <>
                <Input
                  label="Administrative Resolution Notes / Reason"
                  placeholder="Enter reason for approval or rejection..."
                  value={resolutionReason}
                  onChangeText={setResolutionReason}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs }}>
                  <Button
                    title="Reject Request"
                    variant="danger"
                    loading={actionLoading}
                    icon={<Icon name="x-circle" size={14} color="#FFFFFF" />}
                    onPress={() => handleResolve('REJECT')}
                  />

                  <Button
                    title="Approve & Apply Change"
                    variant="primary"
                    loading={actionLoading}
                    icon={<Icon name="check-circle" size={14} color="#FFFFFF" />}
                    onPress={() => handleResolve('APPROVE')}
                  />
                </View>
              </>
            ) : (
              <View style={[styles.infoGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                  Status: {selectedTicket.status} by {selectedTicket.reviewedBy?.name || 'Admin'}
                </Text>
                {selectedTicket.resolutionReason && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Notes: {selectedTicket.resolutionReason}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    width: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  ticketRow: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ticketIdText: {
    fontSize: 14,
    fontWeight: '800',
  },
  applicantText: {
    fontSize: 13,
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  emptyBox: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
    minWidth: 140,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  docModalImage: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.md,
  },
});
