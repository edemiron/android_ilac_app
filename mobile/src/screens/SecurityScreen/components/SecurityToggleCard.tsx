/**
 * SecurityToggleCard — Uygulama Kilidi ve Biyometrik Doğrulama Switch Kartları
 */

import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface SecurityToggleCardProps {
  securityEnabled: boolean;
  onToggleSecurity: (enabled: boolean) => void;
  biometricAvailable: boolean;
  biometricsEnabled: boolean;
  biometricType: string;
  onToggleBiometric: (enabled: boolean) => void;
  colors: ThemeColors;
  isDark?: boolean;
  language: string;
}

export function SecurityToggleCard({
  securityEnabled,
  onToggleSecurity,
  biometricAvailable,
  biometricsEnabled,
  biometricType,
  onToggleBiometric,
  colors,
  isDark = false,
  language,
}: SecurityToggleCardProps) {
  const isTr = language === 'tr';

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="lock-closed" size={13} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {isTr ? 'GİRİŞ KORUMASI VE BİYOMETRİ' : 'AUTHENTICATION & BIOMETRICS'}
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
        {/* Güvenlik Aktif Switch Satırı */}
        <View style={styles.row}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? 'rgba(13, 148, 136, 0.22)' : 'rgba(13, 148, 136, 0.15)',
                borderColor: isDark ? 'rgba(13, 148, 136, 0.40)' : 'rgba(13, 148, 136, 0.30)',
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={18} color="#0D9488" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Uygulama Kilidi' : 'App Security Lock'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isTr
                ? 'Uygulamayı açarken PIN veya biyometrik iste'
                : 'Require PIN or biometrics to open'}
            </Text>
          </View>
          <Switch
            value={securityEnabled}
            onValueChange={onToggleSecurity}
            trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#0D9488' }}
            thumbColor={securityEnabled ? '#FFFFFF' : '#F8FAFC'}
          />
        </View>

        {/* Biyometrik Doğrulama Satırı */}
        {biometricAvailable && (
          <View
            style={[
              styles.row,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.15)',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.40)' : 'rgba(99, 102, 241, 0.30)',
                },
              ]}
            >
              <Ionicons name="finger-print" size={18} color="#6366F1" />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isTr ? `Biyometrik Giriş (${biometricType})` : `Biometrics (${biometricType})`}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {isTr ? 'Parmak izi veya yüz tanıma ile anında aç' : 'Fast unlock with biometrics'}
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={onToggleBiometric}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#6366F1' }}
              thumbColor={biometricsEnabled ? '#FFFFFF' : '#F8FAFC'}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
