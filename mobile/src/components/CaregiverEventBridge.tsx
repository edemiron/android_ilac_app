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

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Linking, AppState } from 'react-native';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  useCaregiverEventHandler,
  CaregiverEventCallbacks,
} from '../services/caregiverEventHandler';
import {
  logMedicineTakenByCaregiver,
  getPatientPhoneNumber,
  subscribeToPatientsForCaregiver,
  getPatientsForCaregiver,
} from '../services/caregiverService';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { useMedicineStore } from '../stores/medicineStore';
import { dismissNotification } from '../utils/notifications';
import { createScopedLogger } from '../utils/logger';
import { useCaregiverRealtimeWatcher } from '../hooks/useCaregiverRealtimeWatcher';
import { usePatientRemoteReminderWatcher } from '../hooks/usePatientRemoteReminderWatcher';
import {
  setupCaregiverNotifications,
  setupCaregiverMessageListener,
} from '../services/caregiverNotificationService';
import { triggerCaregiverLiveAlert, isAlertDismissed } from '../services/caregiverLiveAlertService';
import { syncCaregiverWatchSchedules } from '../services/caregiverWatchScheduler';
import type { PatientInfo } from '../types';

const log = createScopedLogger('CaregiverEventBridge');

/**
 * caregiverId: AuthContext'ten
 * activePatientId: caregiver'in ilk aktif ilişkisinden auto-selected
 */
