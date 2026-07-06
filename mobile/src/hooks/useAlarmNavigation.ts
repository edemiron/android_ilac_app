import { useState, useEffect, useCallback, useRef } from 'react';
import { useMedicineStore } from '../stores/medicineStore';
import {
  handleIncomingAlarmNavigation,
  type AlarmNavigationData,
  type AlarmNavigationDependencies,
  type AlarmNavigationStore,
} from '../utils/alarmNavigation';
import { createScopedLogger } from '../utils/logger';

/**
 * Alarm navigation icin gelen bildirim verisi.
 * AlarmScreen route parametreleriyle birebir ayni forma sahip.
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
   * External handled check (App.tsx'te isAlarmHandled AsyncStorage'a erişir).
   * Async kabul edilir.
   */
  isAlarmAlreadyHandled: (
    medicineId: string,
    reminderTimeId: string,
    scheduledTime: string
  ) => boolean | Promise<boolean>;
  /** Alarm screen'e navigate eder (App.tsx'ten navigation callback) */
  navigateToAlarmScreen: (params: PendingAlarmData) => void;
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

const ALARM_KEY_DEDUP_WINDOW_MS = 60_000;

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

  // Ayni alarm key icin duplicate guard (60s pencere)
  const recentAlarmKeysRef = useRef<Set<string>>(new Set());
  const alarmKeyCleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearAlarmKey = useCallback((alarmKey: string) => {
    recentAlarmKeysRef.current.delete(alarmKey);
    const timer = alarmKeyCleanupTimersRef.current.get(alarmKey);
    if (timer) {
      clearTimeout(timer);
      alarmKeyCleanupTimersRef.current.delete(alarmKey);
    }
  }, []);

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
        setPendingAlarm: data => setPendingAlarm(data as PendingAlarmData | null),
        activeAlarmKeys: recentAlarmKeysRef.current,
        scheduleAlarmKeyCleanup: (alarmKey: string) => {
          // Hook'un kendi 60s timer mekanizması — pure function'a
          // timer yönetimini devretmeden sadece key'in Set'e eklenmesini
          // ve cleanup zamanlamasını bildiriyoruz.
          const existing = alarmKeyCleanupTimersRef.current.get(alarmKey);
          if (existing) {
            clearTimeout(existing);
          }
          const timer = setTimeout(() => clearAlarmKey(alarmKey), ALARM_KEY_DEDUP_WINDOW_MS);
          alarmKeyCleanupTimersRef.current.set(alarmKey, timer);
        },
        navigateToAlarmScreen: params => {
          options.navigateToAlarmScreen(params as PendingAlarmData);
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
    [options, clearAlarmKey]
  );

  // Pending alarm hazir oldugunda navigate et
  useEffect(() => {
    if (pendingAlarm && options.isNavigationReady()) {
      handleIncomingAlarm(pendingAlarm);
      setPendingAlarm(null);
    }
  }, [pendingAlarm, options, handleIncomingAlarm]);

  // Component unmount'ta tum timer'lari temizle
  useEffect(() => {
    const timers = alarmKeyCleanupTimersRef.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, []);

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
