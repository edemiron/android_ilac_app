import { useState, useEffect } from 'react';

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

export interface UseAlarmQueueResult {
  /** Siradan cikmis ama henuz navigate edilmemis alarm verisi */
  pendingAlarm: PendingAlarmData | null;
  /** Pending alarm'i set et (notification listener veya initial load'dan) */
  setPendingAlarm: (data: PendingAlarmData | null) => void;
}

/**
 * Bekleyen alarm verisi state'i — App.tsx'ten basit bir sekilde cikarildi.
 * navigateToAlarm callback'i ve notification listener setup'i App.tsx'te kaldi
 * (Sprint 3'te daha kapsamli bir useAlarmNavigation hook'una tasinacak).
 */
export function useAlarmQueue(): UseAlarmQueueResult {
  const [pendingAlarm, setPendingAlarm] = useState<PendingAlarmData | null>(null);

  return { pendingAlarm, setPendingAlarm };
}

/**
 * pendingAlarm navigation'a hazir oldugunda navigateToAlarm'i cagir.
 * Bu hook, navigationRef ve navigateToAlarm callback'ini parametre alir,
 * her ikisi de App.tsx tarafindan yonetilir.
 *
 * NOT: Bu hook sadece "pendingAlarm hazir mi" durumunu izler; navigate
 * islemi callback disindan tetiklenir.
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
