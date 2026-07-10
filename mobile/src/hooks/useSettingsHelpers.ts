/**
 * useSettingsScreen test data + pure helpers.
 *
 * Sprint 5.2: useSettingsScreen.ts (766 satir) hook'unu pure helper'lara
 * boluyor — test verileri ve time/setting manipulators.
 */

import { format } from 'date-fns';

/**
 * Test medicine data (settings test scenario'lari icin).
 */
export const TEST_MEDICINE_NAMES = [
  'Aspirin',
  'Parol',
  'Vitamin D',
  'Ibuprofen',
  'Augmentin',
  'Glucophage',
] as const;

export const TEST_MEDICINE_DOSES = ['100mg', '500mg', '1000mg', '5ml', '1 tablet'] as const;

export const TEST_INSTRUCTIONS = [
  'before_meal',
  'after_meal',
  'with_meal',
  'empty_stomach',
  'before_sleep',
] as const;

export type SettingsPickerKey =
  | 'showWakeUpPicker'
  | 'showSleepPicker'
  | 'showThemePicker'
  | 'showLanguagePicker'
  | 'showLayoutPicker'
  | 'showSnoozePicker'
  | 'showSnoozeCountPicker'
  | 'showVolumePicker'
  | 'showQuietStartPicker'
  | 'showQuietEndPicker'
  | 'showConflictIntervalPicker';

/**
 * Map setting key -> picker visibility key.
 */
export const SETTING_TO_PICKER_MAP: Record<string, SettingsPickerKey> = {
  wakeUpTime: 'showWakeUpPicker',
  sleepTime: 'showSleepPicker',
  quietHoursStart: 'showQuietStartPicker',
  quietHoursEnd: 'showQuietEndPicker',
};

export type TimeSettingKey = keyof typeof SETTING_TO_PICKER_MAP;

/**
 * "HH:mm" formatli string -> Date (bugunun tarihi uzerinden saat olarak) parse.
 */
export function parseTimeToDate(timeStr: string, referenceDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Date'i "HH:mm" formatinda string'e cevir.
 * Inverse of parseTimeToDate.
 */
export function formatDateToTimeString(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Picker visibility toggle (immutable update).
 */
export function togglePickerVisibility<K extends string>(
  state: Record<K, boolean>,
  key: K
): Record<K, boolean> {
  return { ...state, [key]: !state[key] };
}

/**
 * Picker visibility close (set false).
 */
export function closePickerVisibility<K extends string>(
  state: Record<K, boolean>,
  key: K
): Record<K, boolean> {
  return { ...state, [key]: false };
}

/**
 * Random test secici — verilen array'den rastgele bir oge doner.
 */
export function pickRandomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Settings scenario builder — test icin 1k rastgele medicine uretir.
 */
export function generateRandomMedicines(count: number): Array<{
  name: string;
  dosage: string;
  instruction: string;
}> {
  return Array.from({ length: count }, () => ({
    name: pickRandomItem(TEST_MEDICINE_NAMES),
    dosage: pickRandomItem(TEST_MEDICINE_DOSES),
    instruction: pickRandomItem(TEST_INSTRUCTIONS),
  }));
}

// =============================================================================
// Sprint 10.2: Settings validation helper'lari.
// Theme, language, snooze duration gibi ayar degerleri icin tip-guvenli
// validation. UI/Form state'den gelen raw string/number input'u temizler.
// =============================================================================

/**
 * Tema degerini validate et. 'light' | 'dark' | 'auto' disinda deger
 * reddedilir, default 'auto' doner.
 */
export function validateTheme(theme: unknown): 'light' | 'dark' | 'auto' {
  if (theme === 'light' || theme === 'dark' || theme === 'auto') {
    return theme;
  }
  return 'auto';
}

/**
 * Dil degerini validate et. 'tr' | 'en' disinda degerler icin default 'tr'.
 */
export function validateLanguage(language: unknown): 'tr' | 'en' {
  if (language === 'tr' || language === 'en') {
    return language;
  }
  return 'tr';
}

/**
 * Snooze duration degerini sinirla (1-60 dakika arasi).
 * Gecersiz degerler default 5.
 */
export function validateSnoozeDuration(minutes: unknown, defaultValue: number = 5): number {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return defaultValue;
  }
  if (minutes < 1) return 1;
  if (minutes > 60) return 60;
  return Math.floor(minutes);
}

/**
 * Max snooze count degerini sinirla (1-10).
 */
export function validateMaxSnoozeCount(count: unknown, defaultValue: number = 3): number {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return defaultValue;
  }
  if (count < 1) return 1;
  if (count > 10) return 10;
  return Math.floor(count);
}

/**
 * Volume degerini 0-100 araliginda sinirla.
 */
export function validateVolume(volume: unknown, defaultValue: number = 80): number {
  if (typeof volume !== 'number' || !Number.isFinite(volume)) {
    return defaultValue;
  }
  if (volume < 0) return 0;
  if (volume > 100) return 100;
  return Math.floor(volume);
}

/**
 * Wake up / sleep time HH:mm formatinda mi?
 */
export function isValidTimeFormat(time: unknown): boolean {
  if (typeof time !== 'string') return false;
  return /^\d{2}:\d{2}$/.test(time) && isValidClockTimeLocal(time);
}

/**
 * Local time-range validator (00:00-23:59) — inline (Sprint 10.2).
 */
function isValidClockTimeLocal(time: string): boolean {
  const parts = time.split(':').map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Sanitize: settings objesinden sadece known field'lari al.
 * Bilinmeyen field'lar discard edilir.
 */
export function sanitizeSettings<T extends Record<string, unknown>>(
  input: unknown,
  knownFields: (keyof T)[],
  defaults: T
): T {
  if (typeof input !== 'object' || input == null) {
    return defaults;
  }
  const result = { ...defaults };
  for (const key of knownFields) {
    const value = (input as Record<string, unknown>)[key as string];
    if (value !== undefined) {
      result[key] = value as T[keyof T];
    }
  }
  return result;
}

// =============================================================================
// Sprint 12.2: useSettingsScreen i18n helper'lari helpers'a tasindi.
// =============================================================================

/**
 * Tema lokalize label uret (TR/EN).
 * 'light' -> 'Aydinlik', 'dark' -> 'Karanlik', 'system' -> 'Sistem'.
 */
export function getLocalizedThemeLabel(theme: string, language: 'tr' | 'en' = 'tr'): string {
  const labels: Record<string, Record<string, string>> = {
    tr: { light: 'Aydınlık', dark: 'Karanlık', system: 'Sistem' },
    en: { light: 'Light', dark: 'Dark', system: 'System' },
  };
  return labels[language]?.[theme] ?? theme;
}

/**
 * Dil lokalize label uret (TR/EN).
 */
export function getLocalizedLanguageLabel(language: 'tr' | 'en'): string {
  return language === 'tr' ? 'Türkçe' : 'English';
}

/**
 * HH:mm time string normalize (padded zero).
 * "8:0" -> "08:00".
 */
export function normalizeTimeString(time: string): string {
  if (typeof time !== 'string') return '';
  const parts = time.split(':').map(Number);
  const h = Number.isFinite(parts[0]) ? parts[0] : 0;
  const m = Number.isFinite(parts[1]) ? parts[1] : 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
