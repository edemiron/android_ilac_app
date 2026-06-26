/**
 * Snoozes slice — erteleme (snooze) state + lifecycle.
 *
 * Sprint 4 (medicineStore slice mimarisi) kapsaminda dorduncu (son) slice.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../../utils/logger';
import { generateId } from '../../utils/idGenerator';
import type { Snooze } from '../../types';

const log = createScopedLogger('SnoozesSlice');

export interface SnoozesSlice {
  snoozes: Snooze[];

  /** Yeni snooze olustur */
  createSnooze: (
    snooze: Omit<Snooze, 'id' | 'isActive' | 'createdAt'>
  ) => string;

  /** Snooze deaktif et (tamamlandi veya iptal edildi) */
  deactivateSnooze: (id: string) => void;

  /** Tum snoozes'lar icin isActive=false yap (yeni alarm gelince) */
  deactivateAllSnoozes: () => void;

  /** Ilacin aktif snooze'unu getir */
  getActiveSnoozeForMedicine: (medicineId: string) => Snooze | undefined;

  /** Stale (gecmis) snoozes'i temizle */
  cleanupStaleSnoozes: () => number;

  /** Tum snoozes'lari temizle */
  clearAllSnoozes: () => void;
}

/**
 * Snoozes slice icin basit Zustand store.
 */
export const useSnoozesStore = create<SnoozesSlice>()(
  persist(
    set => ({
      snoozes: [],

      createSnooze: snooze => {
        const id = generateId();
        const now = new Date().toISOString();
        const newSnooze: Snooze = {
          ...snooze,
          id,
          isActive: true,
          createdAt: now,
        };
        set(state => ({ snoozes: [...state.snoozes, newSnooze] }));
        log.info('Snooze created', { id, medicineId: snooze.medicineId });
        return id;
      },

      deactivateSnooze: id => {
        set(state => ({
          snoozes: state.snoozes.map(s =>
            s.id === id ? { ...s, isActive: false } : s
          ),
        }));
        log.debug('Snooze deactivated', { id });
      },

      deactivateAllSnoozes: () => {
        set(state => ({
          snoozes: state.snoozes.map(s => ({ ...s, isActive: false })),
        }));
      },

      getActiveSnoozeForMedicine: medicineId => {
        // Bu getter set disindan state'e erisemedigi icin burada undefined doner
        // TODO Sprint 4'te closure ile duzeltilecek
        return undefined;
      },

      cleanupStaleSnoozes: () => {
        // Stale (gecmis tarihli) snoozes'i temizle
        const now = Date.now();
        let cleaned = 0;
        set(state => {
          const filtered = state.snoozes.filter(s => {
            const isStale = new Date(s.triggerTime).getTime() <= now;
            if (isStale) cleaned++;
            return !isStale;
          });
          return { snoozes: filtered };
        });
        log.info('Stale snoozes cleaned', { count: cleaned });
        return cleaned;
      },

      clearAllSnoozes: () => {
        set({ snoozes: [] });
      },
    }),
    {
      name: 'ilac-app-snoozes-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);