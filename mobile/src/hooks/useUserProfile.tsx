/**
 * useUserProfile — Sprint 58.
 *
 * Kullanıcı deneyim seviyesi (A: sade / B: detaylı) ve layout tercihi.
 * AsyncStorage'da saklanır, ThemeContext pattern'i uygulanır.
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('useUserProfile');

/**
 * Layout varyasyonu. preferredLayout (A/B) ile eşleşir.
 * - A: Sade / Minimal (default, yaşlılar için)
 * - B: Detaylı (Kart + Adherence, gençler için)
 */
export type LayoutVariant = 'A' | 'B';

export interface UserProfile {
  layout: LayoutVariant;
  updatedAt: string;
}

const PROFILE_STORAGE_KEY = '@app_user_profile';

const DEFAULT_PROFILE: UserProfile = {
  layout: 'A', // default: sade
  updatedAt: new Date().toISOString(),
};

interface UserProfileContextValue {
  profile: UserProfile;
  setLayout: (layout: LayoutVariant) => Promise<void>;
  isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
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
        const parsed = JSON.parse(saved) as UserProfile;
        setProfile(parsed);
      }
    } catch (error) {
      log.warn('Profil yüklenemedi, default kullanılıyor', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLayout = useCallback(async (layout: LayoutVariant) => {
    try {
      const newProfile: UserProfile = {
        layout,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (error) {
      log.error('Profil kaydedilemedi', error);
    }
  }, []);

  return (
    <UserProfileContext.Provider value={{ profile, setLayout, isLoading }}>
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
