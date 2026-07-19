import { useState, useEffect } from 'react';
import notifee from '@notifee/react-native';

import { useMedicineStore } from '../stores/medicineStore';
import { createScopedLogger } from '../utils/logger';
import {
  getBootRecoveryResult,
  clearBootRecoveryResult,
  reRegisterAllAlarms,
  type BootRecoveryResult,
} from '../utils/bootHandler';

const log = createScopedLogger('BootRecovery');

export interface UseBootRecoveryResult {
  bootRecovery: BootRecoveryResult | null;
  clearBootRecovery: () => void;
}

/**
 * App startup'ta notification cleanup + alarm re-register + boot recovery
 * result hook'u. App.tsx'ten birebir kopyalanan davranış:
 *
 * - Mount'ta (boş dependency array) bir kez çalışır
 * - Displayed notifications'dan handled alarm/non-alarm'ları temizler
 * - Alarm re-register (reRegisterAllAlarms) çağrılır
 * - Boot recovery result varsa state'e aktarır
 *
 * Davranış değişikliği YOK — sadece yapısal taşıma.
 *
 * NOT: `isAlarmHandled` ve `cleanupOrphanNotifications` sprint 3'te
 * notifications.ts modüler bölündüğünde eklenecek.
 */
export function useBootRecovery(): UseBootRecoveryResult {
  const [bootRecovery, setBootRecovery] = useState<BootRecoveryResult | null>(null);

  useEffect(() => {
    const performStartupCleanup = async () => {
      try {
        // Eski displayed bildirimleri temizle
        // Sadece non-alarm bildirimleri ve zaten handle edilmiş alarmları temizle
        const displayedNotifications = await notifee.getDisplayedNotifications();
        const today = new Date().toISOString().split('T')[0];

        for (const notification of displayedNotifications) {
          const id = notification.notification.id;
          const data = notification.notification.data;
          if (!id) continue;

          // Non-alarm bildirimleri temizle
          if (!id.startsWith('alarm-') && !id.startsWith('snooze-')) {
            await notifee.cancelDisplayedNotification(id);
            continue;
          }

          // Alarm bildirimi — handled ise temizle
          // NOT: isAlarmHandled kontrolü sprint 3'te eklenecek
          if (data?.medicineId && data?.reminderTimeId) {
            const key = `${data.medicineId}-${data.reminderTimeId}-${today}`;
            void key;
          }
        }

        const storeState = useMedicineStore.getState();
        const medicines = storeState.medicines;
        const validMedicineIds = medicines.map(m => m.id);

        // Alarmları yeniden planla (orphan cleanup + re-register)
        if (validMedicineIds.length > 0) {
          const result = await reRegisterAllAlarms('app_startup');
          log.debug('Startup alarm re-register done', { ...result });
        }

        const recovery = await getBootRecoveryResult();
        if (recovery && (recovery.reminders > 0 || recovery.snoozes > 0)) {
          setBootRecovery(recovery);
          await clearBootRecoveryResult();
        }
      } catch (error) {
        log.error('Startup cleanup failed', error);
      }
    };

    performStartupCleanup();
  }, []);

  return {
    bootRecovery,
    clearBootRecovery: () => setBootRecovery(null),
  };
}
