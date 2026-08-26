/**
 * CaregiverHeroCard — Aile ve Bakıcı Takip Kalkanı Hero Kartı
 *
 * 2026 Modern Sağlık Standardı:
 * Aile koruma kalkanı durumu, aktif izleyici sayısı ve güvenlik güvencesi sunar.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverHeroCardProps {
  caregiverCount: number;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function CaregiverHeroCard({
  caregiverCount,
  colors,
  isDark,
  language,
}: CaregiverHeroCardProps) {
  const isTr = language === 'tr';
  const hasCaregivers = caregiverCount > 0;

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: isDark ? colors.card : '#F0FDF4',
          borderColor: hasCaregivers ? '#86EFAC' : colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* Üst Durum Rozeti */}
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: hasCaregivers ? '#DCFCE7' : colors.inputBackground },
          ]}
        >
          <View
            style={[
              styles.pulseDot,
              { backgroundColor: hasCaregivers ? '#16A34A' : colors.textSecondary },
            ]}
          />
          <Text
            style={[styles.badgeText, { color: hasCaregivers ? '#15803D' : colors.textSecondary }]}
          >
            {hasCaregivers
              ? isTr
                ? 'AİLE KORUMA KALKANI AKTİF'
                : 'FAMILY SHIELD ACTIVE'
              : isTr
                ? 'KORUMA KALKANI BEKLEMEDE'
                : 'SHIELD STANDBY'}
          </Text>
        </View>
        <Ionicons
          name={hasCaregivers ? 'shield-checkmark' : 'shield-outline'}
          size={24}
          color={hasCaregivers ? '#16A34A' : colors.textSecondary}
        />
      </View>

      {/* Başlık ve İstatistik */}
      <Text style={[styles.heroTitle, { color: colors.text }]}>
        {hasCaregivers
          ? isTr
            ? `${caregiverCount} Yakınınız Sizi Takip Ediyor`
            : `${caregiverCount} Loved Ones Are Following`
          : isTr
            ? 'Henüz Aile Üyesi Eklenmedi'
            : 'No Family Members Added Yet'}
      </Text>

      <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
        {hasCaregivers
          ? isTr
            ? 'Hayati doz kaçırma durumlarında ve acil hallerde belirlediğiniz yakınlarınıza anlık bildirim iletilir.'
            : 'Immediate alerts are sent to your chosen family members if a critical dose is missed.'
          : isTr
            ? 'Yakınlarınızı davet ederek ilaç takibinizi paylaşın; unuttuğunuzda anında haberdar olsunlar.'
            : 'Invite your loved ones to share medication tracking and get notified if you miss a dose.'}
      </Text>

      {/* Alt Güvenlik Çubuğu */}
      <View
        style={[
          styles.securityPill,
          {
            backgroundColor: isDark ? colors.background : '#FFFFFF',
            borderColor: isDark ? colors.border : '#E2E8F0',
          },
        ]}
      >
        <Ionicons name="lock-closed" size={14} color="#059669" />
        <Text style={[styles.securityText, { color: colors.textSecondary }]}>
          {isTr
            ? '256-Bit Uçtan Uca Şifreli & KVKK Uyumlu Sağlık Paylaşımı'
            : '256-Bit Encrypted & HIPAA/GDPR Compliant Sharing'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
});
