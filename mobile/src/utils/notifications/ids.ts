/**
 * Notifications — IDs module.
 *
 * Notification ID oluşturma ve validasyon. Sprint 3 (notifications.ts modular).
 * Davranis korundu: buildSnoozeNotificationId (3-parametreli, snooze- prefix),
 * getAlarmNotificationId (alarm- prefix), validasyon helper'lari.
 *
 * NOT: alarmNavigation.ts'de de buildSnoozeNotificationId var (2-parametreli).
 * Sprint 3 tamamlandiginda alarmNavigation.ts'deki import buraya yonlendirilecek.
 */

import type { Medicine, ReminderTime } from '../../types';

/**
 * 3-parametreli snooze ID — notifications.ts uyumlulugu icin
 */
export function buildSnoozeNotificationId(
  medicineId: string,
  reminderTimeId: string,
  snoozeId: string
): string {
  return `snooze-${medicineId}-${reminderTimeId}-${snoozeId}`;
}

/**
 * 2-parametreli snooze ID — alarmNavigation.ts gibi snoozeId bilinmediğinde
 * kullanılır. Aynı medicine+reminder icin tek bir snooze ID uretilir
 * (cancelled/created durumlarinda deterministik davranis korunur).
 */
export function getSnoozeNotificationId(medicineId: string, reminderTimeId: string): string {
  return `snooze-${medicineId}-${reminderTimeId}`;
}

/**
 * 2-parametreli alarm ID — medicineId + reminderTimeId
 */
export function getAlarmNotificationId(medicineId: string, reminderTimeId: string): string {
  return `alarm-${medicineId}-${reminderTimeId}`;
}

/**
 * 3-parametreli alarm ID — medicine + reminderTime object'leri
 */
export function buildAlarmNotificationId(
  medicine: Pick<Medicine, 'id'>,
  reminderTime: Pick<ReminderTime, 'id'>
): string {
  return `alarm-${medicine.id}-${reminderTime.id}`;
}

export function isAlarmNotificationId(notificationId?: string): boolean {
  return !!notificationId?.startsWith('alarm-');
}

export function isSnoozeNotificationId(notificationId?: string): boolean {
  return !!notificationId?.startsWith('snooze-');
}

export function belongsToMedicine(notificationId: string | undefined, medicineId: string): boolean {
  return (
    !!notificationId &&
    (notificationId.startsWith(`alarm-${medicineId}-`) ||
      notificationId.startsWith(`snooze-${medicineId}-`))
  );
}

export function extractDisplayedMedicineId(
  notification: { notification?: { data?: Record<string, unknown> } } | undefined
): string | undefined {
  const medicineId = notification?.notification?.data?.medicineId;
  return typeof medicineId === 'string' ? medicineId : undefined;
}
