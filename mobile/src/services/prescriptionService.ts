/**
 * Prescription Service (Reçete & İlaç Yenileme Yönetim Servisi)
 *
 * Reçeteleri yerel depolamada (AsyncStorage) saklar, bitiş sürelerini
 * hesaplar, akıllı yenileme alarmlarını zamanlar ve eczane entegrasyonu sağlar.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/idGenerator';
import { createScopedLogger } from '../utils/logger';
import type { Prescription, PrescriptionInput } from '../types/prescription';

const log = createScopedLogger('PrescriptionService');
const PRESCRIPTIONS_STORAGE_KEY = '@ilachatirlatici_prescriptions_v1';

async function getExpoNotifications() {
  try {
    return await import('expo-notifications');
  } catch (_e) {
    return null;
  }
}

/**
 * Tüm reçeteleri getirir
 */
export async function getPrescriptions(): Promise<Prescription[]> {
  try {
    const raw = await AsyncStorage.getItem(PRESCRIPTIONS_STORAGE_KEY);
    if (!raw) return [];
    const list: Prescription[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    log.error('Reçeteleri getirme hatası', error);
    return [];
  }
}

/**
 * Yeni reçete kaydeder ve bitiş hatırlatmalarını planlar
 */
export async function savePrescription(input: PrescriptionInput): Promise<Prescription> {
  const prescriptions = await getPrescriptions();
  const now = new Date().toISOString();
  const newPrescription: Prescription = {
    ...input,
    id: generateId(),
    isActive: true,
    reminderDaysBefore: input.reminderDaysBefore || [3, 1],
    createdAt: now,
    updatedAt: now,
  };

  const updatedList = [newPrescription, ...prescriptions];
  await AsyncStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(updatedList));

  // Bitiş bildirimlerini zamanla
  await schedulePrescriptionNotifications(newPrescription);
  log.info('Yeni reçete kaydedildi ve alarmlar kuruldu', { id: newPrescription.id });

  return newPrescription;
}

/**
 * Reçeteyi günceller
 */
export async function updatePrescription(
  id: string,
  updates: Partial<PrescriptionInput>
): Promise<Prescription | null> {
  const prescriptions = await getPrescriptions();
  const index = prescriptions.findIndex(p => p.id === id);
  if (index === -1) return null;

  const existing = prescriptions[index];
  const updated: Prescription = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  prescriptions[index] = updated;
  await AsyncStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(prescriptions));

  // Bildirimleri yenile
  await cancelPrescriptionNotifications(id);
  if (updated.isActive) {
    await schedulePrescriptionNotifications(updated);
  }

  log.info('Reçete güncellendi', { id });
  return updated;
}

/**
 * Reçeteyi siler
 */
export async function deletePrescription(id: string): Promise<boolean> {
  const prescriptions = await getPrescriptions();
  const filtered = prescriptions.filter(p => p.id !== id);
  await AsyncStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(filtered));

  await cancelPrescriptionNotifications(id);
  log.info('Reçete silindi', { id });
  return true;
}

/**
 * Reçete bitişine kalan gün sayısını hesaplar
 */
export function getDaysUntilExpiry(expiryDateStr: string): number {
  if (!expiryDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Reçete durumunu ve rozet rengini belirler
 */
export function getPrescriptionStatus(expiryDateStr: string): {
  status: 'active' | 'expiring_soon' | 'expired';
  daysLeft: number;
  labelTr: string;
  labelEn: string;
  color: string;
} {
  const days = getDaysUntilExpiry(expiryDateStr);

  if (days < 0) {
    return {
      status: 'expired',
      daysLeft: days,
      labelTr: 'Süresi Doldu',
      labelEn: 'Expired',
      color: '#EF4444',
    };
  }

  if (days <= 7) {
    return {
      status: 'expiring_soon',
      daysLeft: days,
      labelTr: `${days === 0 ? 'Bugün Doluyor' : `${days} Gün Kaldı`}`,
      labelEn: `${days === 0 ? 'Expires Today' : `${days} Days Left`}`,
      color: '#F59E0B',
    };
  }

  return {
    status: 'active',
    daysLeft: days,
    labelTr: `${days} Gün Kaldı`,
    labelEn: `${days} Days Left`,
    color: '#10B981',
  };
}

/**
 * Reçete bitiş alarmlarını zamanlar (örn. 3 gün ve 1 gün kala sabah 09:00)
 */
export async function schedulePrescriptionNotifications(prescription: Prescription): Promise<void> {
  try {
    const notifications = await getExpoNotifications();
    if (!notifications) return;

    const daysBeforeList = prescription.reminderDaysBefore || [3, 1];
    const expiryDate = new Date(prescription.expiryDate);

    for (const daysBefore of daysBeforeList) {
      const triggerDate = new Date(expiryDate);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      triggerDate.setHours(9, 0, 0, 0); // Sabah 09:00'da uyar

      if (triggerDate.getTime() > Date.now()) {
        const identifier = `prescription_${prescription.id}_${daysBefore}days`;

        await notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: `🩺 Reçete Yenileme Hatırlatması`,
            body: `${prescription.title} reçetenizin süresi ${daysBefore} gün sonra doluyor. Doktorunuza başvurmayı unutmayın.`,
            sound: 'default',
            data: {
              type: 'prescription_reminder',
              prescriptionId: prescription.id,
            },
          },
          trigger: {
            type: notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        log.debug('Reçete bildirimi zamanlandı', { identifier, triggerDate });
      }
    }
  } catch (error) {
    log.error('Reçete bildirim zamanlama hatası', error);
  }
}

/**
 * Reçeteye ait bildirimleri iptal eder
 */
export async function cancelPrescriptionNotifications(prescriptionId: string): Promise<void> {
  try {
    const notifications = await getExpoNotifications();
    if (!notifications) return;

    const daysBeforeList = [7, 3, 1, 0];
    for (const days of daysBeforeList) {
      const identifier = `prescription_${prescriptionId}_${days}days`;
      await notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    }
  } catch (error) {
    log.error('Reçete bildirim iptal hatası', error);
  }
}
