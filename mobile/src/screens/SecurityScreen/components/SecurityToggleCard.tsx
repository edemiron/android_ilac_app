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
  language,
}: SecurityToggleCardProps) {
  return (
    <>
      {/* Güvenlik Aktif Switch Kartı */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.settingRow}>
          <View style={[styles.iconContainer, { backgroundColor: '#4ECDC420' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#4ECDC4" />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {language === 'tr' ? 'Güvenlik Aktif' : 'Security Enabled'}
            </Text>
            <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
              {language === 'tr'
                ? 'Uygulamayı açarken PIN veya biyometrik doğrulama iste'
                : 'Require authentication to open app'}
            </Text>
          </View>
          <Switch
            value={securityEnabled}
            onValueChange={onToggleSecurity}
            trackColor={{ false: '#767577', true: '#4ECDC4' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Biyometrik Doğrulama Kartı */}
      {biometricAvailable && (
        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#96CEB420' }]}>
              <Ionicons name="finger-print" size={20} color="#96CEB4" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{biometricType}</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                {language === 'tr'
                  ? 'Parmak izi veya yüz tanıma ile hızlı erişim'
                  : 'Quick access with biometrics'}
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={onToggleBiometric}
              trackColor={{ false: '#767577', true: '#96CEB4' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      )}
    </>
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
});
