/**
 * Medicines slice factory — Sprint 46 + Design Pattern Refactor
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
import {
  updateMedicineInList,
  findMedicineById,
  filterReminderTimesByMedicine,
  filterLowStockMedicines,
} from '../medicineStoreHelpers';
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

  /** Zamanlari yeniden hesapla */
  regenerateReminderTimes: (
    medicineId: string,
    settings?: Pick<UserSettings, 'wakeUpTime' | 'sleepTime'>
  ) => void;

  /** Stok azalan ilaclari getir */
  getLowStockMedicines: () => Medicine[];

  /** Ilac stok miktarini guncelle */
  updateMedicineStock: (medicineId: string, newCount: number) => void;

  /** Stok miktarini dusur */
  decrementStock: (medicineId: string, amount?: number) => void;

  /** Tum medicines ve reminder times'i temizle */
  clearAllMedicines: () => void;

  /** Aktif ilaclarin renklerine gore siradaki uygun rengi secer */
  getNextAvailableColor: () => string;
}

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
      set(state => ({
        medicines: updateMedicineInList(state.medicines, id, updates),
      }));
    },

    deleteMedicine: id => {
      set(state => ({
        medicines: state.medicines.filter(m => m.id !== id),
        reminderTimes: filterReminderTimesByMedicine(state.reminderTimes, id, true),
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

    getMedicineById: id => findMedicineById(get().medicines, id),

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

    regenerateReminderTimes: (medicineId, settings) => {
      const { medicines, reminderTimes } = get();
      const medicine = findMedicineById(medicines, medicineId);
      if (!medicine) return;

      if (medicine.customTimes && medicine.customTimes.length > 0) {
        const otherTimes = filterReminderTimesByMedicine(reminderTimes, medicineId, true);
        const newTimes = medicine.customTimes.map((time, index) => ({
          id: `${medicineId}_${index}`,
          medicineId,
          time,
          isEnabled: true,
        }));
        set({ reminderTimes: [...otherTimes, ...newTimes] });
        return;
      }

      const otherTimes = filterReminderTimesByMedicine(reminderTimes, medicineId, true);
      const newTimes = calculateMedicineTimes(medicineId, {
        wakeUpTime: settings?.wakeUpTime ?? '08:00',
        sleepTime: settings?.sleepTime ?? '23:00',
        frequency: medicine.frequency,
        instruction: medicine.instructions,
      });

      set({ reminderTimes: [...otherTimes, ...newTimes] });
    },

    getLowStockMedicines: () => {
      return filterLowStockMedicines(get().medicines);
    },

    updateMedicineStock: (medicineId, newCount) => {
      set(state => ({
        medicines: updateMedicineInList(state.medicines, medicineId, {
          stockCount: Math.max(0, newCount),
        }),
      }));
    },

    decrementStock: (medicineId, amount = 1) => {
      const { medicines } = get();
      const medicine = findMedicineById(medicines, medicineId);
      if (!medicine || !medicine.stockEnabled) return;

      const currentStock = medicine.stockCount ?? 0;
      const newStock = Math.max(0, currentStock - amount);

      set(state => ({
        medicines: updateMedicineInList(state.medicines, medicineId, { stockCount: newStock }),
      }));
    },

    clearAllMedicines: () => {
      set({ medicines: [], reminderTimes: [] });
    },

    getNextAvailableColor: () => {
      const { medicines } = get();
      const usedColors = medicines.filter(m => m.isActive).map(m => m.color);

      const unusedColor = MEDICINE_COLORS.find((color: string) => !usedColors.includes(color));
      if (unusedColor) {
        return unusedColor;
      }

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

export const useMedicinesStore = create<MedicinesSlice>()(
  persist((set, get) => createMedicinesSlice(set, get), {
    name: 'ilac-app-medicines-storage',
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
  })
);
