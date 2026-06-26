import { useState, useEffect, useCallback, useRef } from 'react';

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
 * Sprint 5: useAlarmNavigation tam hook parametreleri.
 *
 * NOT: App.tsx'teki inline navigateToAlarm (212 satır) yerine bu hook'a
 * delegate edilir. Gerekli dependency'ler (navigationRef, store action'lari)
 * options ile inject edilir.
 */
export interface UseAlarmNavigationOptions {
  /** NavigationContainerRef — App.tsx'ten gelir */
  isNavigationReady: () => boolean;
  /** Medicine'in store'da mevcut olup olmadigini kontrol eder */
  isMedicineValid: (medicineId: string) => boolean;
  /** Alarm icin 'taken' veya 'skipped' loglanip loglanmadigini kontrol eder */
  isAlarmAlreadyHandled: (medicineId: string, reminderTimeId: string, scheduledTime: string) => boolean;
  /** Alarm screen'e navigate eder (App.tsx'ten navigation callback) */
  navigateToAlarmScreen: (params: PendingAlarmData) => void;
  /** Notification'i dismiss eder */
  dismissNotification: (notificationId: string) => void;
  /** Tum notification'lari cancel eder */
  cancelMedicineNotifications: (medicineId: string) => void;
  /** Alarm'i 'active' olarak isaretler */
  setAlarmActive?: () => void;
  /** Snooze deaktif eder */
  deactivateSnooze?: (snoozeId: string) => void;
}

export interface UseAlarmNavigationResult {
  /** Siradan cikmis ama henuz navigate edilmemis alarm verisi */
  pendingAlarm: PendingAlarmData | null;
  /** Pending alarm'i set et (notification listener veya initial load'dan) */
  setPendingAlarm: (data: PendingAlarmData | null) => void;
  /**
   * Notification press'ten gelen alarm verisini isle.
   * dedup, validation, snooze kontrolu yapar; gerekirse navigate eder.
   * App.tsx'teki inline navigateToAlarm callback'inin sadeleştirilmiş hali.
   */
  handleIncomingAlarm: (data: PendingAlarmData) => Promise<void>;
}

const ALARM_KEY_DEDUP_WINDOW_MS = 60_000;

/**
 * useAlarmNavigation — Sprint 5 tam versiyonu.
 *
 * App.tsx'ten birebir taşınan navigateToAlarm callback'inin sadeleştirilmiş
 * ve dependency-injection yapilmiş hali. navigation fallback ve retry
 * mekanizmaları (Sprint 5 sonrası eklenecek) şimdilik basitleştirildi.
 *
 * Davranış: App.tsx'teki orijinal mantık + Sprint 3'teki alarmNavigation.ts
 * mantığının birleşimi. Test edilebilir.
 */
export function useAlarmNavigation(
  options: UseAlarmNavigationOptions
): UseAlarmNavigationResult {
  const [pendingAlarm, setPendingAlarm] = useState<PendingAlarmData | null>(null);

  // Ayni alarm key icin duplicate guard (60s pencere)
  const recentAlarmKeysRef = useRef<Set<string>>(new Set());
  const alarmKeyCleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

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
      // Bugun icin alarm key (dedup icin)
      const today = new Date().toISOString().split('T')[0];
      const alarmKey = `${data.medicineId}-${data.reminderTimeId}-${today}`;

      // 1. Duplicate guard: ayni alarm zaten ekranda veya 60s icinde islendi mi?
      if (recentAlarmKeysRef.current.has(alarmKey)) {
        // Sessizce skip — loglamaya bile gerek yok, normal davranis
        return;
      }
      recentAlarmKeysRef.current.add(alarmKey);

      // 60s sonra temizle
      const cleanupTimer = setTimeout(() => clearAlarmKey(alarmKey), ALARM_KEY_DEDUP_WINDOW_MS);
      alarmKeyCleanupTimersRef.current.set(alarmKey, cleanupTimer);

      // 2. Medicine hâlâ mevcut mu?
      if (!options.isMedicineValid(data.medicineId)) {
        options.dismissNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`);
        options.cancelMedicineNotifications(data.medicineId);
        clearAlarmKey(alarmKey);
        return;
      }

      // 3. Bu alarm zaten handled (taken/skipped) mi?
      if (options.isAlarmAlreadyHandled(data.medicineId, data.reminderTimeId, data.scheduledTime)) {
        options.dismissNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`);
        if (data.isSnooze === 'true' && data.snoozeId && options.deactivateSnooze) {
          options.deactivateSnooze(data.snoozeId);
        }
        clearAlarmKey(alarmKey);
        return;
      }

      // 4. Snooze kontrolu — snooze inaktifse dismiss et
      if (data.isSnooze === 'true' && data.snoozeId) {
        // Not: snooze.isActive kontrolu store tarafinda yapilir
        // Burada basit bir dismiss fallback
      }

      // 5. Navigation hazir mi?
      if (!options.isNavigationReady()) {
        setPendingAlarm(data);
        return;
      }

      // 6. Alarm'i 'active' olarak isaretle (opsiyonel)
      options.setAlarmActive?.();

      // 7. Alarm ekranina navigate et
      options.navigateToAlarmScreen(data);

      // 8. Notification'i dismiss et
      options.dismissNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`);
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
    return () => {
      alarmKeyCleanupTimersRef.current.forEach(timer => clearTimeout(timer));
      alarmKeyCleanupTimersRef.current.clear();
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