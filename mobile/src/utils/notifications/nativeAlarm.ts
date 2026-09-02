/**
 * `AlarmModule` (native) için TEK KÖPRÜ.
 *
 * Neden bir köprü: React Native'in Android bridge'i argüman sayısını KATI
 * doğrular. `AlarmModule` metodlarına v1.7.1'de `alarmKind` parametresi
 * eklendi; çağrılar kodun içine dağılmış olsaydı bir tanesini güncellemeyi
 * atlamak çalışma zamanında "Got 3 arguments, expected 4" hatası verirdi.
 * Artık native imza tek yerden besleniyor.
 *
 * ── Neden `alarmKind` gerekti ─────────────────────────────────────────────
 * `AlarmModule` requestCode'u `(medicineId, reminderTimeId)` çiftinin
 * hash'inden türetiyor. Erteleme (snooze) alarmı da AYNI çifti kullandığı için
 * `PendingIntent.getBroadcast` mevcut PendingIntent'i DEĞİŞTİRİYORDU:
 *
 *   - 5 dakikalık bir erteleme kurmak, aynı hatırlatmanın bir sonraki günkü
 *     native alarmını SİLİYORDU (bildirim kalıyor, kilit ekranı uyandırması
 *     kayboluyordu).
 *   - `cancelNativeAlarm` hangisini iptal ettiğini ayırt edemiyordu.
 *   - `cancel.ts` snooze kimliklerini native iptal yoluna hiç sokmuyordu →
 *     iptal edilen bir erteleme arkasında ARMED bir native alarm bırakıyordu
 *     (hayalet tam ekran alarm).
 *
 * Kotlin tarafı `kind`i requestCode'a tuz olarak katıyor
 * (`AlarmReceiver.buildNotificationId`), böylece ana alarm ile erteleme
 * birbirinden bağımsız PendingIntent/bildirim uzaylarında yaşıyor.
 * Ana alarm için üretilen değer eskisiyle AYNI kalır (geriye dönük uyum).
 */

import { createScopedLogger } from '../logger';
import type { AlarmNotificationTarget } from './ids';

const log = createScopedLogger('NativeAlarm');

/** Kotlin `AlarmReceiver.KIND_MAIN` / `KIND_SNOOZE` ile AYNI olmalı. */
export const ALARM_KIND_MAIN = 'main';
export const ALARM_KIND_SNOOZE = 'snooze';

export type NativeAlarmKind = typeof ALARM_KIND_MAIN | typeof ALARM_KIND_SNOOZE;

interface AlarmModuleShape {
  scheduleNativeAlarm?: (
    triggerAtMs: number,
    medicineId: string,
    reminderTimeId: string,
    alarmKind: NativeAlarmKind
  ) => Promise<boolean>;
  cancelNativeAlarm?: (
    medicineId: string,
    reminderTimeId: string,
    alarmKind: NativeAlarmKind
  ) => Promise<boolean>;
  cancelAlarmNotification?: (
    medicineId: string,
    reminderTimeId: string,
    alarmKind: NativeAlarmKind
  ) => Promise<boolean>;
}

/**
 * LAZY REQUIRE bilinçli: bu modül notifee/alarm zincirinden import ediliyor ve
 * `NativeModules` erişimi modül yüklenirken test ortamında patlıyor.
 */
function getAlarmModule(): AlarmModuleShape | undefined {
  try {
    const { NativeModules } = require('react-native');
    return NativeModules?.AlarmModule as AlarmModuleShape | undefined;
  } catch (error) {
    log.debug('AlarmModule okunamadi', { error: String(error) });
    return undefined;
  }
}

/** AlarmManager üzerinden kilit ekranını uyandıran native alarm kur. */
export async function scheduleNativeAlarm(
  triggerAtMs: number,
  target: AlarmNotificationTarget,
  kind: NativeAlarmKind = ALARM_KIND_MAIN
): Promise<boolean> {
  const alarmModule = getAlarmModule();
  if (!alarmModule?.scheduleNativeAlarm) return false;

  try {
    await alarmModule.scheduleNativeAlarm(
      triggerAtMs,
      target.medicineId,
      target.reminderTimeId,
      kind
    );
    log.debug('Native alarm kuruldu', { ...target, kind });
    return true;
  } catch (error) {
    log.debug('Native alarm kurulamadi', { ...target, kind, error: String(error) });
    return false;
  }
}

/** AlarmManager'daki alarmı iptal et. */
export async function cancelNativeAlarm(
  target: AlarmNotificationTarget,
  kind: NativeAlarmKind = ALARM_KIND_MAIN
): Promise<boolean> {
  const alarmModule = getAlarmModule();
  if (!alarmModule?.cancelNativeAlarm) return false;

  try {
    await alarmModule.cancelNativeAlarm(target.medicineId, target.reminderTimeId, kind);
    return true;
  } catch (error) {
    log.debug('Native alarm iptal edilemedi', { ...target, kind, error: String(error) });
    return false;
  }
}

/**
 * `AlarmReceiver`ın attığı tam ekran taşıyıcı bildirimi iptal et.
 * Integer id ile atıldığı için notifee onu görmez.
 */
export async function cancelNativeAlarmNotification(
  target: AlarmNotificationTarget,
  kind: NativeAlarmKind = ALARM_KIND_MAIN
): Promise<boolean> {
  const alarmModule = getAlarmModule();
  if (!alarmModule?.cancelAlarmNotification) return false;

  try {
    await alarmModule.cancelAlarmNotification(target.medicineId, target.reminderTimeId, kind);
    return true;
  } catch (error) {
    log.debug('Native alarm bildirimi iptal edilemedi', {
      ...target,
      kind,
      error: String(error),
    });
    return false;
  }
}

/** Bir alarma bağlı TÜM native kaynakları iptal et (alarm + taşıyıcı bildirim). */
export async function cancelNativeAlarmResources(
  target: AlarmNotificationTarget,
  kind: NativeAlarmKind = ALARM_KIND_MAIN
): Promise<void> {
  await cancelNativeAlarm(target, kind);
  await cancelNativeAlarmNotification(target, kind);
}
