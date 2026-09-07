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

    return () => {
      unsubscribeForeground();
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

/**
 * Global background handler (mobile/index.ts) tarafindan cagrilan
 * arkaplan bakici eylem isleyicisi.
 */
export async function handleCaregiverBackgroundAction(pressActionId: string, data: any) {
  if (pressActionId === CAREGIVER_ACTION_TAKEN) {
    const patientId = (data?.patientId as string) || '';
    const medicineName = (data?.medicineName as string) ?? 'Bilinmeyen ilaç';
    const doseTime = (data?.doseTime as string) || (data?.scheduledTime as string) || '';
    const medicineId = data?.medicineId as string | undefined;

    log.info('[BG] Caregiver tapped Hasta Aldı', { patientId, medicineName, doseTime });
    if (patientId && medicineName) {
      const { logMedicineTakenByCaregiver } = await import('./caregiverService');
      await logMedicineTakenByCaregiver(patientId, medicineName, doseTime, medicineId);
    }
  } else if (pressActionId === CAREGIVER_ACTION_CALL) {
    const phone = data?.patientPhone as string;
    log.info('[BG] Caregiver tapped Ara', { phone });
    if (phone) {
      const { Linking } = await import('react-native');
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  }
}
