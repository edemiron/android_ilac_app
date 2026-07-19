/**
 * Caregiver notification event handler — Sprint 71.
 *
 * notifee.onForegroundEvent dinleyicisi. Caregiver notification'larındaki
 * "Hasta Aldı" / "Ara" action buttonlarına basıldığında callback'leri
 * işler. Background event'ler için onBackgroundEvent da eklenir.
 *
 * Caregiver (aile bireyi) kendi telefonundan "Hasta Aldı" butonuna bastığında
 * Firestore'da medicineLog güncellenir (gerçek zamanlı senkronizasyon).
 * Production-ready değil — gerçek auth + per-cinsiyet izni gerekli.
 */

import { useEffect } from 'react';
import notifee, { EventType, Event } from '@notifee/react-native';
import { CAREGIVER_ACTION_TAKEN, CAREGIVER_ACTION_CALL } from './caregiverNotification';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('CaregiverEventHandler');

export interface CaregiverEventCallbacks {
  onPatientTook?: (medicineName: string, doseTime: string) => void;
  onCallPatient?: () => void;
  onDismiss?: () => void;
}

/**
 * Foreground + background event listener'ları kurar.
 * Component mount edildiğinde çağrılmalı (örn. App.tsx).
 */
export function useCaregiverEventHandler(callbacks: CaregiverEventCallbacks) {
  useEffect(() => {
    // Foreground events
    const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }: Event) => {
      handleEvent(type, detail, callbacks);
    });

    // Background events (app kapalıyken basılan action'lar)
    notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
      handleEvent(type, detail, callbacks);
    });

    return () => {
      unsubscribeForeground();
      // onBackgroundEvent için unsubscribe yok (top-level), app lifetime'ı boyunca çalışır
    };
  }, [callbacks]);
}

function handleEvent(type: EventType, detail: Event['detail'], callbacks: CaregiverEventCallbacks) {
  if (type !== EventType.ACTION_PRESS) {
    if (type === EventType.DISMISSED) {
      log.info('Caregiver notification dismissed');
      callbacks.onDismiss?.();
    }
    return;
  }

  const pressActionId = detail.pressAction?.id;

  if (pressActionId === CAREGIVER_ACTION_TAKEN) {
    // Hasta Aldı
    const data = detail.notification?.data;
    const medicineName = (data?.medicineName as string) ?? 'Bilinmeyen ilaç';
    const doseTime = (data?.doseTime as string) ?? '';
    log.info('Caregiver tapped Hasta Aldı', { medicineName, doseTime });
    callbacks.onPatientTook?.(medicineName, doseTime);
  } else if (pressActionId === CAREGIVER_ACTION_CALL) {
    // Ara
    log.info('Caregiver tapped Ara');
    callbacks.onCallPatient?.();
  } else {
    log.warn('Caregiver unknown action press', { pressActionId });
  }
}
