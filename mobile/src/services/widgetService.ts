/**
 * Widget Service - Ana Ekran Widget yönetimi
 * React Native ↔ Android Widget veri iletişimi
 */

import { NativeModules, Platform } from 'react-native';
import { Medicine, ReminderTime } from '../types';
import { createScopedLogger } from '../utils/logger';

const { WidgetDataModule } = NativeModules;
const log = createScopedLogger('WidgetService');

interface WidgetMedicine {
  id: string;
  name: string;
  time: string;
  dosage: string;
  reminderTimeId: string;
  color: number;
}

/**
 * Bugünkü ilaçları widget için formatla
 */
function formatMedicinesForWidget(
  medicines: Medicine[],
  reminderTimes: ReminderTime[]
): WidgetMedicine[] {
  const today = new Date().toISOString().split('T')[0];
  const widgetMedicines: WidgetMedicine[] = [];

  medicines
    .filter(m => m.isActive)
    .forEach(medicine => {
      const times = reminderTimes.filter(rt => rt.medicineId === medicine.id);

      times.forEach(time => {
        widgetMedicines.push({
          id: medicine.id,
          name: medicine.name,
          time: time.time,
          dosage: medicine.dosage || '',
          reminderTimeId: time.id,
          color: medicine.color || 0xff4ecdc4,
        });
      });
    });

  // Saate göre sırala
  return widgetMedicines.sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Widget verilerini güncelle
 */
export async function updateWidgetData(
  medicines: Medicine[],
  reminderTimes: ReminderTime[]
): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const widgetData = formatMedicinesForWidget(medicines, reminderTimes);

    // Sadece ilk 5 ilacı gönder (widget boyutları için)
    const limitedData = widgetData.slice(0, 5);

    await WidgetDataModule?.updateWidgetData(limitedData);
  } catch (error) {
    log.error('Widget güncelleme hatası', error);
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
export function setupWidgetSync(medicines: Medicine[], reminderTimes: ReminderTime[]): void {
  updateWidgetData(medicines, reminderTimes);
}
