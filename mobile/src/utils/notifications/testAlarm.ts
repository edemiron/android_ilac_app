/**
 * testAlarm — kilit ekranı alarm testi için TEK kaynak.
 *
 * Neden: aynı testi kuran 4 ayrı buton vardı ve üçü farklı ayar semantiği
 * kullanıyordu:
 *   - `AlarmDiagnosticCard`  → tam `settings` (doğru)
 *   - `NotificationsSection` → `{ fullScreenAlarmEnabled: true, ... }` partial
 *     (kullanıcının sessiz saatler / titreşim / alarm modu ayarlarını default'a
 *     düşürüyor ve toggle'ı yok sayıyordu)
 *   - `useSettingsScreen`    → hiç ayar yok, hepsi default
 *   - `oemShieldEngine`      → hiç ayar yok, hepsi default
 *
 * Bu modül:
 *   - Ayarları HER ZAMAN store'dan okur; partial override kabul etmez.
 *   - "armed" durumunu ve zamanlayıcıyı kendi içinde tutar (UI kendi state'ini
 *     tutmaz), arka plana alınmada/abonesi kalmadığında zamanlayıcıyı temizler.
 *   - Aynı anda tek test çalıştırır; yeni çağrı öncekini iptal eder.
 *   - İzin eksikse SESSİZCE başarısız olmaz: somut sebep + adım adım rapor döner.
 *   - Bildirimi açıkça "TEST" olarak etiketler (bkz. schedule.ts başlık/gövde).
 *   - Doz/adherence kaydı YAZMAZ ve gerçek alarm kuyruğuna DOKUNMAZ: yalnızca
 *     `test-medicine` / `test-reminder` kimliklerini kullanır.
 *
 * NOT: Bu dosya `utils/notifications.ts` barrel'ına EKLENMEMELİ — store'a
 * eriştiği için barrel üzerinden dairesel bağımlılık riski var. Store erişimi
 * ayrıca lazy require ile yapılır (bkz. readSettingsFromStore).
 */

import { AppState, type AppStateStatus } from 'react-native';

import { detectOEMShieldStatus } from '../oemShieldEngine';
import { createScopedLogger } from '../logger';
import { scheduleTestAlarmNotification } from './schedule';
import { cancelNotification } from './cancel';
import { TEST_ALARM_TARGET } from './ids';
import { isInQuietHours } from './time';
import type { UserSettings } from '../../types';

const log = createScopedLogger('TestAlarm');

export const TEST_ALARM_MEDICINE_ID = 'test-medicine';
export const TEST_ALARM_REMINDER_ID = 'test-reminder';
export const TEST_ALARM_NOTIFICATION_ID = `alarm-${TEST_ALARM_MEDICINE_ID}-${TEST_ALARM_REMINDER_ID}`;

/** Kullanıcıya sunulan süre seçenekleri (saniye). */
export const TEST_ALARM_DURATIONS = [5, 10, 30] as const;
export type TestAlarmDuration = (typeof TEST_ALARM_DURATIONS)[number];

/** Alarm kurulduktan sonra "armed" göstergesinin ekstra bekleme payı. */
const ARMED_GRACE_MS = 3000;

export type TestAlarmStepId =
  | 'notifications'
  | 'exact-alarm'
  | 'full-screen-intent'
  | 'full-screen-mode'
  | 'battery'
  | 'scheduled';

export type TestAlarmStepStatus = 'ok' | 'warn' | 'fail';

export interface TestAlarmStep {
  id: TestAlarmStepId;
  status: TestAlarmStepStatus;
  title: string;
  detail?: string;
}

/** Test hiç kurulamadıysa somut sebep. */
export type TestAlarmFailureReason =
  | 'notifications-denied'
  | 'exact-alarm-denied'
  | 'schedule-failed';

export interface TestAlarmResult {
  /** true = test kuruldu (uyarılar olabilir), false = hiç kurulamadı. */
  ok: boolean;
  reason?: TestAlarmFailureReason;
  steps: TestAlarmStep[];
  notificationId?: string;
  firesAt?: string;
  seconds?: number;
}

