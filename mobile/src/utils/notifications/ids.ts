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

export interface AlarmNotificationTarget {
  medicineId: string;
  reminderTimeId: string;
}

/** Test alarmının sabit kimlik çifti. */
export const TEST_ALARM_TARGET: AlarmNotificationTarget = {
  medicineId: 'test-medicine',
  reminderTimeId: 'test-reminder',
};

/**
 * `alarm-<medicineId>-<reminderTimeId>` bildirim id'sini GERİ ÇÖZÜMLE.
 *
 * ⚠️ DİKKAT: Bu id tire ile BÖLÜNEREK çözümlenemez — hem medicineId (UUID) hem
 * reminderTimeId tire içerir. Eskiden `cancel.ts` içinde
 * `notificationId.split('-')[1]` kullanılıyordu:
 *
 *   alarm-01a057f1-3ae0-7679-9383-9b68f7198b59-...  → medicineId = "01a057f1"  ❌
 *   alarm-test-medicine-test-reminder               → medicineId = "test"      ❌
 *
 * Sonuç: `AlarmModule.cancelNativeAlarm` ve `cancelAlarmNotification` yanlış
 * requestCode ile çağrılıyor, ne AlarmManager alarmı ne tam ekran taşıyıcı
 * bildirim iptal ediliyordu (cihaz logcat'iyle doğrulandı).
 *
 * Doğru yol: bilinen kimliklerle eşleştirmek. Eşleşme bulunamazsa `null`
 * döner — YANLIŞ kimlikle native iptal asla çağrılmaz.
 */
export function parseAlarmNotificationId(
  notificationId: string,
  known: { medicineIds?: string[]; reminderTimeIds?: string[] } = {}
): AlarmNotificationTarget | null {
  // v1.7.1: `snooze-` kimlikleri de çözümlenir. Erteleme de native alarm
  // kuruyor; iptal yolunda kimliklerin çözümlenmesi gerekiyor (aksi halde
  // iptal edilen erteleme arkasında ARMED bir alarm bırakıyordu).
  //
  // Erteleme id'si iki biçimde olabilir:
  //   snooze-<medicineId>-<reminderTimeId>              (2 parametreli)
  //   snooze-<medicineId>-<reminderTimeId>-<snoozeId>   (3 parametreli)
  // Bu yüzden gövdeden önce bilinen reminderTimeId eşleşmesi denenir; 2. turda
  // kalan kısım snoozeId içerebileceği için ilk segment alınır.
  const isSnooze = isSnoozeNotificationId(notificationId);
  if (!isAlarmNotificationId(notificationId) && !isSnooze) return null;

  const prefixLength = isSnooze ? 'snooze-'.length : 'alarm-'.length;
  const body = notificationId.slice(prefixLength);
  if (!body) return null;

  if (body === `${TEST_ALARM_TARGET.medicineId}-${TEST_ALARM_TARGET.reminderTimeId}`) {
    return { ...TEST_ALARM_TARGET };
  }

  const medicineIds = known.medicineIds ?? [];
  const reminderTimeIds = known.reminderTimeIds ?? [];

  // Kısa bir id, uzun bir id'nin öneki olabilir → en uzun eşleşme önce.
  const candidates = [...medicineIds].sort((a, b) => b.length - a.length);
  const reminderCandidates = [...reminderTimeIds].sort((a, b) => b.length - a.length);

  // 1. Tur: hem ilaç hem hatırlatma kimliği biliniyor (en güvenli).
  for (const medicineId of candidates) {
    const prefix = `${medicineId}-`;
    if (!body.startsWith(prefix)) continue;
    const rest = body.slice(prefix.length);
    if (!rest) continue;

    // Tam eşleşme: `alarm-<med>-<rt>` veya 2 parametreli `snooze-<med>-<rt>`.
    if (reminderTimeIds.includes(rest)) {
      return { medicineId, reminderTimeId: rest };
    }

    // 3 parametreli erteleme: `snooze-<med>-<rt>-<snoozeId>`. Kalanin
    // BASINDA bilinen bir reminderTimeId varsa snoozeId kuyrugu atilir.
    if (isSnooze) {
      for (const reminderTimeId of reminderCandidates) {
        if (rest.startsWith(`${reminderTimeId}-`)) {
          return { medicineId, reminderTimeId };
        }
      }
    }
  }

  // 2. Tur: hatırlatma silinmiş olabilir; ilaç kimliği öneki tek başına da
  // kesin bir eşleşmedir (kalan kısım boş değilse).
  //
  // ⚠️ ERTELEME KİMLİKLERİ BU TURA GİRMEZ: `snooze-<med>-<rt>-<snoozeId>`
  // biçiminde reminderTimeId'nin nerede bittiği bilinemez (hem rt hem snoozeId
  // tire içerir). Kalanın tamamını reminderTimeId saymak native iptali YANLIŞ
  // requestCode ile çağırır — hiç iptal etmemekten daha kötüsü, başka bir
  // alarmı düşürebilir. Bu yüzden çözülemeyen erteleme kimliği `null` döner ve
  // çağıran taraf (bkz. `cancel.ts`) uyarı loglar.
  for (const medicineId of candidates) {
    const prefix = `${medicineId}-`;
    if (!body.startsWith(prefix)) continue;
    const reminderTimeId = body.slice(prefix.length);
    if (reminderTimeId && !isSnooze) {
      return { medicineId, reminderTimeId };
    }
  }

  return null;
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
