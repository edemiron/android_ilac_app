/**
 * Logs slice — medicineLogs state + log/undo logic.
 *
 * Sprint 4 (medicineStore slice mimarisi) kapsaminda ucuncu slice.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../../utils/logger';
import { generateId } from '../../utils/idGenerator';
import type { MedicineLog } from '../../types';

const log = createScopedLogger('LogsSlice');

export interface LogsSlice {
  medicineLogs: MedicineLog[];

  /** Medicine alindi olarak logla */
  logMedicineTaken: (
    reminderTimeId: string,
    scheduledTime: string,
    options?: { medicineId?: string; note?: string }
  ) => string;

  /** Medicine atlandi olarak logla */
  logMedicineSkipped: (
    reminderTimeId: string,
    scheduledTime: string,
    options?: { medicineId?: string; note?: string }
  ) => string;

  /** Medicine kaçirildi olarak logla */
  logMedicineMissed: (
    reminderTimeId: string,
    scheduledTime: string,
    options?: { medicineId?: string }
  ) => string;

  /** Log sil */
  deleteLog: (logId: string) => void;

  /** Bugun bu hatirlatma icin log var mi kontrol et */
  hasLogFor: (reminderTimeId: string, date: string) => MedicineLog | undefined;

  /** Tum loglari temizle */
  clearAllLogs: () => void;
}

/**
 * Logs slice icin basit Zustand store.
 */
export const useLogsStore = create<LogsSlice>()(
  persist(
    set => ({
      medicineLogs: [],

      logMedicineTaken: (reminderTimeId, scheduledTime, options) => {
        const id = generateId();
        const newLog: MedicineLog = {
          id,
          reminderTimeId,
          medicineId: options?.medicineId ?? '',
          scheduledTime,
          status: 'taken',
          takenAt: new Date().toISOString(),
          note: options?.note,
        };
        set(state => ({ medicineLogs: [...state.medicineLogs, newLog] }));
        log.debug('Medicine taken logged', { reminderTimeId, id });
        return id;
      },

      logMedicineSkipped: (reminderTimeId, scheduledTime, options) => {
        const id = generateId();
        const newLog: MedicineLog = {
          id,
          reminderTimeId,
          medicineId: options?.medicineId ?? '',
          scheduledTime,
          status: 'skipped',
          note: options?.note,
        };
        set(state => ({ medicineLogs: [...state.medicineLogs, newLog] }));
        log.debug('Medicine skipped logged', { reminderTimeId, id });
        return id;
      },

      logMedicineMissed: (reminderTimeId, scheduledTime, options) => {
        const id = generateId();
        const newLog: MedicineLog = {
          id,
          reminderTimeId,
          medicineId: options?.medicineId ?? '',
          scheduledTime,
          status: 'missed',
        };
        set(state => ({ medicineLogs: [...state.medicineLogs, newLog] }));
        log.debug('Medicine missed logged', { reminderTimeId, id });
        return id;
      },

      deleteLog: logId => {
        set(state => ({
          medicineLogs: state.medicineLogs.filter(l => l.id !== logId),
        }));
      },

      hasLogFor: (reminderTimeId, date) => {
        const dateStr = date.split('T')[0]; // YYYY-MM-DD
        return undefined; // State disindan erisim gerekli; TODO Sprint 4
      },

      clearAllLogs: () => {
        set({ medicineLogs: [] });
      },
    }),
    {
      name: 'ilac-app-logs-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);