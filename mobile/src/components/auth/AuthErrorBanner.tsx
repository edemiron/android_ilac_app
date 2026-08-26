/**
 * AuthErrorBanner — Kimlik Doğrulama Hata Mesajı Kutusu
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface AuthErrorBannerProps {
  error: string | null;
  colors: ThemeColors;
}

export function AuthErrorBanner({ error, colors }: AuthErrorBannerProps) {
  if (!error) return null;

  return (
    <View
      style={[styles.errorBox, { backgroundColor: colors.error + '20', borderColor: colors.error }]}
    >
      <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
