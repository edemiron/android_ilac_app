/**
 * Notifications - diagnostics module.
 *
 * Notification diagnostics, drift analysis, snapshot type definitions.
 * Sprint 3 (notifications.ts modular).
 */

import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import { isMIUIDevice } from '../miuiHelper';
import { resolveNotificationBehavior } from './behavior';
import { getAlarmNotificationId, buildSnoozeNotificationId } from './ids';
// Gun kurallarinin (scheduleType / specificDays / intervalDays / cycle / endDate)
// TEK KAYNAGI. Bu dosya eskiden bu fonksiyonu HIC cagirmiyordu — bkz.
// `resolveReminderTriggerDate` uzerindeki aciklama.
import { isMedicineScheduledForDate } from '../timeCalculator';
import type { Medicine, ReminderTime, Snooze, UserSettings } from '../../types';

const log = createScopedLogger('NotificationDiagnostics');

/**
 * Notifee docs Android'da 50 aktif timestamp-trigger siniri var.
 * MIUI exact/full-screen alarm flows introspection ile under-report edebilir.
 */
export const ANDROID_TRIGGER_INTROSPECTION_LIMIT = 50;

export interface NotificationStateSnapshot {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  snoozes: Snooze[];
  settings: UserSettings;
}

export interface ExpectedNotificationSnapshot {
  id: string;
  type: 'alarm' | 'snooze';
  medicineId: string;
  medicineName: string;
  reminderTimeId: string;
  reminderTime: string;
  triggerTimestamp: number;
  scheduledTime: string;
  channelId: string;
  fullScreenAlarm: boolean;
  quietHoursActive: boolean;
  storedNotificationId?: string;
}

export interface ScheduledNotificationSnapshot {
  id: string;
  type: 'alarm' | 'snooze';
  medicineId?: string;
  medicineName?: string;
  reminderTimeId?: string;
  scheduledTime?: string;
  triggerTimestamp?: number;
  channelId?: string;
  fullScreenAlarm?: boolean;
  quietHoursActive?: boolean;
  isDisplayed?: boolean;
}

export interface NotificationDriftReport {
  expectedNotifications: ExpectedNotificationSnapshot[];
  scheduledNotifications: ScheduledNotificationSnapshot[];
  missingNotificationIds: string[];
  configDriftIds: string[];
  orphanTriggerIds: string[];
  legacySnoozeNotificationIds: string[];
  hasDrift: boolean;
}

export interface NotificationDiagnosticsSnapshot {
  evaluatedAt: string;
  counts: {
    activeMedicines: number;
    enabledReminderTimes: number;
    activeSnoozes: number;
    expectedNotifications: number;
    scheduledNotifications: number;
    displayedNotifications: number;
  };
  settingsSummary: {
    alarmModeEnabled: boolean;
    vibrationEnabled: boolean;
    fullScreenAlarmEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    snoozeDuration: number;
    maxSnoozeCount: number;
  };
  report: NotificationDriftReport;
}

/**
 * Smoke trigger date (gelistirme/test icin).
 * Eger reminderTime.smokeTriggerTime gecmiste veya tanimsizsa null doner.
 */
function resolveSmokeTriggerDate(
  reminderTime: ReminderTime & { smokeTriggerTime?: string },
  referenceNow: Date
): Date | null {
  if (!reminderTime.smokeTriggerTime) return null;
  const triggerDate = new Date(reminderTime.smokeTriggerTime);
  if (Number.isNaN(triggerDate.getTime())) return null;
  return triggerDate.getTime() > referenceNow.getTime() ? triggerDate : null;
}

/**
 * "HH:mm" formatli reminderTime.time -> bugunun (veya gecmisse yarin) o saatindeki Date.
 * Notifee minimum 5 sn gelecek zaman gerektirir; cikti 5 sn oncesine cekilir.
 */
