/**
 * Notifications — cancel module.
 *
 * Notification iptal operasyonlari: tek bildirim, ilaca ait tum bildirimler,
 * orphan cleanup. Sprint 3 (notifications.ts modular).
 */

import notifee from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import {
  belongsToMedicine,
  isAlarmNotificationId,
  isSnoozeNotificationId,
  extractDisplayedMedicineId,
} from './ids';

const log = createScopedLogger('NotificationCancel');

/**
 * Tek bir bildirimi iptal et
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await notifee.cancelNotification(notificationId);
  } catch (error) {
    log.error('Bildirim iptal edilirken hata', error);
  }
}

/**
 * Belirli bir ilaca ait TUM bildirimleri iptal et.
 * Ilac silindiginde cagrilmali — phantom notification'lar engellenir.
 */
export async function cancelMedicineNotifications(medicineId: string): Promise<void> {
  try {
    const triggerIds = await notifee.getTriggerNotificationIds();
    const medicineNotificationIds = triggerIds.filter(id => belongsToMedicine(id, medicineId));

    for (const notifId of medicineNotificationIds) {
      await notifee.cancelNotification(notifId);
      log.debug('Ilac bildirimi iptal edildi', { notifId, medicineId });
    }

    const displayedNotifications = await notifee.getDisplayedNotifications();
    for (const notif of displayedNotifications) {
      const displayedMedicineId = extractDisplayedMedicineId(notif);
      if (
        notif.id &&
        (displayedMedicineId === medicineId || belongsToMedicine(notif.id, medicineId))
      ) {
        await notifee.cancelDisplayedNotification(notif.id);
        log.debug('Goruntulen bildirim iptal edildi', { notifId: notif.id, medicineId });
      }
    }

    log.debug('Ilaca ait tum bildirimler iptal edildi', {
      medicineId,
      cancelledCount: medicineNotificationIds.length,
    });
  } catch (error) {
    log.error('Ilac bildirimleri iptal edilirken hata', error);
  }
}

/**
 * Yetim (orphan) bildirimleri temizle.
 * Gecerli ilac ID'leri ile eslesmeyenleri iptal eder.
 * Uygulama acilisinda cagrilmali.
 */
export async function cleanupOrphanNotifications(validMedicineIds: string[]): Promise<number> {
  try {
    // Test alarmi her zaman gecerli kabul edilir
    const validIds = new Set([...validMedicineIds, 'test-medicine']);
    const validMedicineIdList = Array.from(validIds);

    const triggerIds = await notifee.getTriggerNotificationIds();
    let cancelledCount = 0;

    for (const triggerId of triggerIds) {
      const isKnownMedicine = validMedicineIdList.some(medicineId =>
        belongsToMedicine(triggerId, medicineId)
      );

      // Legacy snooze ID'leri medicineId icermeyebilir; yanlis pozitif silmeyi onlemek icin atla.
      if (isAlarmNotificationId(triggerId) && !isKnownMedicine) {
        await notifee.cancelNotification(triggerId);
        cancelledCount++;
        log.debug('Yetim alarm bildirimi iptal edildi', { triggerId });
      } else if (isSnoozeNotificationId(triggerId) && !isKnownMedicine) {
        log.debug('MedicineId cozumlenemeyen snooze trigger atlandi', { triggerId });
      }
    }

    // Goruntulenen bildirimleri de kontrol et
    const displayedNotifications = await notifee.getDisplayedNotifications();
    for (const notif of displayedNotifications) {
      if (!notif.id) continue;

      const medicineId = extractDisplayedMedicineId(notif);
      const isKnownMedicine =
        (medicineId && validIds.has(medicineId)) ||
        validMedicineIdList.some(validMedicineId => belongsToMedicine(notif.id, validMedicineId));

      if (
        (isAlarmNotificationId(notif.id) || isSnoozeNotificationId(notif.id)) &&
        !isKnownMedicine
      ) {
        await notifee.cancelDisplayedNotification(notif.id);
        cancelledCount++;
        log.debug('Goruntulen yetim bildirim iptal edildi', { notifId: notif.id, medicineId });
      }
    }

    if (cancelledCount > 0) {
      log.debug('Yetim bildirim temizligi tamamlandi', {
        cancelledCount,
        validMedicineCount: validMedicineIds.length,
      });
    }

    return cancelledCount;
  } catch (error) {
    log.error('Yetim bildirim temizligi sirasinda hata', error);
    return 0;
  }
}
