/**
 * useUserProfile — Sprint 58 + 63 + 64 + 77.
 *
 * Kullanıcı deneyim seviyesi (A: sade / B: detaylı), accent palette, haptics.
 * AsyncStorage'da saklanır, ThemeContext pattern'i uygulanır.
 *
 * Sprint 63: accentColor + version migration (v1 → v2).
 * Sprint 64: hapticsEnabled + version migration (v2 → v3).
 * Sprint 77: Layout 3 varyanttan 2'ye indirildi ('A' Sade, 'B' Detaylı).
 *   Eski 'C' değeri 'A' (sade) olarak migrate edilir.
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';
import { DEFAULT_ACCENT, AccentId, ACCENT_PALETTES } from '../theme/palettes';

const log = createScopedLogger('useUserProfile');

/**
 * Layout varyasyonu. preferredLayout ile eşleşir.
 * - A: Detaylı (CircularProgress + stat tile + streak + collapsed plan)
 * - B: Sade (kompakt hero + bugünün planı)
 */
export type LayoutVariant = 'A' | 'B';

function normalizeLayout(value: unknown): LayoutVariant {
  return value === 'B' ? 'B' : 'A';
}

export interface UserProfile {
  layout: LayoutVariant;
  accentColor: AccentId;
  hapticsEnabled: boolean;
  version: number;
  updatedAt: string;
}

const PROFILE_STORAGE_KEY = '@app_user_profile';
const PROFILE_VERSION = 3; // v1 = layout, v2 = +accent, v3 = +haptics

const DEFAULT_PROFILE: UserProfile = {
  layout: 'A',
  accentColor: DEFAULT_ACCENT,
  hapticsEnabled: true,
  version: PROFILE_VERSION,
  updatedAt: new Date().toISOString(),
};

interface UserProfileContextValue {
  profile: UserProfile;
  setLayout: (layout: LayoutVariant) => Promise<void>;
  setAccentColor: (color: AccentId) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  isLoading: boolean;
}

export const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

/**
 * v1 (layout) → v2 (+accent) → v3 (+haptics) migration.
 * Bilinmeyen accent id'leri default'a düşer (graceful fallback).
 */
function migrateProfile(
  parsed: Partial<UserProfile> & { accentColor?: string; hapticsEnabled?: boolean }
): UserProfile {
  const v = parsed.version ?? 1;
  if (v < 2) {
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      layout: normalizeLayout(parsed.layout),
      accentColor: DEFAULT_ACCENT,
      hapticsEnabled: true,
      version: PROFILE_VERSION,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    } as UserProfile;
  }
  if (v < 3) {
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      layout: normalizeLayout(parsed.layout),
      hapticsEnabled: parsed.hapticsEnabled ?? true,
      version: PROFILE_VERSION,
    } as UserProfile;
  }
  // v3+ — accent + haptics validation + Sprint 77 layout normalize
  const accent = parsed.accentColor;
  const validAccent: AccentId =
    accent && accent in ACCENT_PALETTES ? (accent as AccentId) : DEFAULT_ACCENT;
  return {
    ...DEFAULT_PROFILE,
    ...parsed,
    layout: normalizeLayout(parsed.layout),
    accentColor: validAccent,
    hapticsEnabled: parsed.hapticsEnabled ?? true,
    version: PROFILE_VERSION,
  } as UserProfile;
}

export function UserProfileProvider({ children }: ProviderProps) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const saved = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = migrateProfile(parsed);
        setProfile(migrated);
      }
    } catch (error) {
      log.warn('Profil yüklenemedi, default kullanılıyor', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = useCallback(
    async (partial: Partial<UserProfile>) => {
      try {
        const newProfile: UserProfile = {
          ...DEFAULT_PROFILE,
          ...profile,
          ...partial,
          version: PROFILE_VERSION,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
        setProfile(newProfile);
      } catch (error) {
        log.error('Profil kaydedilemedi', error);
      }
    },
    [profile]
  );

  const setLayout = useCallback(
    async (layout: LayoutVariant) => {
      await updateProfile({ layout });
    },
    [updateProfile]
  );

  const setAccentColor = useCallback(
    async (color: AccentId) => {
      await updateProfile({ accentColor: color });
    },
    [updateProfile]
  );

  const setHapticsEnabled = useCallback(
    async (enabled: boolean) => {
      await updateProfile({ hapticsEnabled: enabled });
    },
    [updateProfile]
  );

  return (
    <UserProfileContext.Provider
      value={{ profile, setLayout, setAccentColor, setHapticsEnabled, isLoading }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return ctx;
}