function resolveReminderTimeOfDay(
  time: string,
  referenceNow: Date,
  forceNextDay: boolean = false
): Date {
  const [hh, mm] = time.split(':').map(Number);
  const target = new Date(referenceNow);
  target.setHours(hh, mm, 0, 0);
  // Bugunku saat gectiyse yarin ayni saate kur
  if (target.getTime() <= referenceNow.getTime()) {
    target.setDate(target.getDate() + 1);
  } else if (forceNextDay) {
    // ⚠️ v1.7.6 — DOZ ALINDIKTAN SONRAKI YENIDEN PLANLAMA.
    // `processTake` dozu isaretledikten sonra bu hatirlatmayi yeniden kuruyor.
    // Kullanici dozu SAATINDEN ONCE aldiysa ("Erken Al", 18:00'de alinan 20:00
    // dozu) bugunun saati henuz gecmemis oluyor ve alarm AYNI GUN, AYNI DOZ
    // icin yeniden kuruluyordu — yani alinmis doz aksam tekrar caliyordu.
    // Alinmis bir dozun sonraki calmasi tanim geregi YARINDIR.
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/**
 * Notifee timestamp-trigger kabul etmedigi minimum gelecek zaman (ms).
 * Android SchedulerService aninda gelen trigger'i drop edebiliyor.
 */
const MIN_FUTURE_BUFFER_MS = 5_000;

/**
 * Notification trigger time hesapla.
 * Oncelik:
 *  1. bypassBuffer=false ve smokeTriggerTime gecerli + gelecekte ise smoke kullan (test/dev)
 *  2. Yoksa reminderTime.time (HH:mm) parse et, bugun (veya gecmisse yarin) o saatine kur
 *  3. Notifee minimum gelecek zaman garantisi (5 sn)
 */
/**
 * Gun kurallari tarandiginda en fazla kac gun ileriye bakilir.
 *
 * En uzun mesru dongu 21+7 = 28 gun; `intervalDays` teorik olarak daha buyuk
 * olabilir. 400 gun bir yillik dongu + emniyet payi demek. Bu sinir asilirsa
 * "planlanacak gun yok" kabul edilir — sonsuz donguye girmek yerine.
 */
const MAX_SCHEDULE_LOOKAHEAD_DAYS = 400;

/**
 * Notification trigger time hesapla.
 *
 * ⚠️ v1.7.7 — GUN KURALLARI ARTIK BURADA UYGULANIYOR.
 * ══════════════════════════════════════════════════════════════════════════
 * Bu fonksiyon yalnizca `reminderTime.time` ("HH:mm") bakiyordu ve alarmi HER
 * GUN o saate kuruyordu. `isMedicineScheduledForDate` (timeCalculator) —
 * `scheduleType`, `specificDays`, `intervalDays`, `cycle` ve `endDate`
 * kurallarinin dogru yazilmis TEK KAYNAGI — bu yoldan HIC cagrilmiyordu.
 * Yalnizca ekranlar (HomeScreen, StatisticsScreen) ve kullanilmayan
 * `rollingHorizonScheduler` onu cagiriyordu.
 *
 * Sonuc, bir ilac uygulamasi icin kabul edilemez bir klinik hataydi:
 *   - `specific_days: [1,3,5]` (Pzt/Car/Cum) ilac HER GUN alarm veriyordu;
 *     hasta almamasi gereken gunlerde "ilac vakti" uyarisi aliyordu.
 *   - `endDate` gecmis (tedavi bitmis) ilac calmaya DEVAM ediyordu.
 *   - `interval_days: 2` (gun asiri) her gun caliyordu.
 *   - `cycle` (orn. 21 gun kullan / 7 gun ara) ARA HAFTASINDA da caliyordu.
 *
 * Alarmi kuran ana yol `scheduleMedicineNotification` ve o da
 * `reRegisterAllAlarms` (her acilis, her yeniden baslatma) tarafindan her
 * etkin hatirlatma icin kosulsuz cagriliyor. Yani hata her kullanicida her
 * gun tekrar uretiliyordu.
 *
 * Artik: aday gun hesaplandiktan sonra ilacin O GUN planli olup olmadigi
 * kontrol edilir; planli degilse bir sonraki planli gune atlanir. Hic planli
 * gun yoksa (tedavi bitti) `null` doner ve cagiran alarm KURMAZ.
 *
 * `medicine` verilmezse gun kurallari uygulanmaz (geriye uyumluluk: tanilama
 * yardimcilari yalnizca saat hesabi icin cagiriyor).
 */
export function resolveReminderTriggerDate(
  reminderTime: ReminderTime & { smokeTriggerTime?: string },
  bypassBuffer: boolean = false,
  referenceNow: Date = new Date(),
  /**
   * Bugunun saati henuz gecmemis olsa bile YARINA kur.
   * Doz alindiktan/atlandiktan sonraki yeniden planlama icin — bkz.
   * `resolveReminderTimeOfDay` icindeki gerekce.
   */
  forceNextDay: boolean = false,
  /** Gun kurallari icin. Verilmezse yalnizca saat hesabi yapilir. */
  medicine?: Medicine
): Date | null {
  if (!bypassBuffer) {
    const smoke = resolveSmokeTriggerDate(reminderTime, referenceNow);
    if (smoke) return smoke;
  }

  const target = resolveReminderTimeOfDay(reminderTime.time, referenceNow, forceNextDay);

  if (medicine) {
    // Tedavi bitmisse 400 gun taramanin anlami yok.
    if (medicine.endDate) {
      const endDay = new Date(medicine.endDate);
      endDay.setHours(23, 59, 59, 999);
      if (target.getTime() > endDay.getTime()) return null;
    }

    let daysAdvanced = 0;
    while (!isMedicineScheduledForDate(medicine, target)) {
      target.setDate(target.getDate() + 1);
      daysAdvanced += 1;

      if (medicine.endDate) {
        const endDay = new Date(medicine.endDate);
        endDay.setHours(23, 59, 59, 999);
        if (target.getTime() > endDay.getTime()) return null;
      }
      if (daysAdvanced > MAX_SCHEDULE_LOOKAHEAD_DAYS) return null;
    }
  }

  const minTime = referenceNow.getTime() + MIN_FUTURE_BUFFER_MS;
  if (target.getTime() < minTime) {
    target.setTime(minTime);
  }

  return target;
}

/**
 * Boolean degeri normalize et: 'true'/'false' string'lerini boolean'a cevir.
 */
function normalizeBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return undefined;
}

/**
 * Notifee notification kaydindan ID'yi cikar.
 * Hem top-level hem de notification wrapper icindeki id'yi kontrol eder.
 */
function extractNotificationId(record: unknown): string | undefined {
  if (!record || typeof record !== 'object') return undefined;
  const topLevel = record as { id?: unknown; notification?: { id?: unknown } };
  if (typeof topLevel.id === 'string') return topLevel.id;
  return typeof topLevel.notification?.id === 'string' ? topLevel.notification.id : undefined;
}

/**
 * Notifee trigger notification raw kaydini ScheduledNotificationSnapshot'a
 * donusturur. Gecersiz kayitlarda null doner.
 */
function normalizeScheduledNotification(raw: unknown): ScheduledNotificationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as {
    notification?: {
      id?: string;
      data?: Record<string, unknown>;
      android?: { channelId?: string; fullScreenAction?: unknown };
    };
    trigger?: { timestamp?: number };
  };
  const id = candidate.notification?.id;
  if (!id) return null;
  const data = candidate.notification?.data ?? {};
  const fullScreenFromData = normalizeBooleanFlag(data.fullScreenAlarm);
  const fullScreenAlarm = fullScreenFromData ?? !!candidate.notification?.android?.fullScreenAction;
  return {
    id,
    type: id.startsWith('snooze-') ? 'snooze' : 'alarm',
    medicineId: typeof data.medicineId === 'string' ? data.medicineId : undefined,
    reminderTimeId: typeof data.reminderTimeId === 'string' ? data.reminderTimeId : undefined,
    scheduledTime: typeof data.scheduledTime === 'string' ? data.scheduledTime : undefined,
    triggerTimestamp:
      typeof candidate.trigger?.timestamp === 'number' ? candidate.trigger.timestamp : undefined,
    channelId: candidate.notification?.android?.channelId,
    fullScreenAlarm,
    quietHoursActive: normalizeBooleanFlag(data.quietHoursActive),
  };
}

