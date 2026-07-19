/**
 * useOnboarding — Sprint 60.
 *
 * 4-slide onboarding akışı state machine.
 * AsyncStorage'a @onboarding_completed flag kaydeder, Profile gibi Context API.
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('useOnboarding');

export const ONBOARDING_STORAGE_KEY = '@onboarding_completed';
export const TOTAL_SLIDES = 4;

export type SlideIndex = 0 | 1 | 2 | 3;

interface UseOnboardingValue {
  isLoading: boolean;
  isCompleted: boolean;
  currentSlide: SlideIndex;
  totalSlides: number;
  next: () => void;
  prev: () => void;
  goTo: (index: SlideIndex) => void;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
}

const OnboardingContext = createContext<UseOnboardingValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: ProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<SlideIndex>(0);

  useEffect(() => {
    loadOnboarding();
  }, []);

  const loadOnboarding = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved === 'true') {
        setIsCompleted(true);
      }
    } catch (error) {
      log.warn('Onboarding durumu yüklenemedi, default false kullanılıyor', error);
    } finally {
      setIsLoading(false);
    }
  };

  const next = useCallback(() => {
    setCurrentSlide(prev => {
      const nextIdx = Math.min(prev + 1, TOTAL_SLIDES - 1) as SlideIndex;
      return nextIdx;
    });
  }, []);

  const prev = useCallback(() => {
    setCurrentSlide(prev => {
      const prevIdx = Math.max(prev - 1, 0) as SlideIndex;
      return prevIdx;
    });
  }, []);

  const goTo = useCallback((index: SlideIndex) => {
    if (index < 0 || index >= TOTAL_SLIDES) {
      log.warn('Geçersiz slide index', { index });
      return;
    }
    setCurrentSlide(index);
  }, []);

  const complete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setIsCompleted(true);
    } catch (error) {
      log.error('Onboarding tamamlanamadı', error);
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setIsCompleted(false);
      setCurrentSlide(0);
    } catch (error) {
      log.error('Onboarding sıfırlanamadı', error);
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isLoading,
        isCompleted,
        currentSlide,
        totalSlides: TOTAL_SLIDES,
        next,
        prev,
        goTo,
        complete,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
