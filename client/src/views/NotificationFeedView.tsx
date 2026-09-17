import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { spacing, borderRadius } from '../theme/spacing';
import { clientNotificationService, AppNotification } from '../services/notificationService';

export const NotificationFeedView: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'RIDE_UPDATE' | 'SAFETY_ALERT' | 'SYSTEM'>('ALL');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await clientNotificationService.getNotifications(1, 50);
    if (res.success && res.notifications) {
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount || 0);
    } else {
      setErrorMsg(res.error || 'Failed to load notification feed');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id);
    const res = await clientNotificationService.markAsRead(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readStatus: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      showToast('Notification marked read', 'success');
    } else {
      showToast(res.error || 'Failed to mark read', 'danger');
    }
    setMarkingId(null);
  };

  const handleMarkAllRead = async () => {
    const res = await clientNotificationService.markAllAsRead();
    if (res.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } else {
      showToast(res.error || 'Failed to mark all read', 'danger');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'UNREAD') return !n.readStatus;
    if (filterType === 'ALL') return true;
    return n.type === filterType;
  });

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'SAFETY_ALERT':
        return 'danger';
      case 'RIDE_UPDATE':
        return 'info';
      case 'GARAGE_UPDATE':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card variant="hero" style={styles.card}>
        <CardHeader
          title="Notification Center"
          subtitle="Real-time alerts, ride status updates, and system broadcasts"
          icon={<Icon name="bell" size={18} color={colors.primary} />}
          action={
            unreadCount > 0 ? (
              <Button
                title="Mark All Read"
                size="sm"
                variant="outline"
                onPress={handleMarkAllRead}
              />
            ) : (
              <Badge label="UP TO DATE" variant="success" />
            )
          }
        />
        <CardBody style={{ gap: spacing.md }}>
          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {(['ALL', 'UNREAD', 'RIDE_UPDATE', 'SAFETY_ALERT', 'SYSTEM'] as const).map((ft) => (
              <TouchableOpacity
                key={ft}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterType === ft ? colors.primary : colors.surfaceElevated,
                    borderColor: filterType === ft ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilterType(ft)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: filterType === ft ? colors.primaryForeground : colors.textPrimary },
                  ]}
                >
                  {ft === 'ALL'
                    ? 'All Alerts'
                    : ft === 'UNREAD'
                    ? `Unread (${unreadCount})`
                    : ft === 'RIDE_UPDATE'
                    ? 'Rides'
                    : ft === 'SAFETY_ALERT'
                    ? 'Safety'
                    : 'System'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List or Loading State */}
          {loading ? (
            <LoadingState message="Connecting to notification stream..." />
          ) : errorMsg ? (
            <ErrorState title="Notification Stream Alert" message={errorMsg} onRetry={fetchNotifications} />
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              title="No Notifications Found"
              description="Your inbox is clear. Important trip updates, garage notifications, and safety alerts will appear here."
            />
          ) : (
            filteredNotifications.map((item) => (
              <View
                key={item._id}
                style={[
                  styles.notifItem,
                  {
                    backgroundColor: item.readStatus ? colors.surface : 'rgba(217, 119, 6, 0.08)',
                    borderColor: item.readStatus ? colors.borderSubtle : colors.primaryBorder,
                  },
                ]}
              >
                <View style={styles.notifMetaRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Badge label={item.type} variant={getBadgeVariant(item.type)} />
                    {!item.readStatus && <Badge label="NEW" variant="warning" />}
                  </View>

                  <Text style={[styles.timeText, { color: colors.textMuted }]}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>

                <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.notifMessage, { color: colors.textSecondary }]}>{item.message}</Text>

                {!item.readStatus && (
                  <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                    <Button
                      title="Mark Read"
                      size="sm"
                      variant="ghost"
                      loading={markingId === item._id}
                      onPress={() => handleMarkAsRead(item._id)}
                    />
                  </View>
                )}
              </View>
            ))
          )}
        </CardBody>
      </Card>
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
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notifItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  notifMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 11,
  },
});
