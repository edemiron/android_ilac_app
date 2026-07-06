import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SubscriptionPlan } from '../types';
import { useAuth } from './AuthContext';
import {
  getUserSubscription,
  upgradeToPremium,
  cancelSubscription,
  canAddMedicine,
  canUseAISearch,
  canUseBarcodeScanner,
  shouldShowAds,
  getRemainingDays,
  SUBSCRIPTION_PLANS,
  formatPrice,
  getYearlySavings,
} from '../services/subscriptionService';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('SubscriptionContext');

const BARCODE_SCAN_COUNT_KEY = 'barcode_scan_count';

interface SubscriptionContextType {
  subscription: UserSubscription;
  isLoading: boolean;
  isPremium: boolean;
  plan: SubscriptionPlan;

  // Actions
  refreshSubscription: () => Promise<void>;
  upgrade: (billingPeriod: 'monthly' | 'yearly', transactionId?: string) => Promise<void>;
  cancel: () => Promise<void>;

  // Checks
  canAddMedicine: (currentCount: number) => { allowed: boolean; reason?: string };
  canUseAISearch: (dailyCount: number) => { allowed: boolean; reason?: string };
  canUseBarcodeScanner: () => { allowed: boolean; reason?: string; remaining?: number };
  shouldShowAds: () => boolean;
  remainingDays: number | null;

  // Barkod tarama
  barcodeScanCount: number;
  remainingBarcodeScans: number;
  incrementBarcodeScanCount: () => Promise<void>;

  // Pricing
  monthlyPrice: string;
  yearlyPrice: string;
  yearlySavings: { amount: number; percentage: number };
}

const defaultSubscription: UserSubscription = {
  tier: 'free',
  isActive: true,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: defaultSubscription,
  isLoading: true,
  isPremium: false,
  plan: SUBSCRIPTION_PLANS.free,
  refreshSubscription: async () => {},
  upgrade: async () => {},
  cancel: async () => {},
  canAddMedicine: () => ({ allowed: true }),
  canUseAISearch: () => ({ allowed: true }),
  canUseBarcodeScanner: () => ({ allowed: true, remaining: 5 }),
  shouldShowAds: () => true,
  remainingDays: null,
  barcodeScanCount: 0,
  remainingBarcodeScans: 5,
  incrementBarcodeScanCount: async () => {},
  monthlyPrice: '₺49,99',
  yearlyPrice: '₺349,99',
  yearlySavings: { amount: 250, percentage: 42 },
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription>(defaultSubscription);
  const [isLoading, setIsLoading] = useState(true);
  const [barcodeScanCount, setBarcodeScanCount] = useState(0);

  // Barkod tarama sayacını yükle
  const loadBarcodeScanCount = async () => {
    try {
      const countStr = await AsyncStorage.getItem(BARCODE_SCAN_COUNT_KEY);
      if (countStr) {
        setBarcodeScanCount(parseInt(countStr, 10));
      }
    } catch (error) {
      log.error('Barkod sayaci yukleme hatasi', error);
    }
  };

  // Barkod tarama sayacını artır
  const incrementBarcodeScanCount = async () => {
    try {
      const newCount = barcodeScanCount + 1;
      await AsyncStorage.setItem(BARCODE_SCAN_COUNT_KEY, newCount.toString());
      setBarcodeScanCount(newCount);
    } catch (error) {
      log.error('Barkod sayaci guncelleme hatasi', error);
    }
  };

  const refreshSubscription = async () => {
    if (!user?.uid) {
      setSubscription(defaultSubscription);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const sub = await getUserSubscription(user.uid);
      setSubscription(sub);
    } catch (error) {
      log.error('Abonelik yenileme hatasi', error);
      setSubscription(defaultSubscription);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBarcodeScanCount();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshSubscription();
    } else {
      setSubscription(defaultSubscription);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.uid, refreshSubscription]);

  const upgrade = async (billingPeriod: 'monthly' | 'yearly', transactionId?: string) => {
    if (!user?.uid) throw new Error('Kullanıcı girişi gerekli');

    await upgradeToPremium(user.uid, billingPeriod, transactionId);
    await refreshSubscription();
  };

  const cancel = async () => {
    if (!user?.uid) throw new Error('Kullanıcı girişi gerekli');

    await cancelSubscription(user.uid);
    await refreshSubscription();
  };

  const isPremium = subscription.tier === 'premium' && subscription.isActive;
  const plan = SUBSCRIPTION_PLANS[subscription.tier];
  const remainingDays = getRemainingDays(subscription);

  // Kalan barkod tarama hakkı
  const barcodeScanLimit = plan.limits.barcodeScanLimit;
  const remainingBarcodeScans =
    barcodeScanLimit === -1 ? -1 : Math.max(0, barcodeScanLimit - barcodeScanCount);

  const value: SubscriptionContextType = {
    subscription,
    isLoading,
    isPremium,
    plan,
    refreshSubscription,
    upgrade,
    cancel,
    canAddMedicine: (currentCount: number) => canAddMedicine(currentCount, subscription),
    canUseAISearch: (dailyCount: number) => canUseAISearch(dailyCount, subscription),
    canUseBarcodeScanner: () => canUseBarcodeScanner(subscription, barcodeScanCount),
    shouldShowAds: () => shouldShowAds(subscription),
    remainingDays,
    barcodeScanCount,
    remainingBarcodeScans,
    incrementBarcodeScanCount,
    monthlyPrice: formatPrice(SUBSCRIPTION_PLANS.premium.price.monthly),
    yearlyPrice: formatPrice(SUBSCRIPTION_PLANS.premium.price.yearly),
    yearlySavings: getYearlySavings(),
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