export interface TestAlarmRunState {
  /** Ön kontrol + planlama sürüyor. */
  isRunning: boolean;
  /** Alarm kuruldu, çalması bekleniyor. */
  isArmed: boolean;
  firesAt: string | null;
  seconds: number | null;
  lastResult: TestAlarmResult | null;
}

export interface RunLockScreenAlarmTestOptions {
  /** Kaç saniye sonra çalsın (varsayılan 5). */
  seconds?: number;
  language?: 'tr' | 'en';
  /**
   * TAM `UserSettings` nesnesi. Normalde VERİLMEZ — ayarlar store'dan okunur.
   * Partial kabul edilmez (tip zorunlu tutar), böylece eski
   * `{ fullScreenAlarmEnabled: true }` gibi çağrılar mümkün değil.
   */
  settings?: UserSettings;
  onArmed?: (info: { firesAt: string; seconds: number }) => void;
  onResult?: (result: TestAlarmResult) => void;
}

const INITIAL_STATE: TestAlarmRunState = {
  isRunning: false,
  isArmed: false,
  firesAt: null,
  seconds: null,
  lastResult: null,
};

// ── Modül seviyesi paylaşımlı durum ──────────────────────────────────────────
let runState: TestAlarmRunState = INITIAL_STATE;
const listeners = new Set<(next: TestAlarmRunState) => void>();
let armedTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let subscriberCount = 0;
let runToken = 0;

function emit(patch: Partial<TestAlarmRunState>): void {
  runState = { ...runState, ...patch };
  for (const listener of Array.from(listeners)) {
    try {
      listener(runState);
    } catch (error) {
      log.debug('listener hatasi', { error });
    }
  }
}

export function getTestAlarmRunState(): TestAlarmRunState {
  return runState;
}

export function subscribeTestAlarmRunState(
  listener: (next: TestAlarmRunState) => void
): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  ensureAppStateListener();

  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      // Son abone gitti (unmount): zamanlayıcı sızdırılmaz.
      clearArmedTimer();
      releaseAppStateListener();
    }
  };
}

function clearArmedTimer(): void {
  if (armedTimer) {
    clearTimeout(armedTimer);
    armedTimer = null;
  }
}

function handleAppStateChange(next: AppStateStatus): void {
  if (next === 'active') return;
  // Arka plana alındı: testin ta kendisi bu (kullanıcı ekranı kilitliyor).
  // Zamanlayıcıyı temizle, "armed" göstergesini bırak — planlanan bildirim
  // KALIR, yalnızca UI sayacı kapanır.
  if (armedTimer || runState.isArmed) {
    clearArmedTimer();
    emit({ isArmed: false, firesAt: null, seconds: null });
  }
}

function ensureAppStateListener(): void {
  if (appStateSubscription) return;
  try {
    appStateSubscription = AppState?.addEventListener?.('change', handleAppStateChange) ?? null;
  } catch (error) {
    log.debug('AppState listener eklenemedi', { error });
    appStateSubscription = null;
  }
}

function releaseAppStateListener(): void {
  if (!appStateSubscription) return;
  try {
    appStateSubscription.remove();
  } catch (error) {
    log.debug('AppState listener kaldirilamadi', { error });
  }
  appStateSubscription = null;
}

/**
 * Ayarları her zaman store'dan oku.
 *
 * LAZY REQUIRE bilinçli: statik import, store grafiğini (ve onun modül
 * seviyesinde `NativeModules` okuyan `widgetService` gibi bağımlılıklarını)
 * `testAlarm`'ı import eden HER dosyaya taşıyor ve PermissionsScreen testini
 * modül yüklenme anında patlatıyordu.
 */
function readSettingsFromStore(): UserSettings | undefined {
  try {
    const storeModule = require('../../stores/medicineStore') as {
      useMedicineStore: { getState: () => { settings?: UserSettings } };
    };
    return storeModule.useMedicineStore.getState().settings;
  } catch (error) {
    log.debug('store settings okunamadi', { error });
    return undefined;
  }
}

