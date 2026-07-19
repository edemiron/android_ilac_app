/**
 * medicineStore helpers — reschedule modulu.
 *
 * Sprint 4: Active notification rescheduling pure helper.
 * Davranis korunuyor — medicineStore.ts buradan cagriyor.
 */

import {
  scheduleMedicineNotification,
  scheduleSnoozeNotification,
} from '../../utils/notifications';
import { createScopedLogger } from '../../utils/logger';
import type { Medicine, ReminderTime, Snooze, UserSettings } from '../../types';

const log = createScopedLogger('MedicineStoreReschedule');

export interface RescheduledSnoozeNotification {
  snoozeId: string;
  notificationId: string;
  triggerTime: string;
}

/**
 * Settings degisikligi notification reschedule tetiklemeli mi kontrol et.
 * fullScreenAlarmEnabled, vibrationEnabled, alarmModeEnabled, quietHours* alanlari
 * notification davranisini etkiler.
 */
export function didReminderSchedulingSettingsChange(
  prev: UserSettings,
  next: UserSettings
): boolean {
  return (
    prev.fullScreenAlarmEnabled !== next.fullScreenAlarmEnabled ||
    prev.vibrationEnabled !== next.vibrationEnabled ||
    prev.alarmModeEnabled !== next.alarmModeEnabled ||
    prev.quietHoursEnabled !== next.quietHoursEnabled ||
    prev.quietHoursStart !== next.quietHoursStart ||
    prev.quietHoursEnd !== next.quietHoursEnd
  );
}

/**
 * Snooze notification update'lerini snooze array'ine merge et.
 * update yoksa veya bossa original array doner.
 */
export function mergeSnoozeNotificationRescheduleUpdates(
  snoozes: Snooze[],
  updates: RescheduledSnoozeNotification[]
): Snooze[] {
  if (updates.length === 0) {
    return snoozes;
  }

  const updatesMap = new Map(updates.map(update => [update.snoozeId, update]));

  return snoozes.map(snooze => {
    const update = updatesMap.get(snooze.id);
    if (!update) {
      return snooze;
    }

    return {
      ...snooze,
      notificationId: update.notificationId,
      triggerTime: update.triggerTime,
    };
  });
}

/**
 * Snooze triggerTime ISO string'ini Date'e parse et.
 * Gecersizse null doner.
 */
export function parseSnoozeTriggerTime(triggerTime: string): Date | null {
  const parsedTriggerTime = new Date(triggerTime);

  return Number.isNaN(parsedTriggerTime.getTime()) ? null : parsedTriggerTime;
}

export interface RescheduleState {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  snoozes: Snooze[];
  settings: UserSettings;
}

/**
 * Tum aktif medicine + reminder + snooze notification'larini yeniden planla.
 * Background sync / app restart sonrasi cagrilir.
 *
 * Hatalar sessizce yutulur (Promise.allSettled) — bir reminder basarisiz olsa
 * bile digerleri devam eder.
 */
export async function rescheduleActiveNotificationsFromState(
  state: RescheduleState,
  applySnoozeUpdates?: (updates: RescheduledSnoozeNotification[]) => void
): Promise<void> {
  const activeMedicines = new Map(
    state.medicines.filter(medicine => medicine.isActive).map(medicine => [medicine.id, medicine])
  );

  const enabledReminderTimes = state.reminderTimes.filter(
    reminderTime => reminderTime.isEnabled && activeMedicines.has(reminderTime.medicineId)
  );

  await Promise.allSettled(
    enabledReminderTimes.map(reminderTime =>
      scheduleMedicineNotification(
        activeMedicines.get(reminderTime.medicineId)!,
        reminderTime,
        state.settings,
        false
      )
    )
  );

  const now = new Date();
  const activeSnoozes = state.snoozes.filter(snooze => snooze.isActive);
  const snoozeResults = await Promise.allSettled(
    activeSnoozes.map(async snooze => {
      const triggerTime = parseSnoozeTriggerTime(snooze.triggerTime);
      const medicine = activeMedicines.get(snooze.medicineId);
      const reminderTime = state.reminderTimes.find(
        item => item.id === snooze.reminderTimeId && item.isEnabled
      );

      if (!triggerTime || triggerTime.getTime() <= now.getTime()) {
        log.debug('Gecmis veya gecersiz aktif snooze yeniden planlamada atlandi', {
          snoozeId: snooze.id,
          triggerTime: snooze.triggerTime,
        });
        return null;
      }

      if (!medicine || !reminderTime) {
        return null;
      }

      const result = await scheduleSnoozeNotification({
        medicine,
        reminderTime,
        snoozeId: snooze.id,
        originalScheduledTime: snooze.originalScheduledTime,
        snoozeCount: snooze.snoozeCount,
        settings: state.settings,
        triggerTime,
      });

      if (!result) {
        return null;
      }

      return {
        snoozeId: snooze.id,
        notificationId: result.notificationId,
        triggerTime: result.triggerTime.toISOString(),
      };
    })
  );

  const updates = snoozeResults.flatMap(result =>
    result.status === 'fulfilled' && result.value ? [result.value] : []
  );

  if (updates.length > 0) {
    applySnoozeUpdates?.(updates);
  }
}
