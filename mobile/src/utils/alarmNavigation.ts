/**
 * Alarm navigation helper'ları — notifications.ts ve App.tsx tarafından paylaşılır.
 *
 * Amaç: Aynı ilaç+saat için alarm key üretmek (dedup kontrolü için) ve
 * alarm navigation yaşam döngüsünü yönetmek.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import type { Medicine, MedicineLog, ReminderTime, Snooze } from '../types';
// "Bu doz bugun zaten alindi mi?" kararinin TEK KAYNAGI (bkz. dosya basi
// aciklamasi: domain/doseLog.ts).
import { isDoseLogged } from '../domain/doseLog';
// Alarm giris tekillestirmesinin TEK KAYNAGI. Anahtar duvar saati ICERMEZ;
// gerekce: notifications/alarmDedup.ts dosya basi.
import { buildAlarmDedupKey } from './notifications/alarmDedup';
import {
  getAlarmNotificationId,
  getSnoozeNotificationId,
  buildSnoozeNotificationId as buildSnoozeNotificationIdWithSnoozeId,
} from './notifications/ids';

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
  /**
   * ⚠️ v1.7.4 — `medicineId` ve gercek `status` union'i ARTIK TIPTE.
   * Eski tip bu iki alani icermiyordu; kod ise `(log as any).medicineId`
   * cast'i ile okuyordu. Bu yuzden testlerdeki fixture'lar `medicineId`
   * icermiyor, "farkli reminderTimeId -> false" iddiasi yanlis pozitif
   * geciyor ve cok dozlu ilac hatasi (bkz. domain/doseLog.ts) test suitinden
   * gizli kaliyordu. Tip artik gercekle ayni.
   */
  medicineLogs: Array<
    Pick<MedicineLog, 'medicineId' | 'reminderTimeId' | 'scheduledTime' | 'status'>
  >;
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
  /**
   * v1.7.1: Ekrani ACAN alarmin turu. AlarmScreen bunu bilmeden native iptal
   * yapamaz — erteleme alarmi ayri bir requestCode/bildirim uzayinda yasiyor.
   */
  isSnooze?: boolean;
  snoozeId?: string;
}

