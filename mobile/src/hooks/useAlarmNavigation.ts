import { useState, useEffect, useCallback, useRef } from 'react';
import { useMedicineStore } from '../stores/medicineStore';
import {
  handleIncomingAlarmNavigation,
  type AlarmNavigationData,
  type AlarmNavigationDependencies,
  type AlarmNavigationStore,
  type AlarmScreenNavigationParams,
} from '../utils/alarmNavigation';
import { createScopedLogger } from '../utils/logger';
// Giris tekillestirmesinin TEK KAYNAGI. Hook artik kendi Set + setTimeout
// mekanizmasini tutmuyor: kayit zaman damgasina dayanir ve alarm cozumlendiginde
// (alindi/atlandi/kapatildi) AlarmScreen tarafindan acikca birakilir.
// Gerekce: utils/notifications/alarmDedup.ts dosya basi.
import {
  isAlarmIngressDuplicate,
  markAlarmIngressNavigated,
} from '../utils/notifications/alarmDedup';

/**
 * Bildirimden GELEN alarm verisi. Tum alanlar STRING'dir cunku notifee/FCM
 * payload'i string tasir.
 *
 * ⚠️ Bu tip AlarmScreen route parametreleriyle AYNI DEGILDIR: route tarafinda
 * `snoozeCount` number, `isSnooze` boolean. Eskiden ikisi ayni tip sanilip
 * `as PendingAlarmData` ile cast ediliyordu; App.tsx de sayiya `parseInt`
 * uyguluyordu (JS'te tesadufen calisiyordu). Navigation parametreleri artik
 * `AlarmScreenNavigationParams` ile tasiniyor.
 */
export interface PendingAlarmData {
  medicineId: string;
  reminderTimeId: string;
  scheduledTime: string;
  isSnooze?: string;
  snoozeId?: string;
  snoozeCount?: string;
  originalScheduledTime?: string;
}

/**
 * Sprint 6: useAlarmNavigation — DRY refactor.
 *
 * Hook artık sadece React state yaşam döngüsünü ve DI köprüsünü yönetir.
 * Alarm validation/dedup/snooze/navigation davranışı tamamen
 * `handleIncomingAlarmNavigation` (utils/alarmNavigation.ts) pure
 * fonksiyonuna delege edilir. Tek doğru kaynak prensibi.
 *
 * Hook options yüzeyi 8 callback'ten 4'e indi:
 *   - isMedicineValid          → useMedicineStore.getState()
 *   - dismissNotification      → pure function kendi yapar
 *   - setAlarmActive          → useMedicineStore.getState()
 *   - deactivateSnooze        → useMedicineStore.getState()
 *
 * Kalan 4 callback (navigation, notification, external handled check):
 *   - isNavigationReady
 *   - isAlarmAlreadyHandled
 *   - navigateToAlarmScreen
 *   - cancelMedicineNotifications
 */
export interface UseAlarmNavigationOptions {
  /** NavigationContainerRef — App.tsx'ten gelir */
  isNavigationReady: () => boolean;
  /**
   * v1.7.4 — Alarm ekrani ŞU AN bu doz icin acik mi? (KESIN yinelenme guard'i)
   * App.tsx navigationRef'ten okur. Verilmezse kontrol atlanir.
   */
  isAlarmScreenOpenFor?: (medicineId: string, reminderTimeId: string) => boolean;
  /**
   * External handled check (App.tsx'te isAlarmHandled AsyncStorage'a erişir).
   * Async kabul edilir.
   */
  isAlarmAlreadyHandled: (
    medicineId: string,
    reminderTimeId: string,
    scheduledTime: string
  ) => boolean | Promise<boolean>;
  /** Alarm screen'e navigate eder (App.tsx'ten navigation callback) */
  navigateToAlarmScreen: (params: AlarmScreenNavigationParams) => void;
  /** Tum notification'lari cancel eder */
  cancelMedicineNotifications: (medicineId: string) => void;
}

export interface UseAlarmNavigationResult {
  /** Siradan cikmis ama henuz navigate edilmemis alarm verisi */
  pendingAlarm: PendingAlarmData | null;
  /** Pending alarm'i set et (notification listener veya initial load'dan) */
  setPendingAlarm: (data: PendingAlarmData | null) => void;
  /**
   * Notification press'ten gelen alarm verisini isle.
   * Pure function `handleIncomingAlarmNavigation`'a delege eder.
   */
  handleIncomingAlarm: (data: PendingAlarmData) => Promise<void>;
}

const log = createScopedLogger('useAlarmNavigation');

/**
 * useAlarmNavigation — Sprint 6 DRY versiyonu.
 *
 * App.tsx'ten inject edilen 4 callback + store state'i pure function'a
 * geçirir. Hook kendisi sadece:
 *   - pendingAlarm React state'ini tutar
 *   - recentAlarmKeysRef (Set) ile 60s dedup penceresi yönetir
 *   - pendingAlarm navigation hazır olunca otomatik retry eder
 *
 * Tum alarm validation/snooze/navigate/dismiss mantığı
 * `handleIncomingAlarmNavigation` (utils/alarmNavigation.ts) içinde.
 */
