/**
 * SocialAuthButtons — Google ile Giriş ve Misafir Girişi Butonları
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface SocialAuthButtonsProps {
  onGoogleAuth: () => void;
  onGuestLogin?: () => void;
  googleButtonText: string;
  guestButtonText?: string;
  orText: string;
  isLoading: boolean;
  colors: ThemeColors;
}

export function SocialAuthButtons({
  onGoogleAuth,
  onGuestLogin,
  googleButtonText,
  guestButtonText,
  orText,
  isLoading,
  colors,
}: SocialAuthButtonsProps) {
  return (
    <>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>{orText}</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onGoogleAuth}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
        <Text style={[styles.googleButtonText, { color: colors.text }]}>{googleButtonText}</Text>
      </TouchableOpacity>

      {onGuestLogin && guestButtonText && (
        <TouchableOpacity
          style={[
            styles.guestButton,
            {
              backgroundColor: colors.surfaceContainerLow || colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={onGuestLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={[styles.guestButtonText, { color: colors.textSecondary }]}>
            {guestButtonText}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
