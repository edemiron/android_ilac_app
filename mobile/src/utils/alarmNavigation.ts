/**
 * Alarm navigation helper'ları — notifications.ts ve App.tsx tarafından paylaşılır.
 *
 * Amaç: Aynı ilaç+saat için alarm key üretmek (dedup kontrolü için) ve
 * alarm navigation yaşam döngüsünü yönetmek.
 */

import { format } from 'date-fns';
import type { Medicine, ReminderTime, Snooze } from '../types';
import { getAlarmNotificationId, getSnoozeNotificationId } from './notifications/ids';

// Re-export ID builder'lar (geriye uyumluluk): alarmNavigation.ts eski
// implementasyonlari notifications/ids.ts modulune tasindi.
export { getAlarmNotificationId as buildAlarmNotificationId };
export { getSnoozeNotificationId as buildSnoozeNotificationId };

export interface AlarmNavigationData {
  medicineId: string;
  reminderTimeId: string;
  scheduledTime: string;
  isSnooze?: string;
  snoozeId?: string;
  snoozeCount?: string;
  originalScheduledTime?: string;
}

export interface AlarmNavigationStore {
  getMedicineById: (id: string) => Medicine | undefined;
  getReminderTimesForMedicine: (id: string) => ReminderTime[];
  medicineLogs: Array<{ reminderTimeId: string; scheduledTime: string; status: string }>;
  snoozes: Snooze[];
  setAlarmActive: (medicine: Medicine, reminderTime: ReminderTime, scheduledTime: string) => void;
  deactivateSnooze: (id: string) => void;
}

export interface AlarmScreenNavigationParams {
  medicineId: string;
  reminderTimeId: string;
  scheduledTime: string;
  snoozeCount?: number;
  originalScheduledTime?: string;
}

export interface AlarmNavigationDependencies {
  now?: () => Date;
  isAlarmHandled: (alarmKey: string) => Promise<boolean> | boolean;
  navigationReady: boolean;
  setPendingAlarm: (data: AlarmNavigationData) => void;
  activeAlarmKeys: Set<string>;
  scheduleAlarmKeyCleanup: (alarmKey: string) => void;
  navigateToAlarmScreen: (params: AlarmScreenNavigationParams) => void;
  cancelMedicineNotifications: (medicineId: string) => Promise<void> | void;
  storeState: AlarmNavigationStore;
  logger: {
    debug: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
  };
}

export function getAlarmKey(data: AlarmNavigationData, now: Date): string {
  // scheduledTime ISO; dakika seviyesinde anahtar üret.
  const minute = format(now, 'yyyy-MM-dd-HH-mm');
  return `${data.medicineId}::${data.reminderTimeId}::${minute}`;
}

export function getNotificationIdForAlarmData(data: AlarmNavigationData): string | null {
  if (data.isSnooze === 'true' && data.snoozeId) {
    return getSnoozeNotificationId(data.medicineId, data.reminderTimeId);
  }
  return getAlarmNotificationId(data.medicineId, data.reminderTimeId);
}

/**
 * Bugün için bu alarm zaten loglanmış mı kontrol eder.
 */
export function hasAlarmBeenLoggedToday(
  medicineLogs: AlarmNavigationStore['medicineLogs'],
  data: AlarmNavigationData,
  now: Date
): boolean {
  const today = format(now, 'yyyy-MM-dd');
  return medicineLogs.some(
    log =>
      log.reminderTimeId === data.reminderTimeId &&
      log.scheduledTime.startsWith(today) &&
      (log.status === 'taken' || log.status === 'skipped')
  );
}

async function dismissCurrentNotification(
  data: AlarmNavigationData,
  _dependencies: AlarmNavigationDependencies
): Promise<void> {
  const notificationId = getNotificationIdForAlarmData(data);
  if (notificationId) {
    try {
      // notifee global instance; test ortamında mock'lanmış olabilir
      let notifeeInstance: { cancelDisplayedNotification: (id: string) => Promise<void> } | null =
        null;
      try {
        const mod = await import('@notifee/react-native');
        notifeeInstance =
          (mod as { notifee?: { cancelDisplayedNotification: (id: string) => Promise<void> } })
            .notifee ?? null;
      } catch {
        notifeeInstance = null;
      }
      if (notifeeInstance) {
        await notifeeInstance.cancelDisplayedNotification(notificationId).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }
}

export async function handleIncomingAlarmNavigation(
  data: AlarmNavigationData,
  dependencies: AlarmNavigationDependencies
): Promise<'handled' | 'duplicate' | 'queued' | 'dismissed' | 'navigated'> {
  const now = dependencies.now?.() ?? new Date();
  const alarmKey = getAlarmKey(data, now);

  if (await dependencies.isAlarmHandled(alarmKey)) {
    dependencies.logger.debug('Alarm already handled, skipping', { alarmKey });
    return 'handled';
  }

  if (!dependencies.navigationReady) {
    dependencies.setPendingAlarm(data);
    return 'queued';
  }

  const isTestMode = data.medicineId === 'test-medicine';
  const isSnooze = data.isSnooze === 'true';

  if (!isTestMode && dependencies.activeAlarmKeys.has(alarmKey)) {
    dependencies.logger.debug('Alarm already active on screen, skipping duplicate', { alarmKey });
    return 'duplicate';
  }

  if (!isTestMode) {
    const medicine = dependencies.storeState.getMedicineById(data.medicineId);

    if (!medicine) {
      dependencies.logger.warn('Alarm: medicine missing, dismissing notifications', {
        medicineId: data.medicineId,
        reminderTimeId: data.reminderTimeId,
      });
      await dismissCurrentNotification(data, dependencies);
      await Promise.resolve(dependencies.cancelMedicineNotifications(data.medicineId));
      return 'dismissed';
    }

    if (hasAlarmBeenLoggedToday(dependencies.storeState.medicineLogs, data, now)) {
      dependencies.logger.warn('Alarm: reminder already logged for today', {
        medicineId: data.medicineId,
        reminderTimeId: data.reminderTimeId,
      });
      await dismissCurrentNotification(data, dependencies);
      if (isSnooze && data.snoozeId) {
        dependencies.storeState.deactivateSnooze(data.snoozeId);
      }
      return 'dismissed';
    }

    if (isSnooze && data.snoozeId) {
      const snooze = dependencies.storeState.snoozes.find(item => item.id === data.snoozeId);
      if (snooze && !snooze.isActive) {
        dependencies.logger.warn('Alarm: snooze inactive, dismissing notification', {
          snoozeId: data.snoozeId,
          medicineId: data.medicineId,
        });
        await dismissCurrentNotification(data, dependencies);
        return 'dismissed';
      }
    }

    const reminderTime = dependencies.storeState
      .getReminderTimesForMedicine(data.medicineId)
      .find(item => item.id === data.reminderTimeId);

    if (reminderTime) {
      dependencies.storeState.setAlarmActive(medicine, reminderTime, data.scheduledTime);
    }
  }

  dependencies.activeAlarmKeys.add(alarmKey);
  dependencies.scheduleAlarmKeyCleanup(alarmKey);

  dependencies.navigateToAlarmScreen({
    medicineId: data.medicineId,
    reminderTimeId: data.reminderTimeId,
    scheduledTime: data.scheduledTime,
    snoozeCount: data.snoozeCount ? parseInt(data.snoozeCount, 10) : undefined,
    originalScheduledTime: data.originalScheduledTime,
  });

  await dismissCurrentNotification(data, dependencies);
  return 'navigated';
}
