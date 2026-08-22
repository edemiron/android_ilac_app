/**
 * SecurityStatusCard — Aktif güvenlik durumu özeti kartı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface SecurityStatusCardProps {
  hasPin: boolean;
  biometricAvailable: boolean;
  securityType: 'none' | 'pin' | 'biometric' | 'both';
  biometricType: string;
  colors: ThemeColors;
  language: string;
}

export function SecurityStatusCard({
  hasPin,
  biometricAvailable,
  securityType,
  biometricType,
  colors,
  language,
}: SecurityStatusCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12, marginBottom: 24 }]}>
      <View style={[styles.cardHeader, { borderColor: colors.border }]}>
        <Ionicons name="information-circle" size={20} color="#6B7280" />
        <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8 }]}>
          {language === 'tr' ? 'Güvenlik Durumu' : 'Security Status'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          {language === 'tr' ? 'PIN Ayarlı:' : 'PIN Set:'}
        </Text>
        <Text style={[styles.statusValue, { color: hasPin ? colors.success : colors.error }]}>
          {hasPin
            ? language === 'tr'
              ? '✓ Evet'
              : '✓ Yes'
            : language === 'tr'
              ? '✗ Hayır'
              : '✗ No'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          {language === 'tr' ? 'Biyometrik:' : 'Biometric:'}
        </Text>
        <Text
          style={[
            styles.statusValue,
            { color: biometricAvailable ? colors.success : colors.error },
          ]}
        >
          {biometricAvailable
            ? language === 'tr'
              ? '✓ Kullanılabilir'
              : '✓ Available'
            : language === 'tr'
              ? '✗ Kullanılamıyor'
              : '✗ Unavailable'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          {language === 'tr' ? 'Güvenlik Tipi:' : 'Security Type:'}
        </Text>
        <Text style={[styles.statusValue, { color: colors.text }]}>
          {securityType === 'none' && (language === 'tr' ? 'Kapalı' : 'Disabled')}
          {securityType === 'pin' && 'PIN'}
          {securityType === 'biometric' && biometricType}
          {securityType === 'both' && (language === 'tr' ? 'PIN + Biyometrik' : 'PIN + Biometric')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