export function CaregiverEventBridge() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const effectiveCaregiverId =
    user?.uid && user.uid !== 'guest_local_user'
      ? user.uid
      : auth.currentUser?.uid || user?.uid || null;
  const effectivePatientId =
    user?.uid && user.uid !== 'guest_local_user'
      ? user.uid
      : auth.currentUser?.uid || user?.uid || null;

  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);
  const seenCaregiverActionLogIds = useRef<Set<string>>(new Set());
  const seenCaregiverAlertIds = useRef<Set<string>>(new Set());
  const seenPatientEmergencyAlertIds = useRef<Set<string>>(new Set());
  const isFirstCaregiverAlertSnapshot = useRef<boolean>(true);

  // Canlı Doz ve Uzaktan Hatırlatıcı Watcher'larını mount et
  useCaregiverRealtimeWatcher(patients, true);
  usePatientRemoteReminderWatcher(effectivePatientId, true);

  // Push token kurulumu (Arka plan bildirimleri için)
  useEffect(() => {
    if (effectiveCaregiverId) {
      setupCaregiverNotifications(effectiveCaregiverId);
    }
  }, [effectiveCaregiverId]);

  // Foreground FCM / Expo mesaj dinleyicisi
  useEffect(() => {
    const unsub = setupCaregiverMessageListener(message => {
      try {
        const data = message?.data || message?.request?.content?.data || {};
        if (data?.type === 'emergency_sos') {
          console.warn(
            '🚨 [CaregiverEventBridge] Foreground acil durum SOS mesajı yakalandı',
            JSON.stringify(data)
          );
          triggerCaregiverLiveAlert({
            alertId: data.alertId || data.id,
            patientId: data.patientId || '',
            patientName: data.patientName || 'Takip Ettiğiniz Hasta',
            medicineName: data.customNote || '🚨 Acil Durum (SOS) Çağrısı',
            status: 'sos',
            scheduledTime: data.createdAt,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        log.warn('Foreground mesaj parse hatası', err);
      }
    });

    return unsub;
  }, []);

  // 1. Bakıcının takip ettiği hastaları canlı izle (Real-time relationship sync)
  useEffect(() => {
    if (!effectiveCaregiverId) {
      setPatients([]);
      setActivePatientId(null);
      return;
    }

    console.warn(
      '🌉 [CaregiverEventBridge] Initializing patient sync for caregiverId:',
      effectiveCaregiverId
    );

    // Hemen hastaları yükle (Initial load)
    getPatientsForCaregiver(effectiveCaregiverId)
      .then(list => {
        if (list && list.length > 0) {
          console.warn(
            '🌉 [CaregiverEventBridge] Initial getPatientsForCaregiver found:',
            list.length
          );
          setPatients(list);
          const active = list.find(r => r.status === 'active');
          setActivePatientId(active?.id ?? null);
          syncCaregiverWatchSchedules(list);
        }
      })
      .catch(() => {});

    // Canlı dinleyici
    const unsubscribe = subscribeToPatientsForCaregiver(effectiveCaregiverId, relationships => {
      const activeList: PatientInfo[] = relationships.map(r => ({
        id: r.patientId,
        name: r.patientName || 'Hasta',
        email: r.caregiverEmail,
        relationshipId: r.id,
        status: r.status,
        canViewSchedule: r.canViewSchedule,
        canViewHistory: r.canViewHistory,
        canReceiveAlerts: r.canReceiveAlerts,
      }));

      console.warn(
        '🌉 [CaregiverEventBridge] subscribeToPatientsForCaregiver updated count:',
        activeList.length
      );
      setPatients(activeList);

      const active = activeList.find(r => r.status === 'active');
      setActivePatientId(active?.id ?? null);

      // Hastaların yerel izleme alarmlarını güncelle.
      syncCaregiverWatchSchedules(activeList);

      /*
       * ⚠️ v1.8.5 — FCM TOPIC ABONELIGI KALDIRILDI.
       *
       * Burada `subscribeToPatientTopics(ids)` cagriliyordu ve o fonksiyon
       * `messaging().subscribeToTopic('patient_<id>')` yapiyordu. Topic
       * aboneligi istemci tarafinda ve KIMLIK DOGRULAMASIZ; sunucuda da
       * "bu kisi gercekten bakici mi" diye soran yer yoktu. Yani uid'i
       * bilen herkes bir hastanin ilac bildirimlerini — SOS'ta telefon
       * numarasi ve konumu dahil — alabiliyordu.
       * Gonderim artik sunucuda caregiverRelationships uzerinden yetki
       * denetlenerek TOKEN'a yapiliyor (server/functions/notify.js).
       *
       * Burada yapilan tek is, guncelleme oncesinden kalan abonelikleri
       * TEMIZLEMEK: aksi halde cihazlar eski konularda asili kalir.
       */
      const ids = activeList.map(p => p.id).filter(Boolean);
      if (ids.length > 0) {
        import('../services/caregiverNotificationService').then(srv => {
          srv.unsubscribeFromLegacyPatientTopics(ids);
        });
      }
    });

    return unsubscribe;
  }, [effectiveCaregiverId]);

  const patientsKey = useMemo(
    () =>
      patients
        .map(p => p.id)
        .filter(Boolean)
        .sort()
        .join(','),
    [patients]
  );

  // 2. Bakıcıya Gelen Acil Durum (SOS) ve Doğrudan Uyarıları Canlı Dinle (/users/{caregiverId}/caregiverAlerts)
  useEffect(() => {
    if (!effectiveCaregiverId) return;

    console.warn(
      '🌉 [CaregiverEventBridge] caregiverAlerts onSnapshot listening on:',
      effectiveCaregiverId
    );
    const alertsRef = collection(db, 'users', effectiveCaregiverId, 'caregiverAlerts');

    const unsubscribe = onSnapshot(
      alertsRef,
      snapshot => {
        console.warn(
          '🌉 [CaregiverEventBridge] caregiverAlerts snapshot doc count:',
          snapshot.docs.length
        );
        snapshot.docs.forEach(d => {
          const data = d.data();
          const createdTs = data.createdAt ? new Date(data.createdAt).getTime() : 0;
          const isRecent =
            !data.createdAt ||
            isNaN(createdTs) ||
            Math.abs(Date.now() - createdTs) < 15 * 60 * 1000;
          const timeKey = `${data.patientId || ''}_${data.createdAt || ''}`;
          const isDismissed =
            isAlertDismissed(d.id) ||
            (timeKey !== '_' && isAlertDismissed(timeKey)) ||
            (data.patientId ? isAlertDismissed(`${data.patientId}_${d.id}`) : false);

          if (
            (data.type === 'emergency_sos' || data.status === 'active') &&
            isRecent &&
            !isDismissed
          ) {
            console.warn(
              '🚨 CANLI SOS UYARISI YAKALANDI (caregiverAlerts)!',
              d.id,
              JSON.stringify(data)
            );
            triggerCaregiverLiveAlert({
              alertId: d.id,
              patientId: data.patientId || '',
              patientName: data.patientName || 'Takip Ettiğiniz Hasta',
              medicineName: data.customNote || '🚨 Acil Durum (SOS) Çağrısı',
              status: 'sos',
              scheduledTime: typeof data.createdAt === 'string' ? data.createdAt : undefined,
              timestamp: Date.now(),
            });
          }
        });
      },
      err => {
        console.warn('caregiverAlerts dinleme uyarısı', err);
      }
    );

    return unsubscribe;
  }, [effectiveCaregiverId]);

  // 3. Takip Edilen Hastaların Acil Durum Koleksiyonlarını Canlı Dinle (/users/{patientId}/emergencyAlerts)
  useEffect(() => {
    if (!patients || patients.length === 0) return;

    console.warn(
      '🌉 [CaregiverEventBridge] Takip edilen hastaların emergencyAlerts dinleyicileri başlatılıyor:',
      patients.length
    );
    const unsubscribes: Array<() => void> = [];

    patients.forEach(patient => {
      if (!patient.id) return;
      try {
        const patientEmergencyRef = collection(db, 'users', patient.id, 'emergencyAlerts');

        const unsub = onSnapshot(
          patientEmergencyRef,
          snapshot => {
            console.warn(
              '🌉 [CaregiverEventBridge] patient emergencyAlerts snapshot docs:',
              patient.id,
              snapshot.docs.length
            );
            snapshot.docs.forEach(d => {
              const data = d.data();
              const createdTs = data.createdAt ? new Date(data.createdAt).getTime() : 0;
              const isRecent =
                !data.createdAt ||
                isNaN(createdTs) ||
                Math.abs(Date.now() - createdTs) < 15 * 60 * 1000;
              const timeKey = `${patient.id}_${data.createdAt || ''}`;
              const isDismissed =
                isAlertDismissed(d.id) ||
                (timeKey !== '_' && isAlertDismissed(timeKey)) ||
                isAlertDismissed(`${patient.id}_${d.id}`);

              if (
                (data.status === 'active' || data.type === 'emergency_sos') &&
                isRecent &&
                !isDismissed
              ) {
                console.warn(
                  '🚨 HASTADAN CANLI SOS UYARISI YAKALANDI (emergencyAlerts)!',
                  d.id,
                  JSON.stringify(data)
                );
                triggerCaregiverLiveAlert({
                  alertId: d.id,
                  patientId: patient.id,
                  patientName: patient.name || data.patientName || 'Takip Ettiğiniz Hasta',
                  medicineName: data.customNote || '🚨 Acil Durum (SOS) Çağrısı',
                  status: 'sos',
                  scheduledTime: typeof data.createdAt === 'string' ? data.createdAt : undefined,
                  timestamp: Date.now(),
                });
              }
            });
          },
          err => {
            console.warn('Hasta emergencyAlerts dinleme hatası:', { patientId: patient.id, err });
          }
        );
        unsubscribes.push(unsub);
      } catch (pErr) {
        console.warn('patient emergency listener kurulamadı:', { patientId: patient.id, pErr });
      }
    });

    return () => {
      unsubscribes.forEach(u => u());
    };
  }, [patientsKey]);

  // 3.1. Gerçek Zamanlı Aktif SOS Heartbeat Ticker (Uygulama açıkken her 1.5 saniyede kontrol)
  useEffect(() => {
    if (!effectiveCaregiverId && (!patients || patients.length === 0)) return;

    let isSubscribed = true;

    const pollActiveEmergencyAlerts = async () => {
      try {
        // 1. caregiverAlerts koleksiyonu doğrudan kontrolü
        if (effectiveCaregiverId) {
          const alertsRef = collection(db, 'users', effectiveCaregiverId, 'caregiverAlerts');
          const snap = await getDocs(alertsRef);
          for (const d of snap.docs) {
            const data = d.data();
            const createdTs = data.createdAt ? new Date(data.createdAt).getTime() : 0;
            const isRecent =
              !data.createdAt ||
              isNaN(createdTs) ||
              Math.abs(Date.now() - createdTs) < 15 * 60 * 1000;
            const timeKey = `${data.patientId || ''}_${data.createdAt || ''}`;
            const isDismissed =
              isAlertDismissed(d.id) ||
              (timeKey !== '_' && isAlertDismissed(timeKey)) ||
              (data.patientId ? isAlertDismissed(`${data.patientId}_${d.id}`) : false);

            if (
              (data.type === 'emergency_sos' || data.status === 'active') &&
              isRecent &&
              !isDismissed
            ) {
              if (isSubscribed) {
                console.warn('🚨 Poller buldu (caregiverAlerts)!', d.id, JSON.stringify(data));
                await triggerCaregiverLiveAlert({
                  alertId: d.id,
                  patientId: data.patientId || '',
                  patientName: data.patientName || 'Takip Ettiğiniz Hasta',
                  medicineName: data.customNote || '🚨 Acil Durum (SOS) Çağrısı',
                  status: 'sos',
                  scheduledTime: typeof data.createdAt === 'string' ? data.createdAt : undefined,
                  timestamp: Date.now(),
                });
              }
              return;
            }
          }
        }

        // 2. Takip edilen hastaların emergencyAlerts koleksiyonları kontrolü
        let targetPatients = patients;
        if ((!targetPatients || targetPatients.length === 0) && effectiveCaregiverId) {
          try {
            targetPatients = await getPatientsForCaregiver(effectiveCaregiverId);
          } catch (_pErr) {
            /* yutulan hata: bu adim best-effort, basarisizligi akisi bozmamali */
          }
        }

        for (const patient of targetPatients) {
          if (!patient.id) continue;
          const patientEmergencyRef = collection(db, 'users', patient.id, 'emergencyAlerts');
          const snap = await getDocs(patientEmergencyRef);
          for (const d of snap.docs) {
            const data = d.data();
            const createdTs = data.createdAt ? new Date(data.createdAt).getTime() : 0;
            const isRecent =
              !data.createdAt ||
              isNaN(createdTs) ||
              Math.abs(Date.now() - createdTs) < 15 * 60 * 1000;
            const timeKey = `${patient.id}_${data.createdAt || ''}`;
            const isDismissed =
              isAlertDismissed(d.id) ||
              (timeKey !== '_' && isAlertDismissed(timeKey)) ||
              isAlertDismissed(`${patient.id}_${d.id}`);

            if (
              (data.status === 'active' || data.type === 'emergency_sos') &&
              isRecent &&
              !isDismissed
            ) {
              if (isSubscribed) {
                console.warn(
                  '🚨 Poller buldu (patient emergencyAlerts)!',
                  d.id,
                  JSON.stringify(data)
                );
                await triggerCaregiverLiveAlert({
                  alertId: d.id,
                  patientId: patient.id,
                  patientName: patient.name || data.patientName || 'Takip Ettiğiniz Hasta',
                  medicineName: data.customNote || '🚨 Acil Durum (SOS) Çağrısı',
                  status: 'sos',
                  scheduledTime: typeof data.createdAt === 'string' ? data.createdAt : undefined,
                  timestamp: Date.now(),
                });
              }
              return;
            }
          }
        }
      } catch (_err) {
        // Sessiz yakala
      }
    };

    // İlk mountta hemen kontrol et
    pollActiveEmergencyAlerts();

    // AppState aktif olduğunda kontrol et (arka plandan ön plana dönüşte)
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        pollActiveEmergencyAlerts();
      }
    });

    return () => {
      isSubscribed = false;
      appStateSub.remove();
    };
  }, [effectiveCaregiverId, patientsKey]);

  // 4. Hasta Cihazı Dinleyicisi: Bakıcı "Hasta Aldı" dediğinde yerel alarmları ve mağazayı güncelle
  useEffect(() => {
    if (!effectivePatientId) return;

    let isInitialLoad = true;
    const logsRef = collection(db, 'users', effectivePatientId, 'medicineLogs');

    const unsubscribe = onSnapshot(
      logsRef,
      snapshot => {
        if (isInitialLoad) {
          snapshot.docs.forEach(d => seenCaregiverActionLogIds.current.add(d.id));
          isInitialLoad = false;
          return;
        }

        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as any;
            const logId = change.doc.id;

            if (seenCaregiverActionLogIds.current.has(logId)) return;
            seenCaregiverActionLogIds.current.add(logId);

            // Bakıcı tarafından işaretlendiyse
            if (data.source === 'caregiver_action' && data.status === 'taken') {
              log.info('Bakıcı tarafından ilaç alındı işareti yakalandı!', {
                medicineName: data.medicineName,
                scheduledTime: data.scheduledTime,
              });

              // Yerel store'u güncelle ve bildirimleri temizle
              const store = useMedicineStore.getState();
              const med = store.medicines.find(
                m => m.name.toLowerCase() === (data.medicineName || '').toLowerCase()
              );
              const rt = med
                ? store.reminderTimes.find(
                    r =>
                      r.medicineId === med.id &&
                      (r.time === data.scheduledTime || data.scheduledTime?.includes(r.time))
                  )
                : null;

              if (med && rt) {
                store.logMedicineTaken(
                  rt.id,
                  data.scheduledTime || rt.time,
                  med.id,
                  'Bakıcınız tarafından işaretlendi'
                );
                // Yerel bildirimi sustur (alarm ve reminder kimlikleriyle)
                dismissNotification(rt.id).catch(() => {});
                dismissNotification(`alarm-${med.id}-${rt.id}`).catch(() => {});
              }

              // Yerel bildirimi sustur (Firestore log ID fallback)
              dismissNotification(logId).catch(() => {});

              showAlert({
                type: 'success',
                title: 'İlaç Alındı İşaretlendi',
                message: `Bakıcınız ${data.medicineName || 'ilacınızı'} aldığınızı doğruladı.`,
              });
            }
          }
        });
      },
      err => {
        log.warn('Hasta tarafı medicineLogs dinleme hatası', err);
      }
    );

    return unsubscribe;
  }, [effectivePatientId, showAlert]);

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
  }, []);

  const callbacks: CaregiverEventCallbacks = {
    onPatientTook: handlePatientTook,
    onCallPatient: handleCallPatient,
    onDismiss: handleDismiss,
  };

  // Hook'u mount et — useEffect içinde otomatik cleanup yapılır.
  useCaregiverEventHandler(callbacks);

  useEffect(() => {
    if (lastActionAt !== null) {
      log.debug('Last caregiver action timestamp', { lastActionAt });
    }
  }, [lastActionAt]);

  // CaregiverEventBridge sadece arka plan event/watcher köprüsüdür.
  // Modallar App.tsx içinde tek ve merkezi olarak render edilir (çift modal açılmasını engeller).
  return null;
}

export default CaregiverEventBridge;
