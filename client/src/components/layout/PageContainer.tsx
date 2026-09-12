import React, { ReactNode } from 'react';
import { ScrollView, View, StyleSheet, ViewStyle } from 'react-native';
import { spacing } from '../../theme/spacing';

export interface PageContainerProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, style }) => {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.innerContainer, style]}>{children}</View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 1200,
  },
});