/**
 * Planlanmış test alarmını ve "armed" durumunu iptal et.
 * Yalnızca test kimliklerine dokunur; gerçek alarm kuyruğu etkilenmez.
 */
export async function cancelLockScreenAlarmTest(): Promise<void> {
  runToken += 1;
  clearArmedTimer();
  emit({ isRunning: false, isArmed: false, firesAt: null, seconds: null });

  try {
    // Kimlikler AÇIKÇA geçirilir: bildirim id'si tire ile bölünerek
    // çözümlenemez (bkz. parseAlarmNotificationId). cancelNotification bu
    // kimliklerle AlarmModule.cancelNativeAlarm + cancelAlarmNotification
    // köprülerini de çağırır.
    await cancelNotification(TEST_ALARM_NOTIFICATION_ID, TEST_ALARM_TARGET);
  } catch (error) {
    log.debug('test alarmi iptal edilemedi', { error });
  }
}

function buildSteps(
  shield: Awaited<ReturnType<typeof detectOEMShieldStatus>> | null,
  isTr: boolean
): TestAlarmStep[] {
  if (!shield) {
    return [
      {
        id: 'notifications',
        status: 'warn',
        title: isTr ? 'İzin durumu okunamadı' : 'Could not read permission status',
        detail: isTr
          ? 'Cihaz bilgisi alınamadı; test yine de kurulmaya çalışılacak.'
          : 'Device info unavailable; the test will still be attempted.',
      },
    ];
  }

  const steps: TestAlarmStep[] = [];

  steps.push({
    id: 'notifications',
    status: shield.notifications ? 'ok' : 'fail',
    title: isTr ? 'Bildirim izni' : 'Notification permission',
    detail: shield.notifications
      ? undefined
      : isTr
        ? 'Kapalı — hiçbir alarm gösterilemez.'
        : 'Denied — no alarm can be shown.',
  });

  steps.push({
    id: 'exact-alarm',
    status: shield.exactAlarm ? 'ok' : 'fail',
    title: isTr ? 'Kesin alarm izni' : 'Exact alarm permission',
    detail: shield.exactAlarm
      ? undefined
      : isTr
        ? 'Kapalı — alarm tam zamanında çalamaz.'
        : 'Denied — the alarm cannot fire on time.',
  });

  steps.push({
    id: 'full-screen-intent',
    status: shield.fullScreenIntent ? 'ok' : 'warn',
    title: isTr ? 'Tam ekran bildirim izni' : 'Full-screen notification permission',
    detail: shield.fullScreenIntent
      ? undefined
      : isTr
        ? 'Kapalı — alarm kilit ekranını açamaz, yalnızca üstten bildirim olarak görünür.'
        : 'Denied — the alarm cannot open the lock screen, it will only appear as a heads-up.',
  });

  steps.push({
    id: 'battery',
    status: shield.batteryOptimizationIgnored ? 'ok' : 'warn',
    title: isTr ? 'Pil muafiyeti' : 'Battery exemption',
    detail: shield.batteryOptimizationIgnored
      ? undefined
      : isTr
        ? 'Verilmemiş — uzun süre kullanılmadığında alarm gecikebilir.'
        : 'Not granted — the alarm may be delayed when the device is idle.',
  });

  return steps;
}

/**
 * Kilit ekranı alarm testini çalıştır.
 *
 * Akış: izin ön kontrolü → (engelleyici eksik varsa somut sebeple dur) →
 * test bildirimini planla → "armed" durumunu yönet.
 */
