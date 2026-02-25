/**
 * Widget Service - Ana Ekran Widget yönetimi
 * React Native ↔ Android Widget veri iletişimi
 */

import { NativeModules, Platform } from 'react-native';
import { Medicine, ReminderTime, MedicineLog } from '../types';
import { createScopedLogger } from '../utils/logger';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const { WidgetDataModule } = NativeModules;
const log = createScopedLogger('WidgetService');

interface WidgetMedicine {
  id: string;
  name: string;
  time: string;
  dosage: string;
  reminderTimeId: string;
  color: number;
  isTaken: boolean;
  isSkipped: boolean;
  isMissed: boolean;
}

interface WidgetData {
  medicines: WidgetMedicine[];
  date: string;
  allTaken: boolean;
  totalCount: number;
}

/**
 * Bugünkü tarihi local formatta al (UTC değil!)
 * CRITICAL: toISOString() kullanma - gece saatlerinde tarih kayar
 */
function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd', { locale: tr });
}

/**
 * Bugünkü ilaçları widget için formatla (medicine logs dahil)
 */
function formatMedicinesForWidget(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  medicineLogs: MedicineLog[]
): WidgetData {
  const today = getTodayDate();
  const widgetMedicines: WidgetMedicine[] = [];

  medicines
    .filter(m => m.isActive)
    .forEach(medicine => {
      const times = reminderTimes.filter(rt => rt.medicineId === medicine.id && rt.isEnabled);

      times.forEach(time => {
        // Bugün için scheduledTime oluştur
        const scheduledTime = `${today}T${time.time}:00`;

        // Log'dan taken/skipped durumunu kontrol et
        const todayLog = medicineLogs.find(
          l =>
            l.medicineId === medicine.id &&
            l.reminderTimeId === time.id &&
            l.scheduledTime.startsWith(today)
        );

        const isTaken = todayLog?.status === 'taken';
        const isSkipped = todayLog?.status === 'skipped';
        const isMissed = !isTaken && !isSkipped && new Date() > new Date(scheduledTime);

        widgetMedicines.push({
          id: medicine.id,
          name: medicine.name,
          time: time.time,
          dosage: medicine.dosage || '',
          reminderTimeId: time.id,
          color: medicine.color || 0xff4ecdc4,
          isTaken,
          isSkipped,
          isMissed,
        });
      });
    });

  // Saate göre sırala
  const sortedMedicines = widgetMedicines.sort((a, b) => a.time.localeCompare(b.time));
  const totalCount = sortedMedicines.length;
  const takenCount = sortedMedicines.filter(m => m.isTaken).length;

  return {
    medicines: sortedMedicines,
    date: today,
    allTaken: totalCount > 0 && takenCount === totalCount,
    totalCount,
  };
}

/**
 * Widget verilerini güncelle (medicineLogs dahil)
 */
export async function updateWidgetData(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  medicineLogs: MedicineLog[] = []
): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const widgetData = formatMedicinesForWidget(medicines, reminderTimes, medicineLogs);

    // Sadece ilk 5 ilacı gönder (widget boyutları için)
    const limitedMedicines = widgetData.medicines.slice(0, 5);

    // WidgetDataModule bir array bekliyor
    await WidgetDataModule?.updateWidgetData(limitedMedicines);
  } catch (error) {
    log.error('Widget güncelleme hatası', error);
  }
}

/**
 * Widget verilerini getStore'dan çekerek güncelle
 * MedicineStore'dan çağrılacak
 */
export async function updateWidgetFromStore(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const storeData = await AsyncStorage.getItem('medicine-storage');

    if (!storeData) return;

    const { state } = JSON.parse(storeData);
    const { medicines, reminderTimes, medicineLogs } = state;

    await updateWidgetData(medicines, reminderTimes, medicineLogs);
  } catch (error) {
    log.error('Store dan widget guncelleme hatasi', error);
  }
}

/**
 * Widget'ı yenile (force update)
 */
export async function refreshWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await WidgetDataModule?.refreshWidget();
  } catch (error) {
    log.error('Widget yenileme hatası', error);
  }
}

/**
 * İlaç eklendiğinde/güncellendiğinde/silindiğinde widget'ı güncelle
 */
export function setupWidgetSync(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  medicineLogs: MedicineLog[] = []
): void {
  updateWidgetData(medicines, reminderTimes, medicineLogs);
}