export function useAlarmNavigation(options: UseAlarmNavigationOptions): UseAlarmNavigationResult {
  const [pendingAlarm, setPendingAlarm] = useState<PendingAlarmData | null>(null);

  /**
   * `handleIncomingAlarmNavigation` hâlâ bir `Set` arayüzü bekliyor (pure
   * fonksiyon, kendi durumunu tutmuyor). Set'i `alarmDedup` modülüne
   * bağlayan ince bir adaptör veriyoruz: `has` → pencere kontrolü,
   * `add` → kayıt. Böylece kayıt hook'un yaşam döngüsünden bağımsız yaşar
   * ve AlarmScreen alarmı çözümlediğinde serbest bırakabilir.
   *
   * Eskiden burada bir `useRef<Set>` + her anahtar için bir `setTimeout`
   * vardı; hook yeniden kurulduğunda (veya Activity yeniden yaratıldığında)
   * kayıt kayboluyor, zamanlayıcılar ise sızabiliyordu.
   */
  const dedupSetAdapterRef = useRef<Set<string>>({
    has: (key: string) => isAlarmIngressDuplicate(key),
    add: (key: string) => {
      markAlarmIngressNavigated(key);
      return dedupSetAdapterRef.current;
    },
    delete: () => true,
  } as unknown as Set<string>);

  const handleIncomingAlarm = useCallback(
    async (data: PendingAlarmData) => {
      // Store state'i pure function için hazırla
      const store = useMedicineStore.getState();

      const deps: AlarmNavigationDependencies = {
        now: () => new Date(),
        /**
         * Pure function `medId::rtId::yyyy-MM-dd-HH-mm` key üretir.
         * External isAlarmAlreadyHandled ise `medId-rtId-yyyy-MM-dd`
         * gün-precision key bekler. Adapter burada köprü yapar.
         */
        isAlarmHandled: async (_alarmKey: string) => {
          return await options.isAlarmAlreadyHandled(
            data.medicineId,
            data.reminderTimeId,
            data.scheduledTime
          );
        },
        navigationReady: options.isNavigationReady(),
        isAlarmScreenOpenFor: incoming =>
          options.isAlarmScreenOpenFor?.(incoming.medicineId, incoming.reminderTimeId) ?? false,
        setPendingAlarm: data => setPendingAlarm(data as PendingAlarmData | null),
        activeAlarmKeys: dedupSetAdapterRef.current,
        // Kayıt zaman damgasına dayandığı için ayrı bir temizleme zamanlayıcısı
        // gerekmiyor; `alarmDedup` eskimiş kayıtları kendi budar.
        scheduleAlarmKeyCleanup: () => undefined,
        navigateToAlarmScreen: params => {
          options.navigateToAlarmScreen(params);
        },
        cancelMedicineNotifications: options.cancelMedicineNotifications,
        storeState: {
          getMedicineById: store.getMedicineById,
          getReminderTimesForMedicine: store.getReminderTimesForMedicine,
          medicineLogs: store.medicineLogs,
          snoozes: store.snoozes,
          setAlarmActive: store.setAlarmActive,
          deactivateSnooze: store.deactivateSnooze,
        } as AlarmNavigationStore,
        logger: {
          debug: (msg: string, meta?: unknown) => log.debug(msg, meta),
          warn: (msg: string, meta?: unknown) => log.warn(msg, meta),
        },
      };

      try {
        await handleIncomingAlarmNavigation(data as AlarmNavigationData, deps);
      } catch (error) {
        log.error('handleIncomingAlarmNavigation failed', error);
      }
    },
    [options]
  );

  // Pending alarm hazir oldugunda navigate et
  useEffect(() => {
    if (pendingAlarm && options.isNavigationReady()) {
      handleIncomingAlarm(pendingAlarm);
      setPendingAlarm(null);
    }
  }, [pendingAlarm, options, handleIncomingAlarm]);

  return {
    pendingAlarm,
    setPendingAlarm,
    handleIncomingAlarm,
  };
}

/**
 * pendingAlarm hazir oldugunda navigateToAlarm callback'ini tetikle.
 * Bu hook, navigationRef ve navigateToAlarm callback'ini parametre alir.
 */
export function usePendingAlarmTrigger(
  pendingAlarm: PendingAlarmData | null,
  onTrigger: (data: PendingAlarmData) => void,
  isReady: () => boolean
): void {
  useEffect(() => {
    if (pendingAlarm && isReady()) {
      onTrigger(pendingAlarm);
    }
  }, [pendingAlarm, onTrigger, isReady]);
}
