import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from './RouterContext';
import { useTheme } from '../theme/ThemeContext';
import { LoginView } from '../views/LoginView';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { spacing } from '../theme/spacing';

export interface ProtectedGuardProps {
  children: ReactNode;
}

export const ProtectedGuard: React.FC<ProtectedGuardProps> = ({ children }) => {
  const { authState, user, logout } = useAuth();
  const { activeRole, setActiveRole } = useRouter();
  const { colors } = useTheme();

  if (authState === 'loading') {
    return <LoadingState message="Restoring RIK-RIDE session..." />;
  }

  if (authState === 'unauthenticated' || !user) {
    return <LoginView />;
  }

  // Account Status Checks
  if (user.accountStatus === 'PENDING' || authState === 'pending_approval') {
    return (
      <View style={styles.noticeContainer}>
        <Card variant="hero" style={styles.noticeCard}>
          <CardHeader
            title="Account Pending Operational Approval"
            subtitle={`User: ${user.name} (${user.phone})`}
            action={<Badge label="PENDING" variant="warning" />}
          />
          <CardBody>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Your {user.role} registration has been submitted successfully. Platform Administration must review and grant operational approval before you can access platform resources.
            </Text>
          </CardBody>
          <CardFooter>
            <Button title="Sign Out" variant="outline" size="sm" onPress={logout} />
          </CardFooter>
        </Card>
      </View>
    );
  }

  if (user.accountStatus === 'SUSPENDED' || authState === 'account_suspended') {
    return (
      <View style={styles.noticeContainer}>
        <Card variant="hero" style={styles.noticeCard}>
          <CardHeader
            title="Account Suspended"
            subtitle={`User: ${user.name} (${user.phone})`}
            action={<Badge label="SUSPENDED" variant="danger" />}
          />
          <CardBody>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Your account has been suspended by platform administration. Please contact support to resolve account compliance requirements.
            </Text>
          </CardBody>
          <CardFooter>
            <Button title="Sign Out" variant="outline" size="sm" onPress={logout} />
          </CardFooter>
        </Card>
      </View>
    );
  }

  // Role Authorization Guard Check
  // Verify if active preview role matches the authenticated user's role
  if (user.role !== activeRole) {
    return (
      <View style={styles.noticeContainer}>
        <Card variant="hero" style={styles.noticeCard}>
          <CardHeader
            title="Access Denied: Role Authorization Guard"
            subtitle={`Authenticated Role: ${user.role} | Attempted Area: ${activeRole}`}
            action={<Badge label="FORBIDDEN" variant="danger" />}
          />
          <CardBody>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              You are authenticated as <Text style={{ color: colors.primary, fontWeight: '700' }}>{user.name}</Text> ({user.role}), but you attempted to access the <Text style={{ color: colors.danger, fontWeight: '700' }}>{activeRole}</Text> protected route.
            </Text>
          </CardBody>
          <CardFooter>
            <Button
              title={`Switch to My Authorized Role (${user.role})`}
              variant="primary"
              size="sm"
              onPress={() => setActiveRole(user.role)}
            />
            <Button title="Sign Out" variant="ghost" size="sm" onPress={logout} />
          </CardFooter>
        </Card>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  noticeContainer: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: {
    width: '100%',
    maxWidth: 520,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
