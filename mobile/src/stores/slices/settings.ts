/**
 * Settings slice — UserSettings state + sync.
 *
 * Sprint 4 (medicineStore slice mimarisi) kapsaminda ilk slice.
 * Bu slice tek basina calisabilir (ayri Zustand store) — medicineStore
 * ile combine() ile compose edilebilir.
 *
 * NOT: Bu dosya SU AN PLANLAMA asamasinda — mevcut medicineStore.ts
 * hala tek-store. Sprint 4'ün tamamlanmasi icin bu slice medicineStore'a
 * entegre edilecek veya combine() ile birlestirilecek.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../../utils/logger';
import { DEFAULT_USER_SETTINGS, createDefaultUserSettings } from '../../utils/defaultSettings';
import type { UserSettings } from '../../types';

const log = createScopedLogger('SettingsSlice');

/**
 * Settings slice interface — sadece settings alanini ve onunla ilgili
 * action'lari icerir. Diger slice'lar (medicines, logs, snoozes) ayri
 * dosyalarda olacak.
 */
export interface SettingsSlice {
  settings: UserSettings;

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
 * Settings slice icin basit Zustand store.
 *
 * Davranis: mevcut medicineStore'daki settings ile ayni mantikta,
 * ama izole bir store olarak tasarlandi. Sprint 4 sonunda medicineStore
 * ile combine() ile birlestirilebilir.
 */
export const useSettingsStore = create<SettingsSlice>()(
  persist(
    set => ({
      settings: DEFAULT_USER_SETTINGS,

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
    }),
    {
      name: 'ilac-app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

/**
 * Helper: createDefaultUserSettings'i export eden medicineStore ile
 * uyumlu davranis. Sprint 4'te medicineStore icindeki settings
 * action'lari bu slice'a delege edilecek.
 */
export { createDefaultUserSettings, DEFAULT_USER_SETTINGS };