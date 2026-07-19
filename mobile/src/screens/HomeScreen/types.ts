/**
 * HomeScreen types + constants — Sprint 4.2 paylasimli tip/sabit modulu.
 */

import type { Medicine, MedicineLog, ReminderTime } from '../../types';

export interface TodayReminder {
  medicine: Medicine;
  reminderTime: ReminderTime;
  log?: MedicineLog;
}

export const SNOOZE_OPTIONS = [5, 10, 15, 30] as const;

export const SOFT_RED = '#DC2626';
export const SOFT_RED_BG = '#FEF2F2';
