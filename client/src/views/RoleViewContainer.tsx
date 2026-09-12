import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useRouter } from '../navigation/RouterContext';
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
import { spacing } from '../theme/spacing';

export const RoleViewContainer: React.FC = () => {
  const { colors } = useTheme();
  const { currentRoleConfig, currentNavItem } = useRouter();
  const { showToast } = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectVal, setSelectVal] = useState('active');
  const [inputText, setInputText] = useState('');
  const [sampleState, setSampleState] = useState<'content' | 'loading' | 'empty' | 'error'>('content');

  return (
    <View style={styles.container}>
      {/* Route Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.routeTitle, { color: colors.textPrimary }]}>
              {currentNavItem.label}
            </Text>
            <Badge label={currentRoleConfig.displayName} variant="info" />
          </View>
          <Text style={[styles.routeSubtitle, { color: colors.textSecondary }]}>
            Role View Placeholder for route [{currentNavItem.id}]
          </Text>
        </View>

        {/* View State Switcher for Verification */}
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
        <View style={styles.grid}>
          {/* Card 1: Role Information */}
          <Card style={styles.card}>
            <CardHeader
              title={`${currentRoleConfig.displayName} Architecture`}
              subtitle={`Mode: ${currentRoleConfig.role}`}
              action={<Badge label="Verified" variant="success" />}
            />
            <CardBody>
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                {currentRoleConfig.description}
              </Text>
              <View style={styles.badgeRow}>
                <Badge label="Role-Based" variant="info" />
                <Badge label="Responsive Shell" variant="neutral" />
                <Badge label="Dark/Light Ready" variant="success" />
              </View>
            </CardBody>
            <CardFooter>
              <Button
                title="Test Toast Notification"
                size="sm"
                variant="outline"
                onPress={() => showToast(`Active Role: ${currentRoleConfig.displayName}`, 'success')}
              />
            </CardFooter>
          </Card>

          {/* Card 2: Interactive Design System Controls */}
          <Card style={styles.card}>
            <CardHeader
              title="Design System Foundation"
              subtitle="Interactive UI inputs & modal dialog test"
            />
            <CardBody>
              <Input
                label="Sample Foundation Input"
                placeholder="Type something here..."
                value={inputText}
                onChangeText={setInputText}
                helperText="Reusable text input with focus & error styling"
              />

              <Select
                label="Status Filter Select"
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
      )}

      {/* Test Modal Component */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Responsive Modal Dialog Foundation"
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
          This modal foundation supports backdrop dismiss, header title, body content, and action footers cleanly across Web and Mobile viewports.
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
    borderRadius: spacing.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeTitle: {
    fontSize: 22,
    fontWeight: '800',
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
