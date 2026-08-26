/**
 * Caregiver Watch Scheduler Service
 *
 * Takip edilen hastaların ilaç saatlerinde bakıcının telefonunda
 * yerel donanım alarmları / bildirimleri (Notifee Trigger Notification) planlar.
 *
 * Bu sayede:
 * - İnternet kesilse bile,
 * - Uygulama tamamen kapalı olsa bile,
 * - Push sunucularında gecikme olsa bile,
 *
 * Bakıcının telefonu tam doz saatinde yerel olarak çalar ve bildirimi ekrana basar.
 */

import notifee, {
  TimestampTrigger,
  TriggerType,
  AlarmType,
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';
import { createScopedLogger } from '../utils/logger';
import { getPatientFullSchedule } from './caregiverService';
import type { PatientInfo } from '../types';

const log = createScopedLogger('CaregiverWatchScheduler');

const CAREGIVER_WATCH_CHANNEL = 'caregiver-live-alerts-v1';

/**
 * Takip edilen tüm hastalar için yerel doz takip bildirimlerini planla
 */
export async function syncCaregiverWatchSchedules(patients: PatientInfo[]): Promise<void> {
  try {
    if (!patients || patients.length === 0) {
      log.debug('Planlanacak hasta yok');
      return;
    }

    log.info('Hastalar için yerel takip bildirimleri planlanıyor', {
      count: patients.length,
    });

    for (const patient of patients) {
      if (!patient.id) continue;
      await schedulePatientDoseWatches(patient.id, patient.name || 'Hastanız');
    }
  } catch (error) {
    log.error('syncCaregiverWatchSchedules hata', error);
  }
}

/**
 * Belirli bir hasta için bugünkü dozları yerel olarak planla
 */
export async function schedulePatientDoseWatches(
  patientId: string,
  patientName: string
): Promise<void> {
  try {
    const fullSchedule = await getPatientFullSchedule(patientId);
    if (!fullSchedule || !fullSchedule.reminderTimes || fullSchedule.reminderTimes.length === 0) {
      log.debug('Hasta için planlanacak doz bulunamadı', { patientId });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const todayDoses = (fullSchedule.reminderTimes || [])
      .map((rt: any) => {
        const med = (fullSchedule.medicines || []).find((m: any) => m.id === rt.medicineId) || {
          name: rt.medicineName || 'İlaç',
          dosage: '',
        };

        const matchingLog = (fullSchedule.logs || []).find(
          (l: any) =>
            l.medicineId === rt.medicineId &&
            ((l.scheduledTime && l.scheduledTime.includes(rt.time)) ||
              (l.takenAt && l.takenAt.startsWith(todayStr)))
        );

        return {
          reminderTimeId: rt.id,
          medicineId: rt.medicineId,
          medicineName: med.name || 'İlaç',
          dosage: med.dosage || '',
          time: rt.time || '12:00',
          status: matchingLog ? matchingLog.status : 'pending',
          scheduledTime: `${todayStr}T${rt.time || '12:00'}:00`,
        };
      })
      .sort((a: any, b: any) => a.time.localeCompare(b.time));

    const now = Date.now();

    for (const dose of todayDoses) {
      const scheduledDate = new Date(dose.scheduledTime);
      const doseTimeMs = scheduledDate.getTime();

      // Geçmiş dozları atla (son 5 dakikadan eski olanlar)
      if (doseTimeMs < now - 5 * 60 * 1000) {
        continue;
      }

      // Halihazırda alınmış dozları atla
      if (dose.status === 'taken') {
        continue;
      }

      const notifId = `caregiver_watch_${patientId}_${dose.medicineId}_${dose.reminderTimeId}_${dose.time.replace(':', '')}`;
      const timeStr = dose.time;

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Math.max(doseTimeMs, now + 5000), // En az 5 sn sonra
        alarmManager: {
          allowWhileIdle: true,
          type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
        },
      };

      const title = `💊 ${patientName} • ${dose.medicineName} (${timeStr})`;
      const body = `${dose.dosage ? `${dose.dosage} - ` : ''}İlaç saati geldi. Durumu kontrol etmek veya hatırlatmak için dokunun.`;

      await notifee.createTriggerNotification(
        {
          id: notifId,
          title,
          body,
          android: {
            channelId: CAREGIVER_WATCH_CHANNEL,
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            pressAction: {
              id: 'default',
            },
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
          },
          data: {
            type: 'caregiver_watch_dose',
            patientId,
            patientName,
            medicineId: dose.medicineId,
            medicineName: dose.medicineName,
            scheduledTime: dose.scheduledTime,
          },
        },
        trigger
      );

      log.debug('Hasta dozu için yerel takip bildirimi planlandı', {
        patientName,
        medicine: dose.medicineName,
        time: timeStr,
        notifId,
      });
    }
  } catch (error) {
    log.error('schedulePatientDoseWatches hata', { patientId, error });
  }
}
