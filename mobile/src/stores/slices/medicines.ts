/**
 * Medicines slice factory — Sprint 46 (combine refactor).
 *
 * Hem isolated `useMedicinesStore` (geriye uyumlu) hem de `createMedicinesSlice`
 * factory (combine için) export eder.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../../utils/logger';
import { generateId } from '../../utils/idGenerator';
import { calculateMedicineTimes } from '../../utils/timeCalculator';
import { MEDICINE_COLORS } from '../../constants';
import type { Medicine, ReminderTime, UserSettings } from '../../types';

const log = createScopedLogger('MedicinesSlice');

export interface MedicinesSlice {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];

  /** Yeni ilac ekle (ID uretilir, reminder times otomatik hesaplanir) */
  addMedicine: (
    medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> &
      Partial<Pick<Medicine, 'id' | 'customTimes' | 'isActive'>>,
    settings?: Pick<UserSettings, 'wakeUpTime' | 'sleepTime'>
  ) => string;

  /** Mevcut ilaci guncelle */
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;

  /** Ilac sil (ve iliskili reminder times'lari da temizle) */
  deleteMedicine: (id: string) => void;

  /** Ilacin aktif/pasif durumunu degistir */
  toggleMedicineActive: (id: string) => void;

  /** ID'ye gore ilac getir */
  getMedicineById: (id: string) => Medicine | undefined;

  /** ID'ye gore reminder times getir */
  getReminderTimesForMedicine: (medicineId: string) => ReminderTime[];

  /** Reminder time ekle */
  addReminderTime: (reminderTime: Omit<ReminderTime, 'id'>) => string | null;

  /** Reminder time guncelle */
  updateReminderTime: (id: string, updates: Partial<ReminderTime>) => void;

  /** Reminder time sil */
  deleteReminderTime: (id: string) => void;

  /** Tum medicines ve reminder times'i temizle */
  clearAllMedicines: () => void;

  /**
   * Sprint 4 devami: getNextAvailableColor.
   *
   * Aktif ilaclarin renklerine gore siradaki uygun rengi secer.
   * medicineStore.ts'deki getNextAvailableColor wrapper'inin
   * kaynak implementasyonu.
   */
  getNextAvailableColor: () => string;
}

/**
 * Sprint 46: Medicines slice factory.
 *
 * combine() ile diger slice'lara dahil etmek icin `(set, get) => slice`
 * formunda. Ayni logic isolated `useMedicinesStore` ile birebir ayni.
 */
export function createMedicinesSlice(
  set: (
    partial: Partial<MedicinesSlice> | ((s: MedicinesSlice) => Partial<MedicinesSlice>)
  ) => void,
  get: () => MedicinesSlice
): MedicinesSlice {
  return {
    medicines: [],
    reminderTimes: [],

    addMedicine: (medicine, settings) => {
      const id = medicine.id ?? generateId();
      const now = new Date().toISOString();
      const wakeUpTime = settings?.wakeUpTime ?? '08:00';
      const sleepTime = settings?.sleepTime ?? '23:00';

      // Renk: yoksa mevcut renklerden ilk kullanilmayan
      const usedColors = new Set(get().medicines.map(m => m.color));
      const availableColor =
        medicine.color || MEDICINE_COLORS.find(c => !usedColors.has(c)) || MEDICINE_COLORS[0];

      const newMedicine: Medicine = {
        ...medicine,
        id,
        color: availableColor,
        isActive: medicine.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };

      set(state => {
        // Reminder times otomatik hesapla
        // NOT: customTimes varsa medicineStore davranışıyla uyumlu
        // ${medicineId}_${index} formatı kullanılır (regenerateReminderTimes
        // ile tutarlı). calculateMedicineTimes'tan gelen reminder'lar için
        // generateId() kullanılır (time.time alanı ile birlikte).
        const newReminders = medicine.customTimes
          ? medicine.customTimes.map((time, index) => ({
              id: `${id}_${index}`,
              medicineId: id,
              time,
              isEnabled: true,
            }))
          : calculateMedicineTimes(id, {
              wakeUpTime,
              sleepTime,
              frequency: medicine.frequency,
              instruction: medicine.instructions,
            }).map(time => ({
              id: generateId(),
              medicineId: id,
              time: time.time,
              isEnabled: time.isEnabled ?? true,
            }));

        return {
          medicines: [...state.medicines, newMedicine],
          reminderTimes: [...state.reminderTimes, ...newReminders],
        };
      });

      log.info('Medicine added', { id, name: newMedicine.name });
      return id;
    },

    updateMedicine: (id, updates) => {
      const now = new Date().toISOString();
      set(state => ({
        medicines: state.medicines.map(m =>
          m.id === id ? { ...m, ...updates, updatedAt: now } : m
        ),
      }));
    },

    deleteMedicine: id => {
      set(state => ({
        medicines: state.medicines.filter(m => m.id !== id),
        reminderTimes: state.reminderTimes.filter(rt => rt.medicineId !== id),
      }));
      log.info('Medicine deleted', { id });
    },

    toggleMedicineActive: id => {
      const now = new Date().toISOString();
      set(state => ({
        medicines: state.medicines.map(m =>
          m.id === id ? { ...m, isActive: !m.isActive, updatedAt: now } : m
        ),
      }));
    },

    getMedicineById: id => get().medicines.find(m => m.id === id),

    getReminderTimesForMedicine: medicineId =>
      get().reminderTimes.filter(rt => rt.medicineId === medicineId),

    addReminderTime: reminderTime => {
      const id = generateId();
      set(state => ({
        reminderTimes: [...state.reminderTimes, { ...reminderTime, id }],
      }));
      return id;
    },

    updateReminderTime: (id, updates) => {
      set(state => ({
        reminderTimes: state.reminderTimes.map(rt => (rt.id === id ? { ...rt, ...updates } : rt)),
      }));
    },

    deleteReminderTime: id => {
      set(state => ({
        reminderTimes: state.reminderTimes.filter(rt => rt.id !== id),
      }));
    },

    clearAllMedicines: () => {
      set({ medicines: [], reminderTimes: [] });
    },

    // Sprint 4 devami: medicineStore.getNextAvailableColor delegasyonu
    // Aktif ilaclarin renklerinden en az kullanilan / kullanilmamis rengi secer.
    getNextAvailableColor: () => {
      const { medicines } = get();
      const usedColors = medicines.filter(m => m.isActive).map(m => m.color);

      // İlk kullanılmayan rengi bul
      const unusedColor = MEDICINE_COLORS.find((color: string) => !usedColors.includes(color));
      if (unusedColor) {
        return unusedColor;
      }

      // Tum renkler kullaniliyorsa en az kullanilan rengi bul
      const colorCounts = new Map<string, number>();
      MEDICINE_COLORS.forEach((color: string) => colorCounts.set(color, 0));
      usedColors.forEach(color => {
        colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
      });

      let minCount = Infinity;
      let leastUsedColor: string = MEDICINE_COLORS[0];
      colorCounts.forEach((count, color) => {
        if (count < minCount) {
          minCount = count;
          leastUsedColor = color;
        }
      });
      return leastUsedColor;
    },
  };
}

/**
 * Medicines slice icin basit Zustand store.
 *
 * Davranis: mevcut medicineStore'daki medicines + reminderTimes
 * ile ayni mantikta. Sprint 4 sonunda combine() ile medicineStore'a
 * entegre edilecek.
 */
export const useMedicinesStore = create<MedicinesSlice>()(
  persist((set, get) => createMedicinesSlice(set, get), {
    name: 'ilac-app-medicines-storage',
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
  })
);