/**
 * Scheduled notification, expected snapshot'tan drifted mi kontrol et.
 * channelId, fullScreenAlarm, quietHoursActive, triggerTimestamp tutarsizlik.
 */
function isNotificationConfigDrifted(
  expected: ExpectedNotificationSnapshot,
  scheduled: ScheduledNotificationSnapshot
): boolean {
  if (scheduled.channelId && scheduled.channelId !== expected.channelId) return true;
  if (
    scheduled.fullScreenAlarm !== undefined &&
    scheduled.fullScreenAlarm !== expected.fullScreenAlarm
  )
    return true;
  if (
    scheduled.quietHoursActive !== undefined &&
    scheduled.quietHoursActive !== expected.quietHoursActive
  )
    return true;
  if (
    scheduled.triggerTimestamp !== undefined &&
    Math.abs(scheduled.triggerTimestamp - expected.triggerTimestamp) > 1000
  )
    return true;
  return false;
}

/**
 * Beklenen notification'lari olustur: her aktif medicine + reminder icin
 * 'alarm' snapshot, her aktif snooze icin 'snooze' snapshot.
 */
function buildExpectedNotifications(
  state: NotificationStateSnapshot,
  referenceNow: Date = new Date()
): ExpectedNotificationSnapshot[] {
  const activeMedicines = new Map(
    state.medicines.filter(medicine => medicine.isActive).map(medicine => [medicine.id, medicine])
  );

  const expectedReminderNotifications = state.reminderTimes
    .filter(reminderTime => reminderTime.isEnabled && activeMedicines.has(reminderTime.medicineId))
    // ⚠️ v1.7.7 — `medicine` GECIRILIYOR ve `null` sonuc ATLANIYOR.
    // Tanilama "beklenen bildirimler" kumesini uretiyor; gun kurallarini
    // uygulamazsa bugun mesru olarak alarmi OLMAYAN ilaclar icin "sapma"
    // (drift) bildirir ve kullaniciyi yanlis yere yonlendirir.
    .flatMap(reminderTime => {
      const medicine = activeMedicines.get(reminderTime.medicineId)!;
      const triggerDate = resolveReminderTriggerDate(
        reminderTime,
        false,
        referenceNow,
        false,
        medicine
      );
      if (!triggerDate) return [];
      const behavior = resolveNotificationBehavior(medicine, state.settings, triggerDate);
      return [
        {
          id: getAlarmNotificationId(medicine.id, reminderTime.id),
          type: 'alarm' as const,
          medicineId: medicine.id,
          medicineName: medicine.name,
          reminderTimeId: reminderTime.id,
          reminderTime: reminderTime.time,
          triggerTimestamp: triggerDate.getTime(),
          scheduledTime: triggerDate.toISOString(),
          channelId: behavior.channelId,
          fullScreenAlarm: behavior.fullScreenAlarm,
          quietHoursActive: behavior.quietHoursActive,
        },
      ];
    });

  const expectedSnoozeNotifications = state.snoozes
    .filter(snooze => snooze.isActive)
    .flatMap(snooze => {
      const medicine = activeMedicines.get(snooze.medicineId);
      const reminderTime = state.reminderTimes.find(
        item => item.id === snooze.reminderTimeId && item.isEnabled
      );
      if (!medicine || !reminderTime) return [];
      const triggerDate = new Date(snooze.triggerTime);
      if (triggerDate <= referenceNow) return [];
      const behavior = resolveNotificationBehavior(medicine, state.settings, triggerDate);
      return [
        {
          id: buildSnoozeNotificationId(medicine.id, reminderTime.id, snooze.id),
          type: 'snooze' as const,
          medicineId: medicine.id,
          medicineName: medicine.name,
          reminderTimeId: reminderTime.id,
          reminderTime: reminderTime.time,
          triggerTimestamp: triggerDate.getTime(),
          scheduledTime: triggerDate.toISOString(),
          channelId: behavior.channelId,
          fullScreenAlarm: behavior.fullScreenAlarm,
          quietHoursActive: behavior.quietHoursActive,
          storedNotificationId: snooze.notificationId,
        },
      ];
    });

  return [...expectedReminderNotifications, ...expectedSnoozeNotifications];
} /**
 * Beklenen vs planlanmis notificationlar arasindaki farki hesapla.
 * - missingNotificationIds: bekleniyor ama planlanmamis
 * - configDriftIds: var ama config tutarsiz
 * - orphanTriggerIds: var ama eslesen medicine yok
 * - hasDrift: herhangi bir tutarsizlik var mi
 */
