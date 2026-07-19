/**
 * useLowStockDismiss — Sprint 65A.
 *
 * Stok uyarısı persistent dismiss provider.
 * 24 saat TTL + medicinesHash auto-invalidation.
 * useOnboarding.tsx pattern'i.
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('useLowStockDismiss');

export const LOW_STOCK_DISMISS_KEY = '@low_stock_dismissed';
export const LOW_STOCK_DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

export interface LowStockDismissState {
  dismissedAt: string;
  medicinesHash: string;
}

export interface UseLowStockDismissValue {
  isLoading: boolean;
  isDismissed: boolean;
  dismissedAt: string | null;
  checkDismissed: (currentMedicinesHash: string) => boolean;
  dismiss: (currentMedicinesHash: string) => Promise<void>;
  reset: () => Promise<void>;
}

const LowStockDismissContext = createContext<UseLowStockDismissValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export function computeLowStockHash(items: { id: string; stockCount?: number }[]): string {
  if (items.length === 0) return '';
  return items
    .map(m => `${m.id}:${m.stockCount ?? 0}`)
    .sort()
    .join('|');
}

export function LowStockDismissProvider({ children }: ProviderProps) {
  const [state, setState] = useState<LowStockDismissState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const saved = await AsyncStorage.getItem(LOW_STOCK_DISMISS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LowStockDismissState;
        setState(parsed);
      }
    } catch (error) {
      log.warn('Low stock dismiss state yüklenemedi', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDismissed = useCallback(
    (currentHash: string): boolean => {
      if (!state) return false;
      if (state.medicinesHash !== currentHash) return false;
      const elapsed = Date.now() - new Date(state.dismissedAt).getTime();
      if (elapsed >= LOW_STOCK_DISMISS_TTL_MS) return false;
      return true;
    },
    [state]
  );

  const dismiss = useCallback(async (currentHash: string) => {
    try {
      const newState: LowStockDismissState = {
        dismissedAt: new Date().toISOString(),
        medicinesHash: currentHash,
      };
      await AsyncStorage.setItem(LOW_STOCK_DISMISS_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      log.error('Low stock dismiss kaydedilemedi', error);
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(LOW_STOCK_DISMISS_KEY);
      setState(null);
    } catch (error) {
      log.error('Low stock dismiss sıfırlanamadı', error);
    }
  }, []);

  const isDismissed = state
    ? Date.now() - new Date(state.dismissedAt).getTime() < LOW_STOCK_DISMISS_TTL_MS
    : false;

  return (
    <LowStockDismissContext.Provider
      value={{
        isLoading,
        isDismissed,
        dismissedAt: state?.dismissedAt ?? null,
        checkDismissed,
        dismiss,
        reset,
      }}
    >
      {children}
    </LowStockDismissContext.Provider>
  );
}

export function useLowStockDismiss() {
  const ctx = useContext(LowStockDismissContext);
  if (!ctx) {
    throw new Error('useLowStockDismiss must be used within LowStockDismissProvider');
  }
  return ctx;
}
