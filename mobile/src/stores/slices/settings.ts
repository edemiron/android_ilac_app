/**
 * Settings slice factory — Sprint 46 (combine refactor).
 *
 * Hem isolated `useSettingsStore` (geriye uyumlu) hem de `createSettingsSlice`
 * factory (combine için) export eder.
 *
 * Sprint 47: userId + setUserId eklendi (medicineStore.ts'ten migrate).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../../utils/logger';
import { DEFAULT_USER_SETTINGS, createDefaultUserSettings } from '../../utils/defaultSettings';
import type { UserSettings } from '../../types';

const log = createScopedLogger('SettingsSlice');

/**
 * Settings slice interface — settings alani + sync ile ilgili action'lar.
 * Sprint 47'de userId + setUserId eklendi (medicineStore.ts'ten migrate).
 */
export interface SettingsSlice {
  settings: UserSettings;
  userId: string | null;

  /** Kullanici ID'sini ayarla (Firebase Auth user) */
  setUserId: (userId: string | null) => void;

  /** Settings'i tamamen degistir (sync sonrasi) */
  setSettings: (settings: UserSettings) => void;

  /** Tek bir settings alanini guncelle */
  updateSettings: (updates: Partial<UserSettings>) => void;

  /** Settings'i default'a sifirla */
  resetSettings: () => void;

  /** Sync sonrasi ayarlari merge et */
  applyCloudSettings: (cloudSettings: Partial<UserSettings>) => void;
}

/**
 * Sprint 46: Settings slice factory.
 *
 * combine() ile diger slice'lara dahil etmek icin `(set) => slice` formunda.
 */
export function createSettingsSlice(
  set: (partial: Partial<SettingsSlice> | ((s: SettingsSlice) => Partial<SettingsSlice>)) => void
): SettingsSlice {
  return {
    settings: DEFAULT_USER_SETTINGS,
    userId: null,

    setUserId: userId => {
      set({ userId });
    },

    setSettings: settings => {
      log.debug('setSettings', { keys: Object.keys(settings) });
      set({ settings });
    },

    updateSettings: updates => {
      set(state => ({
        settings: { ...state.settings, ...updates },
      }));
    },

    resetSettings: () => {
      log.warn('resetSettings — default settings applied');
      set({ settings: createDefaultUserSettings() });
    },

    applyCloudSettings: cloudSettings => {
      set(state => ({
        settings: { ...state.settings, ...cloudSettings },
      }));
    },
  };
}

/**
 * Settings slice icin basit Zustand store.
 *
 * Davranis: mevcut medicineStore'daki settings ile ayni mantikta,
 * ama izole bir store olarak tasarlandi. Sprint 4 sonunda medicineStore
 * ile combine() ile birlestirilebilir.
 */
export const useSettingsStore = create<SettingsSlice>()(
  persist(set => createSettingsSlice(set), {
    name: 'ilac-app-settings-storage',
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
  })
);

/**
 * Helper: createDefaultUserSettings'i export eden medicineStore ile
 * uyumlu davranis. Sprint 4'te medicineStore icindeki settings
 * action'lari bu slice'a delege edilecek.
 */
export { createDefaultUserSettings, DEFAULT_USER_SETTINGS };
