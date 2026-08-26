/**
 * usePatientRemoteReminderWatcher — Hasta Telefonunda Uzaktan Hatırlatma Dinleyicisi
 *
 * Hasta oturum açtığında Firestore `users/{patientId}/remoteReminders` koleksiyonunu
 * canlı dinler. Bakıcıdan gelen yeni hatırlatmaları anında sesli bildirim ve tam ekran modala yönlendirir.
 */

import { useEffect, useRef } from 'react';
import { subscribeToPatientRemoteReminders } from '../services/caregiverService';
import { triggerPatientRemoteReminder } from '../services/patientRemoteReminderService';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('usePatientRemoteReminderWatcher');

export function usePatientRemoteReminderWatcher(
  patientId: string | null | undefined,
  enabled = true
) {
  const seenReminderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !patientId) {
      return;
    }

    log.info('Hasta uzaktan hatırlatma dinleyicisi başlatılıyor', { patientId });

    let isFirstSnapshot = true;

    const unsubscribe = subscribeToPatientRemoteReminders(patientId, reminders => {
      // İlk snapshot'ta var olan eski teslim edilmişleri gördük say
      if (isFirstSnapshot) {
        reminders.forEach(r => seenReminderIdsRef.current.add(r.id));
        isFirstSnapshot = false;
        log.debug('İlk uzaktan hatırlatma snapshotı yüklendi', { count: reminders.length });
        return;
      }

      // Yeni gelen hatırlatmalar
      reminders.forEach(reminder => {
        if (seenReminderIdsRef.current.has(reminder.id)) {
          return;
        }
        seenReminderIdsRef.current.add(reminder.id);

        log.info('Yeni bakıcı hatırlatması yakalandı!', {
          caregiver: reminder.caregiverName,
          medicine: reminder.medicineName,
        });

        triggerPatientRemoteReminder(reminder);
      });
    });

    return () => {
      log.info('Hasta uzaktan hatırlatma dinleyicisi kapatılıyor');
      unsubscribe();
    };
  }, [patientId, enabled]);
}
