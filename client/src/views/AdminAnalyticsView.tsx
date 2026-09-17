import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { spacing, borderRadius } from '../theme/spacing';
import {
  clientAnalyticsService,
  AdminAnalyticsResponse,
  DateRangePreset,
  OwnershipFilter,
} from '../services/analyticsService';
import { adminService } from '../services/adminService';

export const AdminAnalyticsView: React.FC = () => {
  const { colors } = useTheme();

  // Filter States
  const [range, setRange] = useState<DateRangePreset>('LAST_7_DAYS');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [ownershipType, setOwnershipType] = useState<OwnershipFilter>('ALL');
  const [garageId, setGarageId] = useState<string>('ALL');

  // Garages List for Filter Dropdown
  const [garages, setGarages] = useState<{ label: string; value: string }[]>([
    { label: 'All Garages & Self-Owned Fleet', value: 'ALL' },
  ]);

  // Analytics Data State
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Garages for Filter Dropdown
  const loadGarages = useCallback(async () => {
    try {
      const list = await adminService.getGarages();
      if (Array.isArray(list)) {
        const options = [
          { label: 'All Garages & Self-Owned Fleet', value: 'ALL' },
          ...list.map((g: any) => ({
            label: `${g.name} (${g.garageId || 'Garage'})`,
            value: g._id,
          })),
        ];
        setGarages(options);
      }
    } catch (e) {
      console.warn('Failed to load garage options:', e);
    }
  }, []);

  // Fetch Analytics Data
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const res = await clientAnalyticsService.getAdminAnalytics({
      range,
      startDate: range === 'CUSTOM' ? customStart : undefined,
      endDate: range === 'CUSTOM' ? customEnd : undefined,
      garageId,
      ownershipType,
    });

    if (res.success) {
      setAnalytics(res);
    } else {
      setErrorMsg(res.error || 'Failed to fetch analytics');
    }
    setLoading(false);
  }, [range, customStart, customEnd, garageId, ownershipType]);

  useEffect(() => {
    loadGarages();
  }, [loadGarages]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const snap = analytics?.liveSnapshot;
  const rides = analytics?.rideAnalytics;
  const pay = analytics?.settlementAnalytics;
  const rate = analytics?.ratingAnalytics;
  const safe = analytics?.safetyAnalytics;
  const daily = analytics?.dailyActivitySeries || [];
  const peak = analytics?.peakActivitySlots;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* FILTER & CONTROL BAR */}
      <Card variant="elevated" style={styles.filterCard}>
        <CardHeader
          title="Admin Operational Analytics Controls"
          subtitle="Server-side aggregated metrics • Filter by date, garage hierarchy, or vehicle ownership mode"
          icon={<Icon name="bar-chart" size={20} color={colors.primary} />}
        />
        <CardBody style={styles.filterBody}>
          {/* Date Range Selector */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Date Range Period:</Text>
            <View style={styles.pillsRow}>
              {(['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'CUSTOM'] as DateRangePreset[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.pillBtn,
                    {
                      backgroundColor: range === r ? colors.primary : colors.surfaceElevated,
                      borderColor: range === r ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setRange(r)}
                >
                  <Text style={[styles.pillText, { color: range === r ? '#FFFFFF' : colors.textSecondary }]}>
                    {r === 'TODAY' ? 'Today' : r === 'LAST_7_DAYS' ? 'Last 7 Days' : r === 'LAST_30_DAYS' ? 'Last 30 Days' : 'Custom Range'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Date Input Row */}
          {range === 'CUSTOM' && (
            <View style={styles.customDateRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Start Date (YYYY-MM-DD)"
                  placeholder="2026-09-01"
                  value={customStart}
                  onChangeText={setCustomStart}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="End Date (YYYY-MM-DD)"
                  placeholder="2026-09-30"
                  value={customEnd}
                  onChangeText={setCustomEnd}
                />
              </View>
              <Button
                title="Apply Custom Range"
                variant="primary"
                size="md"
                style={{ marginTop: 24 }}
                onPress={fetchAnalytics}
              />
            </View>
          )}

          {/* Garage & Ownership Filters Row */}
          <View style={styles.selectFilterRow}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Select
                label="Garage Hierarchy Filter"
                options={garages}
                value={garageId}
                onChange={setGarageId}
              />
            </View>

            <View style={{ flex: 1, minWidth: 200 }}>
              <Select
                label="Vehicle Ownership Mode"
                options={[
                  { label: 'All Ownership Types', value: 'ALL' },
                  { label: 'Garage-Registered Rickshaws', value: 'GARAGE_REGISTERED' },
                  { label: 'Self-Owned Independent Rickshaws', value: 'SELF_OWNED' },
                ]}
                value={ownershipType}
                onChange={(val) => setOwnershipType(val as OwnershipFilter)}
              />
            </View>
          </View>
        </CardBody>
      </Card>

      {/* SECTION 1: LIVE CURRENT SNAPSHOT (Real-Time State) */}
      <View style={[styles.liveSnapshotBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.liveHeaderRow}>
          <View style={styles.pulseIndicator} />
          <Text style={[styles.liveHeaderTitle, { color: colors.textPrimary }]}>
            LIVE CURRENT OPERATIONS (Real-Time Status Snapshot)
          </Text>
          <Badge label="LIVE SNAPSHOT" variant="success" />
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Registered Fleet</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{snap?.totalVehicles ?? 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{snap?.approvedVehicles ?? 0} Approved</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Available Rickshaws</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{snap?.availableVehicles ?? 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Ready for Dispatch</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>On Active Rides</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{snap?.onRideVehicles ?? 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>In-Progress Trips</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Stale / Offline (&gt;2m)</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{snap?.staleVehiclesCount ?? 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>No GPS Heartbeat</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Garages</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{snap?.activeGarages ?? 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Approved Hubs</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Approved Drivers</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{snap?.approvedDrivers ?? 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{snap?.garageDriversCount ?? 0} Garage • {snap?.selfOwnedDriversCount ?? 0} Self</Text>
          </View>
        </View>
      </View>

      {/* LOADING & ERROR STATES FOR HISTORICAL SECTION */}
      {loading ? (
        <LoadingState message="Executing MongoDB aggregation pipelines for date-range analytics..." />
      ) : errorMsg ? (
        <Card variant="default">
          <CardBody>
            <Text style={{ color: colors.danger }}>{errorMsg}</Text>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* SECTION 2: RIDE LIFECYCLE & DISTANCE PERFORMANCE */}
          <View style={styles.gridRow}>
            <Card variant="elevated" style={styles.flexCard}>
              <CardHeader
                title="Ride Lifecycle Performance"
                subtitle={`Date Range: ${analytics?.meta?.range || range} • Filtered Trips`}
                icon={<Icon name="navigation" size={18} color={colors.primary} />}
              />
              <CardBody style={{ gap: spacing.md }}>
                <View style={styles.metricRowGrid}>
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Requests</Text>
                    <Text style={[styles.metricNum, { color: colors.textPrimary }]}>{rides?.totalRequests ?? 0}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Completed Rides</Text>
                    <Text style={[styles.metricNum, { color: colors.success }]}>{rides?.completedCount ?? 0}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Completion Rate</Text>
                    <Text style={[styles.metricNum, { color: colors.primary }]}>{rides?.completionRate ?? 0}%</Text>
                  </View>
                </View>

                {/* Ride Status Distribution Bar */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>Ride State Breakdown:</Text>
                  <View style={styles.statusBreakdownRow}>
                    <View style={styles.statusPill}>
                      <Badge label={`Completed: ${rides?.completedCount ?? 0}`} variant="success" />
                    </View>
                    <View style={styles.statusPill}>
                      <Badge label={`Cancelled: ${rides?.cancelledCount ?? 0}`} variant="warning" />
                    </View>
                    <View style={styles.statusPill}>
                      <Badge label={`Declined: ${rides?.declinedCount ?? 0}`} variant="danger" />
                    </View>
                    <View style={styles.statusPill}>
                      <Badge label={`Expired: ${rides?.expiredCount ?? 0}`} variant="neutral" />
                    </View>
                  </View>
                </View>

                {/* Distance & Duration */}
                <View style={[styles.detailCardBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Total Journey Distance:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{rides?.totalDistanceKm ?? 0} km</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Average Trip Distance:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{rides?.avgDistanceKm ?? 0} km / trip</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Average Trip Fare:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>৳{rides?.avgFareAmount ?? 0}</Text>
                  </View>
                </View>
              </CardBody>
            </Card>

            {/* SECTION 3: RECORDED PASSENGER PAYMENTS & SETTLEMENT */}
            <Card variant="elevated" style={styles.flexCard}>
              <CardHeader
                title="Recorded Passenger Payments"
                subtitle="Passenger funds collected & recorded settlement breakdown"
                icon={<Icon name="dollar-sign" size={18} color={colors.primary} />}
              />
              <CardBody style={{ gap: spacing.md }}>
                <View style={styles.totalFareHighlight}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>TOTAL RECORDED FARE COLLECTED</Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: colors.primary, marginTop: 2 }}>
                    ৳{pay?.totalRecordedFare ?? 0}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                    From {pay?.settledRidesCount ?? 0} completed rides (Avg ৳{pay?.avgRecordedFare ?? 0} / ride)
                  </Text>
                </View>

                {/* Payment Methods Breakdown */}
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>Payment Method Distribution:</Text>

                  {Object.entries(pay?.paymentMethods || {}).map(([method, data]) => (
                    <View key={method} style={[styles.paymentMethodRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon
                          name={method === 'CASH' ? 'dollar-sign' : 'credit-card'}
                          size={14}
                          color={colors.primary}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{method}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>৳{data.totalFare}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{data.count} rides</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </CardBody>
            </Card>
          </View>

          {/* SECTION 4: RATINGS & SAFETY INCIDENT MONITORING */}
          <View style={styles.gridRow}>
            {/* Passenger Ratings */}
            <Card variant="elevated" style={styles.flexCard}>
              <CardHeader
                title="Passenger Ratings Overview"
                subtitle="Aggregate 1-5 star feedback for completed rides"
                icon={<Icon name="star" size={18} color="#F59E0B" />}
              />
              <CardBody style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 36, fontWeight: '900', color: '#F59E0B' }}>
                      {rate?.avgRating ? rate.avgRating.toFixed(1) : '0.0'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      ★ {rate?.totalRatings ?? 0} Total Ratings
                    </Text>
                  </View>

                  {/* Star Distribution Bars */}
                  <View style={{ flex: 1, gap: 4 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = rate?.starDistribution?.[star] || 0;
                      const pct = (rate?.totalRatings ?? 0) > 0 ? (count / (rate?.totalRatings || 1)) * 100 : 0;
                      return (
                        <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, width: 35 }}>{star} ★</Text>
                          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceElevated, overflow: 'hidden' }}>
                            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: star >= 4 ? '#10B981' : star === 3 ? '#F59E0B' : '#EF4444' }} />
                          </View>
                          <Text style={{ fontSize: 11, color: colors.textMuted, width: 25, textAlign: 'right' }}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </CardBody>
            </Card>

            {/* Safety & Incident Monitoring */}
            <Card variant="elevated" style={styles.flexCard}>
              <CardHeader
                title="Safety & Incident Analytics"
                subtitle="Yellow safety alerts, Red Emergency SOS, and resolution status"
                icon={<Icon name="shield" size={18} color={colors.danger} />}
              />
              <CardBody style={{ gap: spacing.md }}>
                <View style={styles.metricRowGrid}>
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Safety Events</Text>
                    <Text style={[styles.metricNum, { color: colors.textPrimary }]}>{safe?.totalEvents ?? 0}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Yellow Alerts</Text>
                    <Text style={[styles.metricNum, { color: '#D97706' }]}>{safe?.yellowAlertsCount ?? 0}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RED SOS Emergency</Text>
                    <Text style={[styles.metricNum, { color: '#DC2626' }]}>{safe?.redSosCount ?? 0}</Text>
                  </View>
                </View>

                <View style={[styles.detailCardBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Resolved Incident Logs:</Text>
                    <Badge label={`${safe?.resolvedSafetyCount ?? 0} RESOLVED`} variant="success" />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Open / Active Incidents:</Text>
                    <Badge label={`${safe?.openSafetyCount ?? 0} ACTIVE`} variant={safe?.openSafetyCount ? 'danger' : 'neutral'} />
                  </View>
                </View>
              </CardBody>
            </Card>
          </View>

          {/* SECTION 5: DAILY ACTIVITY TIME-SERIES VISUALIZER */}
          <Card variant="elevated">
            <CardHeader
              title="Daily Activity Time-Series Trend"
              subtitle="Daily completed rides, passenger fare totals, and journey distance"
              icon={<Icon name="calendar" size={18} color={colors.primary} />}
            />
            <CardBody>
              {daily.length === 0 ? (
                <EmptyState
                  title="No Completed Rides in Date Range"
                  description="No daily ride activity records match the selected date range and filter criteria."
                />
              ) : (
                <View style={{ gap: spacing.md }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chartContainer}>
                      {daily.map((item) => {
                        const maxRides = Math.max(...daily.map((d) => d.completedRides), 1);
                        const heightPct = Math.max((item.completedRides / maxRides) * 100, 10);
                        return (
                          <View key={item.date} style={styles.chartBarCol}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{item.completedRides}</Text>
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barFill,
                                  { height: `${heightPct}%`, backgroundColor: colors.primary },
                                ]}
                              />
                            </View>
                            <Text style={{ fontSize: 10, color: colors.textMuted, transform: [{ rotate: '-30deg' }], marginTop: 6 }}>
                              {item.date.substring(5)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Time Series Data Table */}
                  <View style={{ gap: 4, marginTop: spacing.sm }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>Daily Breakdown Ledger:</Text>
                    {daily.map((item) => (
                      <View key={item.date} style={[styles.ledgerRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary, width: 90 }}>{item.date}</Text>
                        <Text style={{ fontSize: 12, color: colors.success, flex: 1 }}>{item.completedRides} Rides</Text>
                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700', flex: 1 }}>৳{item.recordedFare}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>{item.distanceKm} km</Text>
                        {item.safetyEvents > 0 ? (
                          <Badge label={`${item.safetyEvents} Alert`} variant="warning" />
                        ) : (
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>0 Safety Alerts</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </CardBody>
          </Card>

          {/* SECTION 6: PEAK ACTIVITY BY TIME OF DAY */}
          <Card variant="elevated">
            <CardHeader
              title="Recorded Operational Peak Activity by Time of Day"
              subtitle="Completed ride distribution across Morning, Afternoon, Evening, and Night time windows"
              icon={<Icon name="clock" size={18} color={colors.primary} />}
            />
            <CardBody>
              <View style={styles.statsGrid}>
                {([
                  { key: 'MORNING', title: 'Morning (06:00 - 12:00)', icon: 'sun' },
                  { key: 'AFTERNOON', title: 'Afternoon (12:00 - 17:00)', icon: 'compass' },
                  { key: 'EVENING', title: 'Evening (17:00 - 22:00)', icon: 'moon' },
                  { key: 'NIGHT', title: 'Night (22:00 - 06:00)', icon: 'shield' },
                ] as const).map(({ key, title, icon }) => {
                  const data = peak?.[key] || { count: 0, totalFare: 0 };
                  return (
                    <View key={key} style={[styles.statBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name={icon as any} size={14} color={colors.primary} />
                        <Text style={[styles.statLabel, { color: colors.textPrimary }]}>{title}</Text>
                      </View>
                      <Text style={[styles.statValue, { color: colors.primary, marginTop: 4 }]}>{data.count} Rides</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>৳{data.totalFare} Recorded Fare</Text>
                    </View>
                  );
                })}
              </View>
            </CardBody>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  filterCard: {
    width: '100%',
  },
  filterBody: {
    gap: spacing.md,
  },
  filterSection: {
    gap: spacing.xs,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pillBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customDateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  selectFilterRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  liveSnapshotBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  liveHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    minWidth: 200,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: 140,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  flexCard: {
    flex: 1,
    minWidth: 300,
  },
  metricRowGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metricBox: {
    flex: 1,
    minWidth: 90,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricNum: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  statusBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusPill: {
    marginBottom: 2,
  },
  detailCardBox: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalFareHighlight: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderWidth: 1,
    borderColor: '#D97706',
    alignItems: 'center',
  },
  paymentMethodRow: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 12,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  chartBarCol: {
    alignItems: 'center',
    width: 32,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  ledgerRow: {
    padding: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
});
