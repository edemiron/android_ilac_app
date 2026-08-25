/**
 * useCaregiverRealtimeWatcher — Takip Edilen Hastaların Canlı Doz Dinleyicisi
 *
 * Bakıcının takip ettiği hastaların Firestore `medicineLogs` koleksiyonunu
 * gerçek zamanlı dinler. Hasta ilacını aldığında veya atladığında anında
 * sistem bildirimi + tam ekran canlı uyarı fırlatır.
 */

import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PatientInfo } from '../types';
import { triggerCaregiverLiveAlert } from '../services/caregiverLiveAlertService';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('useCaregiverRealtimeWatcher');

export function useCaregiverRealtimeWatcher(patients: PatientInfo[], enabled = true) {
  // İlk yüklemedeki eski logları alert yapmamak için snapshot timestamp referansı
  const initialLoadTimeRef = useRef<number>(Date.now());
  const seenLogIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !patients || patients.length === 0) {
      return;
    }

    log.info('Canlı hasta dinleyicileri başlatılıyor', { count: patients.length });
    const unsubscribes: Array<() => void> = [];

    patients.forEach(patient => {
      if (!patient.id) return;

      try {
        const logsRef = collection(db, 'users', patient.id, 'medicineLogs');
        const q = query(logsRef, orderBy('takenAt', 'desc'), limit(10));

        const unsub = onSnapshot(
          q,
          snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added' || change.type === 'modified') {
                const logData = change.doc.data() as any;
                const logId = change.doc.id;

                // Daha önce görüldüyse veya listener başlamadan önceki eskiyse atla
                if (seenLogIdsRef.current.has(logId)) {
                  return;
                }
                seenLogIdsRef.current.add(logId);

                // Log zamanı kontrolü (son 5 dakika içinde veya listener başladıktan sonra)
                const logTimestamp = logData.takenAt
                  ? new Date(logData.takenAt).getTime()
                  : logData.createdAtServer?.toMillis
                    ? logData.createdAtServer.toMillis()
                    : Date.now();

                // Eğer listener açıldıktan hemen sonra gelen yepyeni bir log ise bildir
                const isRecent = logTimestamp > initialLoadTimeRef.current - 60000;

                if (isRecent && (logData.status === 'taken' || logData.status === 'skipped')) {
                  log.info('Yeni canlı hasta doz hareketi yakalandı!', {
                    patient: patient.name,
                    medicine: logData.medicineName,
                    status: logData.status,
                  });

                  triggerCaregiverLiveAlert({
                    patientId: patient.id,
                    patientName: patient.name || 'Hastanız',
                    medicineName: logData.medicineName || 'İlaç',
                    status: logData.status,
                    scheduledTime: logData.scheduledTime,
                    takenAt: logData.takenAt,
                    timestamp: Date.now(),
                  });
                }
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
