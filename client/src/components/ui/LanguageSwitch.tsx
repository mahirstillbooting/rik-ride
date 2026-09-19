import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { useToast } from './Toast';

export const LanguageSwitch: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  useEffect(() => {
    AsyncStorage.getItem('user_language_preference').then((saved) => {
      if (saved === 'bn' || saved === 'en') {
        setLang(saved);
      }
    });
  }, []);

  const toggleLanguage = async () => {
    const nextLang = lang === 'en' ? 'bn' : 'en';
    setLang(nextLang);
    await AsyncStorage.setItem('user_language_preference', nextLang);
    showToast(
      nextLang === 'bn'
        ? 'ভাষা পছন্দ: বাংলা (English Fallback Architecture Active)'
        : 'Language set to English',
      'info'
    );
  };

  const webInteractiveStyle = Platform.OS === 'web'
    ? {
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
      }
    : {};

  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={[
        styles.container,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        webInteractiveStyle as any,
      ]}
    >
      <Icon name="globe" size={14} color={colors.primary} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        {lang === 'en' ? 'English ⇄ বাংলা' : 'বাংলা ⇄ English'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
