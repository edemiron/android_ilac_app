/**
 * useCaregiverRealtimeWatcher — Takip Edilen Hastaların Canlı Doz Dinleyicisi
 *
 * Bakıcının takip ettiği hastaların Firestore `medicineLogs` koleksiyonunu
 * gerçek zamanlı dinler. Hasta ilacını aldığında veya atladığında anında
 * sistem bildirimi + tam ekran canlı uyarı fırlatır.
 */

import { useEffect, useRef } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PatientInfo } from '../types';
import { triggerCaregiverLiveAlert } from '../services/caregiverLiveAlertService';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('useCaregiverRealtimeWatcher');

export function useCaregiverRealtimeWatcher(patients: PatientInfo[], enabled = true) {
  const seenLogIdsRef = useRef<Set<string>>(new Set());
  const patientMedicinesCacheRef = useRef<Map<string, Map<string, string>>>(new Map());

  useEffect(() => {
    if (!enabled || !patients || patients.length === 0) {
      return;
    }

    log.info('Canlı hasta dinleyicileri başlatılıyor', { count: patients.length });
    const unsubscribes: Array<() => void> = [];

    patients.forEach(patient => {
      if (!patient.id) return;

      // Hastanın ilaç isim kataloğunu önbelleğe al
      const loadPatientMeds = async () => {
        try {
          const medsRef = collection(db, 'users', patient.id, 'medicines');
          const snap = await getDocs(medsRef);
          const map = new Map<string, string>();
          snap.forEach(d => {
            const data = d.data();
            if (data?.name) {
              map.set(d.id, data.name);
            }
          });
          patientMedicinesCacheRef.current.set(patient.id, map);
        } catch (mErr) {
          log.warn('Hasta ilaç kataloğu okunamadı', { patientId: patient.id, mErr });
        }
      };

      loadPatientMeds();

      try {
        const logsRef = collection(db, 'users', patient.id, 'medicineLogs');
        let isFirstSnapshot = true;

        const unsub = onSnapshot(
          logsRef,
          snapshot => {
            // İlk yüklemede mevcut tüm geçmiş logları "görüldü" olarak işaretle (eski log uyarısı verme)
            if (isFirstSnapshot) {
              snapshot.docs.forEach(doc => {
                seenLogIdsRef.current.add(doc.id);
              });
              isFirstSnapshot = false;
              log.debug('İlk snapshot logları yüklendi, canlı dinleme aktif', {
                patientId: patient.id,
                existingLogsCount: snapshot.docs.length,
              });
              return;
            }

            // İlk yüklemeden sonra gelen gerçek zamanlı değişiklikler
            snapshot.docChanges().forEach(async change => {
              if (change.type === 'added' || change.type === 'modified') {
                const logData = change.doc.data() as any;
                const logId = change.doc.id;

                // Daha önce görüldüyse atla
                if (seenLogIdsRef.current.has(logId) && change.type !== 'modified') {
                  return;
                }
                seenLogIdsRef.current.add(logId);

                const status = logData.status as 'taken' | 'skipped' | 'missed';
                if (status !== 'taken' && status !== 'skipped') {
                  return;
                }

                // İlaç ismini çözümle (log içindeki medicineName veya ilaç kataloğundan)
                let resolvedMedicineName = logData.medicineName;
                if (!resolvedMedicineName || resolvedMedicineName === 'İlaç') {
                  const medsMap = patientMedicinesCacheRef.current.get(patient.id);
                  if (medsMap && logData.medicineId && medsMap.has(logData.medicineId)) {
                    resolvedMedicineName = medsMap.get(logData.medicineId);
                  }
                }

                if (!resolvedMedicineName) {
                  resolvedMedicineName = 'İlaç';
                }

                log.info('Yeni canlı hasta doz hareketi yakalandı!', {
                  patient: patient.name,
                  medicine: resolvedMedicineName,
                  status,
                });

                await triggerCaregiverLiveAlert({
                  patientId: patient.id,
                  patientName: patient.name || 'Hastanız',
                  medicineName: resolvedMedicineName,
                  status,
                  scheduledTime: logData.scheduledTime,
                  takenAt: logData.takenAt,
                  timestamp: Date.now(),
                });
              }
            });
          },
          err => {
            log.warn('Hasta log dinleme hatası:', { patientId: patient.id, error: err?.message });
          }
        );

        unsubscribes.push(unsub);
      } catch (err) {
        log.error('Listener oluşturma hatası', { patientId: patient.id, err });
      }
    });

    return () => {
      log.info('Canlı hasta dinleyicileri kapatılıyor');
      unsubscribes.forEach(unsub => unsub());
    };
  }, [patients, enabled]);
}