export async function analyzeNotificationDrift(
  state: NotificationStateSnapshot,
  referenceNow: Date = new Date()
): Promise<NotificationDriftReport> {
  const expectedNotifications = buildExpectedNotifications(state, referenceNow);
  const scheduledNotificationsById = new Map<string, ScheduledNotificationSnapshot>();

  try {
    const triggerNotifications = await notifee.getTriggerNotifications();
    const detailedNotifications = triggerNotifications
      .map(normalizeScheduledNotification)
      .filter((item): item is ScheduledNotificationSnapshot => item !== null);
    detailedNotifications.forEach(notification => {
      scheduledNotificationsById.set(notification.id, notification);
    });
  } catch (error) {
    log.debug('Trigger notifications detayli okunamadi, ID listesine dusuluyor', error);
  }

  try {
    const triggerIds = await notifee.getTriggerNotificationIds();
    triggerIds.forEach(id => {
      if (!scheduledNotificationsById.has(id)) {
        scheduledNotificationsById.set(id, {
          id,
          type: id.startsWith('snooze-') ? 'snooze' : 'alarm',
        });
      }
    });
  } catch (error) {
    log.debug('Trigger notification ID listesi okunamadi', error);
  }

  const scheduledNotifications = Array.from(scheduledNotificationsById.values());
  const scheduledMap = new Map(
    scheduledNotifications.map(notification => [notification.id, notification])
  );
  const trackedIds = new Set(expectedNotifications.map(n => n.id));
  const missingNotificationIds: string[] = [];
  const configDriftIds: string[] = [];
  const legacySnoozeNotificationIds: string[] = [];

  for (const expected of expectedNotifications) {
    const legacySnoozeId =
      expected.type === 'snooze' &&
      expected.storedNotificationId &&
      expected.storedNotificationId !== expected.id
        ? expected.storedNotificationId
        : undefined;
    if (legacySnoozeId) trackedIds.add(legacySnoozeId);

    const matchedId = scheduledMap.has(expected.id)
      ? expected.id
      : legacySnoozeId && scheduledMap.has(legacySnoozeId)
        ? legacySnoozeId
        : undefined;
    if (!matchedId) {
      missingNotificationIds.push(expected.id);
      continue;
    }
    if (legacySnoozeId && matchedId === legacySnoozeId) {
      legacySnoozeNotificationIds.push(legacySnoozeId);
    }
    const scheduled = scheduledMap.get(matchedId);
    if (scheduled && isNotificationConfigDrifted(expected, scheduled)) {
      configDriftIds.push(expected.id);
    }
  }

  const orphanTriggerIds = scheduledNotifications
    .map(notification => notification.id)
    .filter(id => (id.startsWith('alarm-') || id.startsWith('snooze-')) && !trackedIds.has(id));

  const shouldSuppressMissingTriggerDrift =
    Platform.OS === 'android' &&
    isMIUIDevice() &&
    state.settings.fullScreenAlarmEnabled &&
    expectedNotifications.length > ANDROID_TRIGGER_INTROSPECTION_LIMIT &&
    configDriftIds.length === 0 &&
    orphanTriggerIds.length === 0 &&
    legacySnoozeNotificationIds.length === 0;

  return {
    expectedNotifications,
    scheduledNotifications,
    missingNotificationIds: shouldSuppressMissingTriggerDrift ? [] : missingNotificationIds,
    configDriftIds,
    orphanTriggerIds,
    legacySnoozeNotificationIds,
    hasDrift:
      (!shouldSuppressMissingTriggerDrift && missingNotificationIds.length > 0) ||
      configDriftIds.length > 0 ||
      orphanTriggerIds.length > 0 ||
      legacySnoozeNotificationIds.length > 0,
  };
}