export async function runLockScreenAlarmTest(
  options: RunLockScreenAlarmTestOptions = {}
): Promise<TestAlarmResult> {
  const { seconds = 5, language = 'tr', settings: explicitSettings, onArmed, onResult } = options;
  const isTr = language === 'tr';

  // Aynı anda tek test: öncekini iptal et.
  await cancelLockScreenAlarmTest();

  const token = ++runToken;
  emit({ isRunning: true, lastResult: null });

  const finish = (result: TestAlarmResult): TestAlarmResult => {
    if (token === runToken) {
      emit({ isRunning: false, lastResult: result });
    }
    try {
      onResult?.(result);
    } catch (error) {
      log.debug('onResult hatasi', { error });
    }
    return result;
  };

  // 1. İzin ön kontrolü
  let shield: Awaited<ReturnType<typeof detectOEMShieldStatus>> | null = null;
  try {
    shield = await detectOEMShieldStatus();
  } catch (error) {
    log.debug('detectOEMShieldStatus basarisiz', { error });
  }

  const steps = buildSteps(shield, isTr);

  if (shield && !shield.notifications) {
    return finish({ ok: false, reason: 'notifications-denied', steps });
  }
  if (shield && !shield.exactAlarm) {
    return finish({ ok: false, reason: 'exact-alarm-denied', steps });
  }

  // 2. Planla — ayarlar HER ZAMAN store'dan (veya verilen tam nesneden).
  const settings = explicitSettings ?? readSettingsFromStore();

  // Uygulama içi ayar kapalıysa test de tam ekran açmaz. Bunu adım listesinde
  // AÇIKÇA söylüyoruz; aksi halde kullanıcı testin başarısız olduğunu sanır.
  const fullScreenSettingEnabled = settings?.fullScreenAlarmEnabled !== false;
  const quietHoursActive = settings ? isInQuietHours(settings, new Date()) : false;

  if (!fullScreenSettingEnabled) {
    steps.push({
      id: 'full-screen-mode',
      status: 'warn',
      title: isTr
        ? 'Uygulama ayarı: tam ekran alarm kapalı'
        : 'App setting: full-screen alarm is off',
      detail: isTr
        ? 'Bu test de yalnızca normal bildirim gösterecek. Kilit ekranı davranışını denemek için ayarı açın.'
        : 'This test will only show a normal notification. Turn the setting on to try the lock-screen behaviour.',
    });
  } else if (quietHoursActive) {
    steps.push({
      id: 'full-screen-mode',
      status: 'warn',
      title: isTr ? 'Sessiz saatler aktif' : 'Quiet hours are active',
      detail: isTr
        ? 'Sessiz saatlerde tam ekran alarm devre dışıdır; bu test normal bildirim gösterecek.'
        : 'Full-screen alarm is disabled during quiet hours; this test will show a normal notification.',
    });
  }

  try {
    const notificationId = await scheduleTestAlarmNotification(seconds / 60, language, settings);
    const firesAt = new Date(Date.now() + seconds * 1000).toISOString();

    steps.push({
      id: 'scheduled',
      status: 'ok',
      title: isTr ? 'Test alarmı kuruldu' : 'Test alarm armed',
      detail: isTr
        ? `${seconds} saniye sonra çalacak. Şimdi güç tuşuyla ekranı kilitleyin.`
        : `Fires in ${seconds} seconds. Lock your screen with the power button now.`,
    });

    if (token === runToken) {
      clearArmedTimer();
      armedTimer = setTimeout(
        () => {
          armedTimer = null;
          emit({ isArmed: false, firesAt: null, seconds: null });
        },
        seconds * 1000 + ARMED_GRACE_MS
      );

      emit({ isArmed: true, firesAt, seconds });
    }

    try {
      onArmed?.({ firesAt, seconds });
    } catch (error) {
      log.debug('onArmed hatasi', { error });
    }

    log.info('Kilit ekrani alarm testi kuruldu', { seconds, notificationId });
    return finish({ ok: true, steps, notificationId, firesAt, seconds });
  } catch (error) {
    log.error('Test alarmi kurulamadi', error);
    steps.push({
      id: 'scheduled',
      status: 'fail',
      title: isTr ? 'Test alarmı kurulamadı' : 'Could not arm test alarm',
      detail: error instanceof Error ? error.message : undefined,
    });
    return finish({ ok: false, reason: 'schedule-failed', steps });
  }
}

/** Yalnızca testler için: paylaşımlı durumu sıfırla. */
export function __resetTestAlarmStateForTests(): void {
  runState = INITIAL_STATE;
  listeners.clear();
  clearArmedTimer();
  subscriberCount = 0;
  runToken = 0;
  releaseAppStateListener();
}
