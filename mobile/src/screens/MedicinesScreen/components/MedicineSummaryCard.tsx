/**
 * MedicineSummaryCard — İlaçlarım Ekranı Hero Sağlık Özeti Paneli
 *
 * 2026 Modern Design Language:
 * - Tonal Glassmorphism yüzey & hafif degrade arka plan
 * - 3'lü akıllı sağlık metriği hapı (Aktif İlaçlar, Stok Durumu, Yaklaşan Doz)
 * - Ergonomik hızlı eylem butonu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface MedicineSummaryCardProps {
  totalCount: number;
  activeCount: number;
  lowStockCount: number;
  nextUpcomingTime: string | null;
  onAddMedicine: () => void;
  colors: ThemeColors;
  isDark: boolean;
  language: 'tr' | 'en';
}

export const MedicineSummaryCard: React.FC<MedicineSummaryCardProps> = ({
  totalCount,
  activeCount,
  lowStockCount,
  nextUpcomingTime,
  onAddMedicine,
  colors,
  isDark,
  language,
}) => {
  const tr = language === 'tr';

  const gradientColors = isDark
    ? ([`${colors.primary}25`, `${colors.surfaceContainerHighest || '#1E293B'}99`] as const)
    : ([`${colors.primary}18`, `${colors.primary}06`] as const);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: `${colors.primary}33`,
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.85)',
          },
        ]}
      >
        {/* Üst Satır: Başlık & Hızlı Ekle Butonu */}
        <View style={styles.topRow}>
          <View style={styles.titleContainer}>
            <View style={[styles.pulseIconContainer, { backgroundColor: `${colors.primary}22` }]}>
              <MaterialCommunityIcons name="heart-pulse" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.titleText, { color: colors.text }]}>
                {tr ? 'İlaçlarım & Tedavi Özeti' : 'Medication Snapshot'}
              </Text>
              <Text style={[styles.subtitleText, { color: colors.textMuted }]}>
                {tr
                  ? `${activeCount} aktif tedavi takip ediliyor`
                  : `${activeCount} active treatments tracked`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addPillButton, { backgroundColor: colors.primary }]}
            onPress={onAddMedicine}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={tr ? 'İlaç Ekle' : 'Add Medicine'}
          >
            <Ionicons name="add" size={18} color={colors.textOnPrimary || '#FFFFFF'} />
            <Text style={[styles.addPillText, { color: colors.textOnPrimary || '#FFFFFF' }]}>
              {tr ? 'Ekle' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alt Satır: 3'lü İstatistik Metrikleri */}
        <View style={styles.metricsRow}>
          {/* Metrik 1: Aktif İlaç */}
          <View
            style={[
              styles.metricPill,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: `${colors.primary}20`,
              },
            ]}
          >
            <View style={[styles.metricDot, { backgroundColor: colors.success || '#10B981' }]} />
            <View>
              <Text style={[styles.metricValue, { color: colors.text }]}>{activeCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                {tr ? 'Aktif İlaç' : 'Active'}
              </Text>
            </View>
          </View>

          {/* Metrik 2: Stok Durumu */}
          <View
            style={[
              styles.metricPill,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: lowStockCount > 0 ? `${colors.error}40` : `${colors.primary}20`,
              },
            ]}
          >
            <Ionicons
              name={lowStockCount > 0 ? 'alert-circle' : 'cube-outline'}
              size={15}
              color={lowStockCount > 0 ? colors.error || '#EF4444' : colors.primary}
            />
            <View>
              <Text
                style={[
                  styles.metricValue,
                  { color: lowStockCount > 0 ? colors.error || '#EF4444' : colors.text },
                ]}
              >
                {lowStockCount > 0
                  ? `${lowStockCount} ${tr ? 'Kritik' : 'Low'}`
                  : tr
                    ? 'Tam'
                    : 'OK'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                {tr ? 'Stok Durumu' : 'Stock'}
              </Text>
            </View>
          </View>

          {/* Metrik 3: Yaklaşan Doz */}
          <View
            style={[
              styles.metricPill,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: `${colors.primary}20`,
              },
            ]}
          >
            <Ionicons name="time-outline" size={15} color={colors.primary} />
            <View>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {nextUpcomingTime || (tr ? 'Bitti' : 'Done')}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                {tr ? 'Sıradaki Doz' : 'Next Dose'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pulseIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    marginTop: 1,
  },
  addPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});
