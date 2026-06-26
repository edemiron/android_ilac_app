/**
 * Medicines slice — ilaç CRUD + reminder times.
 *
 * Sprint 4 (medicineStore slice mimarisi) kapsaminda ikinci slice.
 * Bu slice, medicineStore.ts'deki medicine/reminderTimes state'ini
 * izole bir Zustand store'a alir.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../../utils/logger';
import { generateId } from '../../utils/idGenerator';
import { calculateMedicineTimes } from '../../utils/timeCalculator';
import { MEDICINE_COLORS } from '../../constants';
import type { Medicine, ReminderTime } from '../../types';

const log = createScopedLogger('MedicinesSlice');

export interface MedicinesSlice {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];

  /** Yeni ilac ekle (ID uretilir, reminder times otomatik hesaplanir) */
  addMedicine: (
    medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<Medicine, 'id' | 'customTimes'>>
  ) => string | null;

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
}

/**
 * Medicines slice icin basit Zustand store.
 *
 * Davranis: mevcut medicineStore'daki medicines + reminderTimes
 * ile ayni mantikta. Sprint 4 sonunda combine() ile medicineStore'a
 * entegre edilecek.
 */
export const useMedicinesStore = create<MedicinesSlice>()(
  persist(
    (set, get) => ({
      medicines: [],
      reminderTimes: [],

      addMedicine: medicine => {
        const id = medicine.id ?? generateId();
        const now = new Date().toISOString();

        // Renk: yoksa mevcut renklerden ilk kullanilmayan
        const usedColors = new Set(get().medicines.map(m => m.color));
        const availableColor =
          medicine.color ||
          MEDICINE_COLORS.find(c => !usedColors.has(c)) ||
          MEDICINE_COLORS[0];

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
          // NOT: calculateMedicineTimes gerçek API'si options bekliyor;
          // mevcut tek basit yapiyi korumak icin burada hardcoded kullanildi.
          // Sprint 4'ün tamamlanmasinda settings slice'a baglanacak.
          const newReminders = medicine.customTimes
            ? medicine.customTimes.map(time => ({
                id: generateId(),
                medicineId: id,
                time,
                isEnabled: true,
              }))
            : calculateMedicineTimes(id, {
                wakeUpTime: '08:00',
                sleepTime: '23:00',
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
          reminderTimes: [
            ...state.reminderTimes,
            { ...reminderTime, id },
          ],
        }));
        return id;
      },

      updateReminderTime: (id, updates) => {
        set(state => ({
          reminderTimes: state.reminderTimes.map(rt =>
            rt.id === id ? { ...rt, ...updates } : rt
          ),
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
    }),
    {
      name: 'ilac-app-medicines-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);