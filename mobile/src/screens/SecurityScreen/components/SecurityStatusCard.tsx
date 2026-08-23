/**
 * SecurityStatusCard — Aktif güvenlik durumu ve gizlilik karnesi
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
  isDark?: boolean;
  language: string;
}

export function SecurityStatusCard({
  hasPin,
  biometricAvailable,
  securityType,
  biometricType,
  colors,
  isDark = false,
  language,
}: SecurityStatusCardProps) {
  const isTr = language === 'tr';

  const items = [
    {
      icon: 'lock-closed',
      iconColor: '#0284C7',
      label: isTr ? 'Donanım Şifreleme' : 'Hardware Encryption',
      value: isTr ? '256-bit AES' : '256-bit AES',
      isSuccess: true,
    },
    {
      icon: 'keypad',
      iconColor: '#F59E0B',
      label: isTr ? '4 Haneli PIN' : '4-Digit PIN',
      value: hasPin ? (isTr ? '✓ Tanımlı' : '✓ Configured') : isTr ? '✗ Ayarlanmadı' : '✗ Not Set',
      isSuccess: hasPin,
    },
    {
      icon: 'finger-print',
      iconColor: '#6366F1',
      label: isTr ? 'Biyometrik Kilit' : 'Biometric Sensor',
      value: biometricAvailable
        ? isTr
          ? `✓ ${biometricType}`
          : `✓ ${biometricType}`
        : isTr
          ? '✗ Kullanılamıyor'
          : '✗ Unavailable',
      isSuccess: biometricAvailable,
    },
    {
      icon: 'shield',
      iconColor: '#10B981',
      label: isTr ? 'Aktif Kilit Modu' : 'Active Mode',
      value:
        securityType === 'none'
          ? isTr
            ? 'Kapalı'
            : 'Disabled'
          : securityType === 'pin'
            ? 'PIN'
            : securityType === 'biometric'
              ? biometricType
              : isTr
                ? 'PIN + Biyometrik'
                : 'PIN + Biometric',
      isSuccess: securityType !== 'none',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="information-circle" size={13} color="#64748B" style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {isTr ? 'GÜVENLİK VE GİZLİLİK KARNESİ' : 'SECURITY & PRIVACY REPORT'}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        {items.map((item, idx) => (
          <View
            key={item.label}
            style={[
              styles.row,
              idx > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <View style={styles.left}>
              <Ionicons
                name={item.icon as any}
                size={16}
                color={item.iconColor}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
            </View>

            <Text
              style={[
                styles.value,
                {
                  color: item.isSuccess ? colors.success || '#10B981' : colors.textMuted,
                  fontWeight: item.isSuccess ? '700' : '500',
                },
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
  },
});
