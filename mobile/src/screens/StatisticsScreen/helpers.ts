/**
 * StatisticsScreen helpers + sabitler.
 *
 * Sprint 6.1: StatisticsScreen.tsx (910 satir) modularizasyonu.
 */

export type Period = 'weekly' | 'monthly';

export const DEFAULT_STATISTICS_DAYS = 7;

export interface PeriodConfig {
  type: Period;
  days: 7 | 30;
  label_tr: string;
  label_en: string;
}

export const PERIOD_CONFIGS: Record<Period, PeriodConfig> = {
  weekly: {
    type: 'weekly',
    days: 7,
    label_tr: 'Haftalık',
    label_en: 'Weekly',
  },
  monthly: {
    type: 'monthly',
    days: 30,
    label_tr: 'Aylık',
    label_en: 'Monthly',
  },
};

/**
 * Adherence rate -> renk: iyi (>%80 yesil), orta (%50-80 sari), kotu (<%50 kirmizi).
 */
export function getAdherenceColor(
  rate: number,
  colors: {
    success: string;
    warning: string;
    error: string;
    textMuted: string;
  }
): string {
  if (rate >= 80) return colors.success;
  if (rate >= 50) return colors.warning;
  if (rate > 0) return colors.error;
  return colors.textMuted;
}

/**
 * Adherence rate -> human-readable label (TR + EN).
 */
export function getAdherenceLabel(rate: number, language: 'tr' | 'en'): string {
  if (rate >= 80) return language === 'tr' ? 'Mükemmel' : 'Excellent';
  if (rate >= 50) return language === 'tr' ? 'İyi' : 'Good';
  if (rate > 0) return language === 'tr' ? 'Düşük' : 'Low';
  return language === 'tr' ? 'Veri yok' : 'No data';
}

/**
 * Statistics summary icin medication ranking.
 */
export interface MedicineRanking {
  medicineId: string;
  medicineName: string;
  taken: number;
  skipped: number;
  missed: number;
  adherenceRate: number;
}

/**
 * Sifir bolme korumali adherence rate hesapla (0-100).
 */
export function calculateAdherenceRate(taken: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((taken / total) * 100);
}

/**
 * Statik dataset labels (UI'da kullanilan lokalize etiketler).
 */
export const ADHERENCE_LEGEND = {
  taken: { tr: 'Alınan', en: 'Taken' },
  skipped: { tr: 'Atlanan', en: 'Skipped' },
  missed: { tr: 'Kaçırılan', en: 'Missed' },
} as const;

export const STREAK_LABELS = {
  days_tr: 'gün üst üste',
  days_en: 'day streak',
  title_tr: 'İlaç Serisi',
  title_en: 'Medication Streak',
} as const;