/**
 * Tam diagnostics snapshot: drift + counts + settings summary.
 * Debug ekraninda gosterilebilir.
 */
export async function getNotificationDiagnostics(
  state: NotificationStateSnapshot,
  referenceNow: Date = new Date()
): Promise<NotificationDiagnosticsSnapshot> {
  const report = await analyzeNotificationDrift(state, referenceNow);

  let displayedIds = new Set<string>();
  try {
    const displayedNotifications = await notifee.getDisplayedNotifications();
    displayedIds = new Set(
      displayedNotifications.map(n => extractNotificationId(n)).filter((id): id is string => !!id)
    );
  } catch (error) {
    log.debug('Displayed notifications okunamadi', error);
  }

  const medicineNameById = new Map(state.medicines.map(m => [m.id, m.name]));
  const scheduledNotifications = report.scheduledNotifications.map(n => ({
    ...n,
    medicineName: n.medicineName ?? (n.medicineId ? medicineNameById.get(n.medicineId) : undefined),
    isDisplayed: displayedIds.has(n.id),
  }));

  const activeMedicines = state.medicines.filter(m => m.isActive).length;
  const enabledReminderTimes = state.reminderTimes.filter(rt => rt.isEnabled).length;
  const activeSnoozes = state.snoozes.filter(s => s.isActive).length;

  return {
    evaluatedAt: referenceNow.toISOString(),
    counts: {
      activeMedicines,
      enabledReminderTimes,
      activeSnoozes,
      expectedNotifications: report.expectedNotifications.length,
      scheduledNotifications: scheduledNotifications.length,
      displayedNotifications: displayedIds.size,
    },
    settingsSummary: {
      alarmModeEnabled: state.settings.alarmModeEnabled,
      vibrationEnabled: state.settings.vibrationEnabled,
      fullScreenAlarmEnabled: state.settings.fullScreenAlarmEnabled,
      quietHoursEnabled: state.settings.quietHoursEnabled,
      quietHoursStart: state.settings.quietHoursStart,
      quietHoursEnd: state.settings.quietHoursEnd,
      snoozeDuration: state.settings.snoozeDuration,
      maxSnoozeCount: state.settings.maxSnoozeCount,
    },
    report: { ...report, scheduledNotifications },
  };
}
