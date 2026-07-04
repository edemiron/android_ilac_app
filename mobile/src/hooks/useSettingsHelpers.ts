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
