/**
 * MedicineBreakdownList — İlaç Bazlı Tedavi Disiplini & Başarı Listesi
 *
 * 2026 Modern Health Scorecard:
 * - Hangi ilacın ne kadar düzenli alındığını gösteren şeffaf döküm
 * - İlacın kendi renk aksanına sahip yumuşak ilerleme çubukları
 * - Net oranlar ve eksik doz uyarıları
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { MedicineBreakdownItem } from '../hooks/useStatisticsController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface MedicineBreakdownListProps {
  medicines: MedicineBreakdownItem[];
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function MedicineBreakdownList({
  medicines,
  colors,
  isDark,
  language,
}: MedicineBreakdownListProps) {
  const isTr = language === 'tr';

  if (medicines.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        {/* Başlık Satırı */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.headerIconBg, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="medkit-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'İLAÇ BAZLI DİSİPLİN ANALİZİ' : 'PER-MEDICINE PERFORMANCE'}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {medicines.length} {isTr ? 'İlaç' : 'Meds'}
          </Text>
        </View>

        {/* İlaç Listesi */}
        <View style={styles.list}>
          {medicines.map((item, index) => {
            const medColor = item.color || colors.primary || '#0D9488';
            const rate = item.adherenceRate;

            let rateBadgeBg = isDark ? 'rgba(52, 211, 153, 0.22)' : `${colors.success}18`;
            let rateBadgeText = isDark ? '#34D399' : colors.success || '#10B981';

            if (rate < 75) {
              rateBadgeBg = isDark ? 'rgba(248, 113, 113, 0.22)' : `${colors.error}18`;
              rateBadgeText = isDark ? '#F87171' : colors.error || '#EF4444';
            } else if (rate < 90) {
              rateBadgeBg = isDark ? 'rgba(251, 191, 36, 0.22)' : `${colors.warning}18`;
              rateBadgeText = isDark ? '#FBBF24' : colors.warning || '#F59E0B';
            }

            return (
              <View
                key={item.medicineId}
                style={[
                  styles.itemRow,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                {/* Sol Squircle Avatar */}
                <LinearGradient
                  colors={[`${medColor}33`, `${medColor}15`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.avatar,
                    {
                      borderColor: `${medColor}50`,
                    },
                  ]}
                >
                  <Ionicons name="medkit-outline" size={18} color={medColor} />
                </LinearGradient>

                {/* Orta Bilgi ve İlerleme Çubuğu */}
                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.rateBadge, { backgroundColor: rateBadgeBg }]}>
                      <Text style={[styles.rateBadgeText, { color: rateBadgeText }]}>%{rate}</Text>
                    </View>
                  </View>

                  {/* İlerleme Çubuğu */}
                  <View
                    style={[
                      styles.progressBarTrack,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.06)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.max(rate, 4)}%`,
                          backgroundColor: rate >= 90 ? medColor : rateBadgeText,
                        },
                      ]}
                    />
                  </View>

                  {/* Doz Sayısı & Detay */}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailText, { color: colors.textMuted }]}>
                      {item.dosage ? `${item.dosage} • ` : ''}
                      {item.taken}/{item.total} {isTr ? 'doz alındı' : 'doses taken'}
                    </Text>
                    {item.skipped > 0 && (
                      <Text style={[styles.skippedText, { color: colors.warning || '#F59E0B' }]}>
                        {item.skipped} {isTr ? 'atlandı' : 'skipped'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  list: {
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  rateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  skippedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
