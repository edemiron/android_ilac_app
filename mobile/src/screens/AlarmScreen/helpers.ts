/**
 * AlarmScreen helpers — pure utility'ler.
 *
 * Sprint 6.2: AlarmScreen.tsx (910 satir) pure helper extraction.
 * UI text lookuplari + formatters pure fonksiyonlara ayrildi.
 */

import type { MedicineInstruction } from '../../types';

export const DEFAULT_SNOOZE_DURATION = 5;
export const DEFAULT_MAX_SNOOZE_COUNT = 3;

export interface InstructionDisplay {
  tr: string;
  en: string;
}

export const INSTRUCTION_DISPLAY_TEXTS: Record<string, InstructionDisplay> = {
  before_meal: { tr: '🍽️ Yemekten önce', en: '🍽️ Before meal' },
  after_meal: { tr: '🍽️ Yemekten sonra', en: '🍽️ After meal' },
  with_meal: { tr: '🍽️ Yemekle birlikte', en: '🍽️ With meal' },
  empty_stomach: { tr: '⚠️ Aç karnına', en: '⚠️ Empty stomach' },
  before_sleep: { tr: '🌙 Yatmadan önce', en: '🌙 Before sleep' },
  any_time: { tr: '🕐 Herhangi bir zaman', en: '🕐 Any time' },
};

/**
 * Medicine instruction label (TR + EN) lokalize.
 */
export function getInstructionDisplay(
  instruction: MedicineInstruction | undefined,
  language: 'tr' | 'en'
): string | null {
  if (!instruction) return null;
  return INSTRUCTION_DISPLAY_TEXTS[instruction]?.[language] ?? null;
}

/**
 * Alarm countdown text — TR ve EN formatlarinda "X dakika X saniye".
 */
export function formatCountdownText(seconds: number, language: 'tr' | 'en'): string {
  if (seconds <= 0) return language === 'tr' ? 'Şimdi' : 'Now';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (language === 'tr') {
    return minutes > 0 ? `${minutes} dk ${secs} sn` : `${secs} sn`;
  }
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

/**
 * Snooze limit text — kalan erteleme hakki.
 */
export function formatSnoozeRemainingText(
  current: number,
  max: number,
  language: 'tr' | 'en'
): string {
  const remaining = Math.max(0, max - current);
  if (language === 'tr') {
    return `${remaining} ${remaining === 1 ? 'erteleme hakkı' : 'erteleme hakkı'} kaldı`;
  }
  return `${remaining} snooze${remaining === 1 ? '' : 's'} left`;
}

/**
 * Settings fallback degerleri (medicineStore'dan gelen undefined durumlar icin).
 */
export function resolveSnoozeSettings(
  snoozeDuration: number | undefined,
  maxSnoozeCount: number | undefined
): { snoozeDuration: number; maxSnoozeCount: number } {
  return {
    snoozeDuration: snoozeDuration ?? DEFAULT_SNOOZE_DURATION,
    maxSnoozeCount: maxSnoozeCount ?? DEFAULT_MAX_SNOOZE_COUNT,
  };
}

/**
 * Alarm screen critical-level labels (TR + EN).
 */
export const ALARM_TAKE_ACTION_LABELS = {
  takenTitle: { tr: 'İlaç alındı', en: 'Medicine taken' },
  skippedTitle: { tr: 'İlaç atlandı', en: 'Medicine skipped' },
  snoozedTitle: { tr: 'Ertelendi', en: 'Snoozed' },
  takenMessage: {
    tr: 'İlaç kaydınız oluşturuldu.',
    en: 'Medicine log saved successfully.',
  },
  skippedMessage: {
    tr: 'Atlandı olarak işaretlendi.',
    en: 'Marked as skipped.',
  },
} as const;
