/**
 * useUserProfile — Sprint 58 + 63.
 *
 * Kullanıcı deneyim seviyesi (A: sade / B: detaylı), accent palette seçimi.
 * AsyncStorage'da saklanır, ThemeContext pattern'i uygulanır.
 *
 * Sprint 63: accentColor + version migration (v1 → v2).
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';
import { DEFAULT_ACCENT, AccentId, ACCENT_PALETTES } from '../theme/palettes';

const log = createScopedLogger('useUserProfile');

/**
 * Layout varyasyonu. preferredLayout (A/B) ile eşleşir.
 * - A: Sade / Minimal (default, yaşlılar için)
 * - B: Detaylı (Kart + Adherence, gençler için)
 */
export type LayoutVariant = 'A' | 'B';

export interface UserProfile {
  layout: LayoutVariant;
  accentColor: AccentId;
  version: number;
  updatedAt: string;
}

const PROFILE_STORAGE_KEY = '@app_user_profile';
const PROFILE_VERSION = 2; // v1 = layout only, v2 = layout + accent

const DEFAULT_PROFILE: UserProfile = {
  layout: 'A',
  accentColor: DEFAULT_ACCENT,
  version: PROFILE_VERSION,
  updatedAt: new Date().toISOString(),
};

interface UserProfileContextValue {
  profile: UserProfile;
  setLayout: (layout: LayoutVariant) => Promise<void>;
  setAccentColor: (color: AccentId) => Promise<void>;
  isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

/**
 * v1 (layout only) → v2 (layout + accent) migration.
 * Bilinmeyen accent id'leri default'a düşer (graceful fallback).
 */
function migrateProfile(parsed: Partial<UserProfile> & { accentColor?: string }): UserProfile {
  const v = parsed.version ?? 1;
  if (v < 2) {
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      accentColor: DEFAULT_ACCENT,
      version: PROFILE_VERSION,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    } as UserProfile;
  }
  // v2+ — accent validation
  const accent = parsed.accentColor;
  const validAccent: AccentId =
    accent && accent in ACCENT_PALETTES ? (accent as AccentId) : DEFAULT_ACCENT;
  return {
    ...DEFAULT_PROFILE,
    ...parsed,
    accentColor: validAccent,
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

  return (
    <UserProfileContext.Provider value={{ profile, setLayout, setAccentColor, isLoading }}>
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
