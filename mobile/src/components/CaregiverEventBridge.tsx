/**
 * CaregiverEventBridge — Sprint 72.
 *
 * useCaregiverEventHandler hook'unu App.tsx provider chain'inde mount eder.
 * Caregiver telefonunda "Hasta Aldı" / "Ara" notification action basıldığında
 * tetiklenen callback'leri Firestore'a bağlar:
 *
 *   - onPatientTook → caregiverService.logMedicineTakenByCaregiver
 *                    (hasta medicineLogs subcollection'a yeni log yazar)
 *   - onCallPatient → Linking.openURL('tel:PHONE')
 *                    (patient phone number caregivers/{patientId} üzerinden okunur)
 *   - onDismiss → sadece log
 *
 * Bu component render etmez (null döner). Tek amacı useEffect mount.
 *
 * Provider sırası: AuthProvider > SubscriptionProvider > AlertProvider >
 *                  CaregiverEventBridge > AppContent
 *
 * Auth sonrası mount edilir ki user.uid (caregiver) hazır olsun.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import {
  useCaregiverEventHandler,
  CaregiverEventCallbacks,
} from '../services/caregiverEventHandler';
import {
  logMedicineTakenByCaregiver,
  getPatientPhoneNumber,
  subscribeToCaregivers,
  getPatientsForCaregiver,
} from '../services/caregiverService';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { createScopedLogger } from '../utils/logger';
import { useCaregiverRealtimeWatcher } from '../hooks/useCaregiverRealtimeWatcher';
import { usePatientRemoteReminderWatcher } from '../hooks/usePatientRemoteReminderWatcher';
import { CaregiverFullScreenAlertModal } from '../screens/CaregiverScreen/components/CaregiverFullScreenAlertModal';
import { PatientFullScreenReminderModal } from './PatientFullScreenReminderModal';
import type { PatientInfo } from '../types';

const log = createScopedLogger('CaregiverEventBridge');

/**
 * caregiverId: AuthContext'ten
 * activePatientId: caregiver'in ilk aktif ilişkisinden auto-selected
 */
export function CaregiverEventBridge() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const caregiverId = user?.uid ?? null;

  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);

  // Bakıcının takip ettiği hastaları yükle ve canlı izle
  useEffect(() => {
    if (!caregiverId) {
      setPatients([]);
      return;
    }
    getPatientsForCaregiver(caregiverId).then(list => {
      setPatients(list);
    });
  }, [caregiverId]);

  // Canlı Firestore Log İzleyicisi — Doz alınınca otomatik Notifee + Tam Ekran Modal tetikler
  useCaregiverRealtimeWatcher(patients, !!caregiverId);

  // Canlı Hasta Uzaktan Hatırlatıcı İzleyicisi — Bakıcıdan hatırlatıcı gelince Notifee + Tam Ekran Modal tetikler
  usePatientRemoteReminderWatcher(user?.uid, !!user?.uid);

  // Caregiver ilk aktif ilişkiyi "şu anki hasta" olarak seçsin.
  // İleride caregiverScreen UI'dan patient değiştirme eklenirse burası refactor edilir.
  useEffect(() => {
    if (!caregiverId) {
      setActivePatientId(null);
      return;
    }
    const unsubscribe = subscribeToCaregivers(caregiverId, relationships => {
      const active = relationships.find(r => r.status === 'active');
      setActivePatientId(active?.patientId ?? null);
    });
    return unsubscribe;
  }, [caregiverId]);

  const handlePatientTook = useCallback(
    async (medicineName: string, doseTime: string) => {
      log.info('onPatientTook tetiklendi', { medicineName, doseTime, activePatientId });

      if (!activePatientId) {
        log.warn('Aktif hasta yok, log yazilamadi');
        return;
      }

      const result = await logMedicineTakenByCaregiver(activePatientId, medicineName, doseTime);

      if (!result.success) {
        log.error('caregiver log yazilamadi', result.error);
      } else {
        log.info('caregiver medicineLog yazildi', { logId: result.logId });
        setLastActionAt(Date.now());
      }
    },
    [activePatientId]
  );

  const handleCallPatient = useCallback(async () => {
    log.info('onCallPatient tetiklendi', { activePatientId });

    if (!activePatientId) {
      log.warn('Aktif hasta yok, tel arama yapilamadi');
      showAlert({
        type: 'warning',
        title: 'Aktif hasta yok',
        message: 'Önce bir hasta seçmelisiniz.',
      });
      return;
    }

    const phone = await getPatientPhoneNumber(activePatientId);
    if (!phone) {
      log.warn('Hasta telefon numarasi yok');
      showAlert({
        type: 'warning',
        title: 'Telefon bulunamadı',
        message: 'Bu hastanın telefon numarası kayıtlı değil.',
      });
      return;
    }

    const telUrl = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    try {
      const supported = await Linking.canOpenURL(telUrl);
      if (!supported) {
        log.warn('tel: URL desteklenmiyor', { telUrl });
        return;
      }
      await Linking.openURL(telUrl);
      setLastActionAt(Date.now());
    } catch (error) {
      log.error('tel: acilamadi', error);
    }
  }, [activePatientId, showAlert]);

  const handleDismiss = useCallback(() => {
    log.info('onDismiss — caregiver notification kapatildi');
    // Telemetry / analytics hook'u ileride burada
  }, []);

  const callbacks: CaregiverEventCallbacks = {
    onPatientTook: handlePatientTook,
    onCallPatient: handleCallPatient,
    onDismiss: handleDismiss,
  };

  // Hook'u mount et — useEffect içinde otomatik cleanup yapılır.
  useCaregiverEventHandler(callbacks);

  // lastActionAt sadece state'i değiştirerek re-render tetikler; ileride
  // caregiver UI'ında "Son aksiyon: ..." göstermek için kullanılabilir.
  useEffect(() => {
    if (lastActionAt !== null) {
      log.debug('Last caregiver action timestamp', { lastActionAt });
    }
  }, [lastActionAt]);

  return (
    <>
      <CaregiverFullScreenAlertModal />
      <PatientFullScreenReminderModal />
    </>
  );
}

export default CaregiverEventBridge;
