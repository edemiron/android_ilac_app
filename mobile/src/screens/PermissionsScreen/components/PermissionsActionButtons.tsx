/**
 * PermissionsActionButtons — Devam Et ve Şimdilik Atla Butonları
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PermissionsActionButtonsProps {
  allPermissionsGranted: boolean;
  onComplete: () => void;
  colors: ThemeColors;
  language: string;
}

export function PermissionsActionButtons({
  allPermissionsGranted,
  onComplete,
  colors,
  language,
}: PermissionsActionButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          {
            backgroundColor: allPermissionsGranted ? colors.primary : colors.textMuted,
          },
        ]}
        onPress={onComplete}
        disabled={!allPermissionsGranted}
        activeOpacity={0.8}
      >
        <Text style={styles.continueButtonText}>
          {allPermissionsGranted
            ? language === 'tr'
              ? 'Devam Et'
              : 'Continue'
            : language === 'tr'
              ? 'Lütfen izinleri verin'
              : 'Please grant permissions'}
        </Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Skip Option */}
      <TouchableOpacity style={styles.skipButton} onPress={onComplete} activeOpacity={0.7}>
        <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>
          {language === 'tr' ? 'Şimdilik Atla' : 'Skip for now'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipButtonText: {
    fontSize: 15,
  },
});
