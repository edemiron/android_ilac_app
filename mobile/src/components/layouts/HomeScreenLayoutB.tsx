/**
 * HomeScreenLayoutB — Sprint 58.5 + 99: Layout B (Detaylı / Karol-inspired).
 *
 * Sprint 58.5: 7 MD3 kart yapisi (Adherence Hero + Streak Gradient + Stat Tiles + LowStock + MiniChart + Şu An + Bugün).
 * Sprint 99: Layout A ile ayni gradient Header + 2x2 StatsGrid + SectionHeader paylasimli.
 *   - Card 1 (Adherence Hero) → <Header> gradient + progress bar + streak chip
 *   - Card 2 (Streak Gradient) → kaldirildi (Header zaten streak chip tasiyor; redundancy)
 *   - Card 3 (Stat Tiles Row) → <StatsGrid> 2x2 grid
 *   - Şu An + Bugün section title'lari <SectionHeader> ile degistirildi
 *
 * Korunan MD3 kartlar:
 *   - LowStockCard (stok uyarisi)
 *   - MiniChart (son 7 gün)
 *   - CurrentDoseCard (Şu An CTA)
 *   - TimelineItem listesi (Bugün Planı)
 *   - EmptyState fallback
 *   - InlineAdBanner (premium degilse)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CurrentDoseCard } from '../../screens/HomeScreen/components/CurrentDoseCard';
import { TimelineItem } from '../../screens/HomeScreen/components/TimelineItem';
import { Header } from '../../screens/HomeScreen/components/Header';
import { StatsGrid } from '../../screens/HomeScreen/components/StatsGrid';
import { SectionHeader } from '../../screens/HomeScreen/components/SectionHeader';
import { TrustBadge } from '../../screens/HomeScreen/components/TrustBadge';
import {
  InlineAdBanner,
  LowStockCard,
  MiniChart,
  EmptyState,
  type MiniChartDatum,
} from '../common';
import type { TodayReminder } from '../../screens/HomeScreen/types';
import type { Medicine } from '../../types';

interface LayoutBProps {
  /** Sprint 99: Header icin selamlama metni. */
  greeting: string;
  /** Sprint 99: Header icin dinamik tarih metni. */
  dynamicDate: string;
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  streak?: number;
  completedCount?: number;
  totalCount?: number;
  remainingCount?: number;
  lowStockMedicines?: Medicine[];
  lowStockCount?: number;
  miniChartData?: MiniChartDatum[];
  isPremium?: boolean;
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
  onAddPress?: () => void;
  onLowStockPress?: () => void;
  onSeeAllMedicines?: () => void;
}

export function HomeScreenLayoutB({
  greeting,
  dynamicDate,
  reminder,
  reminders = [],
  streak = 0,
  completedCount = 0,
  totalCount = 0,
  remainingCount = 0,
  lowStockMedicines = [],
  lowStockCount,
  miniChartData = [],
  isPremium = false,
  onTake,
  onSnooze,
  onSkip,
  onAddPress,
  onLowStockPress,
  onSeeAllMedicines,
}: LayoutBProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const [showPlan, setShowPlan] = useState(true);

  const tr = language === 'tr';

  // Sprint 99: lowStockCount prop'u verilmediyse lowStockMedicines.length fallback
  const effectiveLowStockCount = lowStockCount ?? lowStockMedicines.length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Sprint 99: Gradient Header (greeting + date + progress + streak chip) */}
      <Header
        greeting={greeting}
        dynamicDate={dynamicDate}
        totalDoses={totalCount}
        completedCount={completedCount}
        currentStreak={streak}
      />

      {/* Sprint 99: 2x2 StatsGrid */}
      <StatsGrid
        totalCount={totalCount}
        completedCount={completedCount}
        remainingCount={remainingCount}
        lowStockCount={effectiveLowStockCount}
      />

      {/* Kart 1 (eski) Adherence Hero kaldirildi — Header zaten progress + streak tasiyor.
          Kart 2 (eski) Streak Gradient kaldirildi — streak chip Header'da. */}

      {/* Kart 3 (eski) Stat Tiles Row kaldirildi — StatsGrid 2x2 tasiyor. */}

      {/* Kart 4: Low Stock (korundu) */}
      {lowStockMedicines.length > 0 && (
        <LowStockCard medicines={lowStockMedicines} onPress={onLowStockPress} />
      )}

      {/* Kart 5: 7-gün Mini Chart (korundu) */}
      {miniChartData.length > 0 && (
        <View
          style={[styles.card, { backgroundColor: colors.surfaceContainerLow, marginTop: 16 }]}
        >
          <MiniChart data={miniChartData} title={tr ? 'Son 7 Gün' : 'Last 7 Days'} />
        </View>
      )}

      {/* Kart 6: Şu An (CurrentDoseCard) — SectionHeader ile */}
      {reminder && (
        <View style={styles.section}>
          <SectionHeader
            title={tr ? 'Şu An' : 'Now'}
            icon="⏰"
          />
          <CurrentDoseCard
            reminder={reminder}
            colors={colors}
            isDark={isDark}
            language={language}
            onTake={onTake || (() => {})}
            onSnooze={onSnooze || (() => {})}
            onSkip={onSkip || (() => {})}
          />
        </View>
      )}

      {/* Kart 7: Bugün Planı (TimelineItem) — SectionHeader + chevron toggle */}
      <TouchableOpacity
        style={styles.planHeaderToggle}
        onPress={() => setShowPlan(!showPlan)}
        accessibilityRole="button"
        accessibilityLabel={
          showPlan
            ? tr ? 'Bugün planını gizle' : 'Hide today plan'
            : tr ? 'Bugün planını göster' : 'Show today plan'
        }
      >
        <SectionHeader
          title={tr ? 'Bugünün Planı' : "Today's Plan"}
          icon="📋"
          {...(onSeeAllMedicines ? { onSeeAll: onSeeAllMedicines } : {})}
        />
        <Text style={[styles.chevron, { color: colors.textMuted }]}>{showPlan ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {showPlan && reminders.length > 0 && (
        <View
          style={[styles.card, styles.cardStacked, { backgroundColor: colors.surfaceContainerLow }]}
        >
          {reminders.map((r, i) => (
            <TimelineItem
              key={i}
              reminder={r}
              colors={colors}
              language={language}
              onTakeNow={() => {}}
              isFirst={i === 0}
              hasActiveSnooze={false}
              snoozeTriggerTime={null}
            />
          ))}
        </View>
      )}

      {/* Empty state */}
      {reminders.length === 0 && (
        <EmptyState
          variant="illustration"
          title={tr ? 'Bugün için ilaç yok' : 'No medicine for today'}
          message={
            tr
              ? 'Yeni ilaç ekleyerek başla. İlacını zamanında almanı hatırlatalım.'
              : 'Get started by adding a new medicine. We will remind you on time.'
          }
          actionLabel={onAddPress ? `+ ${tr ? 'İlaç Ekle' : 'Add'}` : undefined}
          onAction={onAddPress}
        />
      )}

      {/* InlineAdBanner (non-premium) */}
      {!isPremium && (
        <View style={styles.adContainer}>
          <InlineAdBanner />
        </View>
      )}

      {/* Sprint 104.1: Karol-style floating trust badge (sağ alt köşe). */}
      <TrustBadge bottom={100} right={16} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  card: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardStacked: {
    padding: 0,
    overflow: 'hidden',
  },
  section: {
    marginTop: 8,
  },
  planHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingRight: 16,
  },
  chevron: {
    fontSize: 14,
    marginLeft: 8,
  },
  adContainer: {
    marginTop: 16,
  },
});
