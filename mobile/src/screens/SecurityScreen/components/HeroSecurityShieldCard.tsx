/**
 * HeroSecurityShieldCard — Canlı Güvenlik Kalkanı & Sağlık Gizliliği Paneli
 *
 * 2026 Modern Security Hero:
 * - Uygulamanın aktif koruma seviyesini gösteren dinamik kalkan
 * - 256-bit AES donanım şifreleme ve HIPAA tıbbi veri gizlilik mührü
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface HeroSecurityShieldCardProps {
  securityEnabled: boolean;
  hasPin: boolean;
  biometricsEnabled: boolean;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function HeroSecurityShieldCard({
  securityEnabled,
  hasPin,
  biometricsEnabled,
  colors,
  isDark,
  language,
}: HeroSecurityShieldCardProps) {
  const isTr = language === 'tr';

  const isProtected = securityEnabled && (hasPin || biometricsEnabled);

  const shieldColor = isProtected ? colors.success || '#10B981' : colors.warning || '#F59E0B';

  const statusTitle = isProtected
    ? isTr
      ? 'TAM KORUMA AKTİF'
      : 'FULL PROTECTION ACTIVE'
    : isTr
      ? 'KORUMA DEVRE DIŞI'
      : 'PROTECTION DISABLED';

  const statusSubtitle = isProtected
    ? isTr
      ? 'Tüm reçeteleriniz, kullanım loglarınız ve sağlık verileriniz cihazınızda 256-bit donanım şifrelemesi ile korunmaktadır.'
      : 'All your prescriptions, logs and medical records are encrypted on device with 256-bit hardware security.'
    : isTr
      ? 'Sağlık verilerinizin yetkisiz erişimlere karşı güvende olması için PIN veya Biyometrik kilidi aktif edin.'
      : 'Enable PIN or Biometric lock to protect your medical data against unauthorized access.';

  const gradientColors = isDark
    ? ([`${shieldColor}25`, `${colors.surfaceContainerHighest || '#1E293B'}90`] as const)
    : ([`${shieldColor}18`, `${shieldColor}05`] as const);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : `${shieldColor}30`,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.shieldAvatar,
              {
                backgroundColor: isDark ? `${shieldColor}25` : `${shieldColor}18`,
                borderColor: `${shieldColor}45`,
              },
            ]}
          >
            <Ionicons
              name={isProtected ? 'shield-checkmark' : 'lock-open'}
              size={32}
              color={shieldColor}
            />
          </View>

          <View style={styles.headerTextCol}>
            {/* Canlı Durum Rozeti */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isDark ? `${shieldColor}25` : `${shieldColor}15`,
                  borderColor: `${shieldColor}40`,
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: shieldColor }]} />
              <Text style={[styles.statusBadgeText, { color: shieldColor }]}>{statusTitle}</Text>
            </View>

            <View style={styles.cryptoBadge}>
              <Ionicons name="hardware-chip-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.cryptoBadgeText, { color: colors.textMuted }]}>
                {isTr ? '256-Bit Donanım Şifreleme' : '256-Bit Hardware Encrypted'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.description, { color: colors.text }]}>{statusSubtitle}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 14,
  },
  shieldAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerTextCol: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cryptoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cryptoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
});
