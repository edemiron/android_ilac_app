/**
 * Logs slice factory — Sprint 46 (combine refactor).
 *
 * Hem isolated `useLogsStore` (geriye uyumlu) hem de `createLogsSlice`
 * factory (combine için) export eder.
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

  /**
   * Sprint 4 devami: Bulk replace medicineLogs.
   * Normalize edilmis listeyi (slot-bazli) tek seferde yerlestirir.
   * medicineStore wrapper'i normalizeMedicineLogsBySlot helper'ini kullanir
   * ve bu action ile slice'a delege eder.
   */
  replaceMedicineLogs: (logs: MedicineLog[]) => void;

  /** Bugun bu hatirlatma icin log var mi kontrol et */
  hasLogFor: (reminderTimeId: string, date: string) => MedicineLog | undefined;

  /** Tum loglari temizle */
  clearAllLogs: () => void;
}

/**
 * Sprint 46: Logs slice factory.
 *
 * combine() ile diger slice'lara dahil etmek icin `(set, get) => slice` formunda.
 */
export function createLogsSlice(
  set: (partial: Partial<LogsSlice> | ((s: LogsSlice) => Partial<LogsSlice>)) => void,
  get: () => LogsSlice
): LogsSlice {
  return {
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

    // Sprint 4 devami: bulk replace — medicineStore wrapper normalize
    // edilmis listeyi (slot-bazli) tek seferde yerlestirmek icin kullanir.
    replaceMedicineLogs: (logs: MedicineLog[]) => {
      set({ medicineLogs: logs });
    },

    hasLogFor: (reminderTimeId, date) => {
      const { medicineLogs } = get();
      const dateStr = date.split('T')[0]; // YYYY-MM-DD
      return medicineLogs.find(
        l => l.reminderTimeId === reminderTimeId && l.scheduledTime.startsWith(dateStr)
      );
    },

    clearAllLogs: () => {
      set({ medicineLogs: [] });
    },
  };
}

/**
 * Logs slice icin basit Zustand store.
 */
export const useLogsStore = create<LogsSlice>()(
  persist((set, get) => createLogsSlice(set, get), {
    name: 'ilac-app-logs-storage',
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
  })
);
