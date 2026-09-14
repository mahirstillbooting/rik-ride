import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useRouter } from '../navigation/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { spacing, borderRadius } from '../theme/spacing';
import { AdminDashboardView } from './AdminDashboardView';

export const RoleViewContainer: React.FC = () => {
  const { colors } = useTheme();
  const { currentRoleConfig, currentNavItem } = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectVal, setSelectVal] = useState('active');
  const [inputText, setInputText] = useState('');
  const [sampleState, setSampleState] = useState<'content' | 'loading' | 'empty' | 'error'>('content');

  // Render Admin Dashboard View when active role is ADMIN
  if (currentRoleConfig.role === 'ADMIN' || user?.role === 'ADMIN') {
    return <AdminDashboardView />;
  }

  return (
    <View style={styles.container}>
      {/* Top Banner & State Controller */}
      <View style={[styles.headerBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.bannerInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.routeTitle, { color: colors.textPrimary }]}>
              {currentNavItem.label}
            </Text>
            <Badge label={currentRoleConfig.displayName} variant="info" />
          </View>
          <Text style={[styles.routeSubtitle, { color: colors.textSecondary }]}>
            Role Architecture Route [{currentNavItem.id}]
          </Text>
        </View>

        {/* View State Controller */}
        <View style={styles.stateButtons}>
          <Button
            title="Content"
            size="sm"
            variant={sampleState === 'content' ? 'primary' : 'outline'}
            onPress={() => setSampleState('content')}
          />
          <Button
            title="Loading"
            size="sm"
            variant={sampleState === 'loading' ? 'primary' : 'outline'}
            onPress={() => setSampleState('loading')}
          />
          <Button
            title="Empty"
            size="sm"
            variant={sampleState === 'empty' ? 'primary' : 'outline'}
            onPress={() => setSampleState('empty')}
          />
          <Button
            title="Error"
            size="sm"
            variant={sampleState === 'error' ? 'primary' : 'outline'}
            onPress={() => setSampleState('error')}
          />
        </View>
      </View>

      {/* Dynamic View State Render */}
      {sampleState === 'loading' && <LoadingState message="Verifying component loading state..." />}

      {sampleState === 'empty' && (
        <EmptyState
          title={`No ${currentNavItem.label} Data Yet`}
          description="This page container is part of the clean application shell. Features will be connected in future modules."
          actionTitle="Show Toast Notification"
          onAction={() => showToast(`Triggered from ${currentNavItem.label}`, 'info')}
        />
      )}

      {sampleState === 'error' && (
        <ErrorState
          title="Component System Verification"
          message="Simulated error state container verifying error styling and retry actions."
          onRetry={() => setSampleState('content')}
        />
      )}

      {sampleState === 'content' && (
        <View style={styles.stackContainer}>
          {/* Hero Feature Card */}
          <Card variant="hero" style={styles.heroCard}>
            <CardHeader
              title={`${currentRoleConfig.displayName} Command Center`}
              subtitle={`Operating Mode: ${currentRoleConfig.role}`}
              action={<Badge label="Unified Theme" variant="info" />}
            />
            <CardBody style={styles.heroBody}>
              <View style={styles.heroStatsRow}>
                <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>24</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Units</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.statNumber, { color: colors.success }]}>98.4%</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Platform Uptime</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.statNumber, { color: colors.accent }]}>Live</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>GeoTelemetry</Text>
                </View>
              </View>

              <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>
                {currentRoleConfig.description}
              </Text>
            </CardBody>
            <CardFooter>
              <Button
                title="Trigger Notification Toast"
                size="sm"
                variant="primary"
                onPress={() => showToast(`Active Role: ${currentRoleConfig.displayName}`, 'info')}
              />
            </CardFooter>
          </Card>

          {/* Grid of Secondary & Interactive Cards */}
          <View style={styles.grid}>
            <Card variant="elevated" style={styles.card}>
              <CardHeader
                title="Layered Visual Hierarchy"
                subtitle="Surface Level 2 (Elevated Card)"
                action={<Badge label="Level 2" variant="neutral" />}
              />
              <CardBody>
                <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                  Demonstrating surface stacking depth between background (#090A0C), primary surface (#121417), and elevated surface (#181B1F).
                </Text>
                <View style={styles.badgeRow}>
                  <Badge label="Matte Black" variant="neutral" />
                  <Badge label="Neutral Charcoal" variant="neutral" />
                  <Badge label="Vibrant Orange" variant="info" />
                </View>
              </CardBody>
              <CardFooter>
                <Button
                  title="Secondary Action"
                  size="sm"
                  variant="outline"
                  onPress={() => showToast('Secondary action invoked', 'info')}
                />
              </CardFooter>
            </Card>

            <Card variant="default" style={styles.card}>
              <CardHeader
                title="Design System Controls"
                subtitle="Form elements and modal triggers"
              />
              <CardBody>
                <Input
                  label="Sample Input"
                  placeholder="Type something here..."
                  value={inputText}
                  onChangeText={setInputText}
                  helperText="Focus and hover states respond with warm orange indicators"
                />

                <Select
                  label="Filter Status"
                  value={selectVal}
                  onChange={setSelectVal}
                  options={[
                    { label: 'Active Status', value: 'active' },
                    { label: 'Pending Approval', value: 'pending' },
                    { label: 'Completed Shift', value: 'completed' },
                  ]}
                />
              </CardBody>
              <CardFooter>
                <Button
                  title="Open Modal Dialog"
                  size="sm"
                  variant="primary"
                  onPress={() => setModalVisible(true)}
                />
              </CardFooter>
            </Card>
          </View>
        </View>
      )}

      {/* Test Modal Component */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Refined Modal Dialog"
        footer={
          <>
            <Button
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => setModalVisible(false)}
            />
            <Button
              title="Confirm Action"
              variant="primary"
              size="sm"
              onPress={() => {
                setModalVisible(false);
                showToast('Modal action confirmed!', 'success');
              }}
            />
          </>
        }
      >
        <Text style={[styles.modalBodyText, { color: colors.textPrimary }]}>
          This modal dialog presents crisp neutral dark charcoal surfaces, clean borders, and responsive actions across Web and Mobile viewports.
        </Text>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  headerBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  bannerInfo: {
    flex: 1,
    minWidth: 240,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  routeSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  stateButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  stackContainer: {
    gap: spacing.md,
  },
  heroCard: {
    width: '100%',
  },
  heroBody: {
    gap: spacing.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: 120,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    minWidth: 300,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  modalBodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