export interface AlarmNavigationDependencies {
  now?: () => Date;
  isAlarmHandled: (alarmKey: string) => Promise<boolean> | boolean;
  /**
   * v1.7.4 — KESİN yinelenme kontrolü: bu doz için alarm ekranı ŞU AN açık mı?
   * Zaman penceresine dayanan `activeAlarmKeys` kontrolünün üstüne konur;
   * navigasyon durumu gerçeği söyler, saat aritmetiği söylemiyordu.
   * Verilmezse (eski çağıranlar / testler) kontrol atlanır.
   */
  isAlarmScreenOpenFor?: (data: AlarmNavigationData) => boolean;
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

/**
 * Bu çalmanın tekilleştirme anahtarı.
 *
 * ⚠️ v1.7.4 — `now` ARTIK ANAHTARA GİRMİYOR.
 * Eskiden anahtar `...::${format(now,'yyyy-MM-dd-HH-mm')}` idi. `now` girişin
 * İŞLENDİĞİ andır; aynı çalmanın yolları saniyeler ayrı geldiği için çalma bir
 * dakikanın son saniyelerine denk gelince iki yol İKİ FARKLI anahtar üretiyor
 * ve alarm ekranı üst üste iki kez açılıyordu (sahadan kanıt: durum çubuğu
 * 00:34, alarm ekranı 00:33). Tam gerekçe: notifications/alarmDedup.ts.
 *
 * `now` parametresi imzada KALDI: çağıranların hepsi zaten geçiriyor ve
 * ileride pencere hesabı gerekirse buradan akacak.
 */
export function getAlarmKey(data: AlarmNavigationData, _now?: Date): string {
  return buildAlarmDedupKey({
    medicineId: data.medicineId,
    reminderTimeId: data.reminderTimeId,
    isSnooze: data.isSnooze,
    snoozeId: data.snoozeId,
  });
}

/**
 * Bu alarm verisine karsilik gelen notifee bildirim kimligi.
 *
 * ⚠️ v1.7.1 DUZELTMESI: erteleme icin 2 parametreli `snooze-<med>-<rt>`
 * uretiliyordu. Ama `scheduleSnoozeNotification` (ve boot geri yuklemesi)
 * bildirimi 3 parametreli `snooze-<med>-<rt>-<snoozeId>` kimligiyle olusturuyor.
 * Sonuc: `dismissCurrentNotification` var olmayan bir kimligi iptal ediyordu →
 * erteleme bildirimi ekranda kaliyordu.
 */
export function getNotificationIdForAlarmData(data: AlarmNavigationData): string | null {
  if (data.isSnooze === 'true' && data.snoozeId) {
    return buildSnoozeNotificationIdWithSnoozeId(
      data.medicineId,
      data.reminderTimeId,
      data.snoozeId
    );
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
  if (data.medicineId === 'test-medicine') return false;
  // ⚠️ v1.7.4 — karar `domain/doseLog.ts`e tasindi. Eskiden burada
  // `reminderTimeId || medicineId` OR'u vardi: `medicineId` her logda dolu
  // oldugu icin ilacin GUNUN HERHANGI BIR dozu kaydedilince bu fonksiyon
  // true donuyor, `handleIncomingAlarmNavigation` alarmi 'dismissed'
  // sayiyordu. Gunde 2+ doz alan kullanicilar yalnizca ilk dozun alarmini
  // aliyordu. Ayrica dize oneki karsilastirmasi `scheduledTime`in uc
  // formatindan (UTC-Z / saat dilimsiz / epoch-ms) yalnizca birinde
  // dogru calisiyordu.
  return isDoseLogged(
    medicineLogs || [],
    { reminderTimeId: data.reminderTimeId, medicineId: data.medicineId },
    now
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

  // ── Yinelenme koruması (test alarmları DAHİL) ───────────────────────────
  // Tek bir çalma için 5 ayrı giriş yolu var (AlarmReceiver emit,
  // MainActivity.handleAlarmIntent emit, notifee DELIVERED, Linking url,
  // getInitialAlarm). İki kademeli kontrol edilir:
  //
  //   1. KESİN: alarm ekranı bu doz için ŞU AN açık mı? Navigasyon durumu
  //      gerçeği söyler ve zaman penceresine hiç bağlı değildir.
  //   2. PENCERE: ekran açılmak üzere olabilir (navigasyon asenkron), o yüzden
  //      "az önce bu doz için ekran açtık" kaydına da bakılır.
  //
  // v1.7.4'e kadar yalnızca (2) vardı ve anahtarı duvar saati dakikası
  // içerdiği için çalma dakika sınırına denk geldiğinde tutmuyordu; ekran
  // üst üste iki kez açılıyordu (bkz. notifications/alarmDedup.ts).
  if (dependencies.isAlarmScreenOpenFor?.(data)) {
    dependencies.logger.debug('Alarm ekrani bu doz icin zaten acik, yinelenme atlandi', {
      alarmKey,
      isTestMode,
    });
    return 'duplicate';
  }

  if (dependencies.activeAlarmKeys.has(alarmKey)) {
    dependencies.logger.debug('Alarm already active on screen, skipping duplicate', {
      alarmKey,
      isTestMode,
    });
    return 'duplicate';
  }

  if (!isTestMode) {
    let medicine = dependencies.storeState.getMedicineById(data.medicineId);

    if (!medicine) {
      // Fallback: Zustand store henüz AsyncStorage'dan hydrate olmamış olabilir (cold start)
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_STORAGE);
        if (raw) {
          const parsed = JSON.parse(raw);
          const list: Medicine[] = parsed?.state?.medicines || [];
          medicine = list.find(m => m.id === data.medicineId);
        }
      } catch (_e) {
        /* ignore */
      }
    }

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

    // Premature Alarm Guard (Erken Alarm Koruması):
    // Alarm saatine 15 dakikadan daha fazla süre varsa (örneğin 3 saat sonraki bir dozsa),
    // sistem/intent veya sahte tetiklemeyi reddet ve çalmasını engelle.
    if (reminderTime && !isSnooze) {
      const [hh, mm] = reminderTime.time.split(':').map(Number);
      const scheduledToday = new Date(now);
      scheduledToday.setHours(hh, mm, 0, 0);

      const diffMs = scheduledToday.getTime() - now.getTime();
      const diffMinutes = diffMs / (60 * 1000);

      // Eğer alarm saati gelecekte ve 15 dakikadan daha uzaktaysa sahte tetiklemeyi engelle
      if (diffMinutes > 15) {
        dependencies.logger.warn('Alarm: premature trigger rejected (scheduled in future)', {
          medicineId: data.medicineId,
          reminderTime: reminderTime.time,
          diffMinutes: Math.round(diffMinutes),
          scheduledTime: data.scheduledTime,
        });
        await dismissCurrentNotification(data, dependencies);
        return 'dismissed';
      }
    }

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
    // Ekranin native iptal yolunu dogru requestCode uzayina yonlendirebilmesi
    // icin alarm turu ve erteleme kimligi TASINIR.
    isSnooze: isSnooze || undefined,
    snoozeId: isSnooze ? data.snoozeId : undefined,
  });

  await dismissCurrentNotification(data, dependencies);
  return 'navigated';
}
