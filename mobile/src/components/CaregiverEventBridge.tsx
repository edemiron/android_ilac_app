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

import { useCallback, useEffect, useState } from 'react';
import { Linking, Alert } from 'react-native';
import {
  useCaregiverEventHandler,
  CaregiverEventCallbacks,
} from '../services/caregiverEventHandler';
import {
  logMedicineTakenByCaregiver,
  getPatientPhoneNumber,
  subscribeToCaregivers,
} from '../services/caregiverService';
import { useAuth } from '../contexts/AuthContext';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('CaregiverEventBridge');

/**
 * caregiverId: AuthContext'ten
 * activePatientId: caregiver'in ilk aktif ilişkisinden auto-selected
 */
export function CaregiverEventBridge() {
  const { user } = useAuth();
  const caregiverId = user?.uid ?? null;

  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);

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
      Alert.alert('Aktif hasta yok', 'Önce bir hasta seçmelisiniz.');
      return;
    }

    const phone = await getPatientPhoneNumber(activePatientId);
    if (!phone) {
      log.warn('Hasta telefon numarasi yok');
      Alert.alert('Telefon bulunamadı', 'Bu hastanın telefon numarası kayıtlı değil.');
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
  }, [activePatientId]);

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

  return null;
}

export default CaregiverEventBridge;
