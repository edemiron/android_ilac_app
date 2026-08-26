import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { SubscriptionTier, UserSubscription, SubscriptionPlan } from '../types';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('SubscriptionService');
const LOCAL_SUBSCRIPTION_KEY = '@user_local_subscription';

// ============ ABONELİK PLANLARI ============

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'Ücretsiz',
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: ['2 ilaç takibi', 'Temel hatırlatmalar', '5 barkod tarama hakkı'],
    limits: {
      maxMedicines: 2,
      aiSearchPerDay: 0,
      cloudSync: false,
      adFree: false,
      barcodeScanner: true, // Artık free'de de var ama limitli
      barcodeScanLimit: 5, // Free için 5 tarama hakkı
    },
  },
  premium: {
    tier: 'premium',
    name: 'Premium',
    price: {
      monthly: 49.99,
      yearly: 349.99, // %42 indirimli
    },
    features: [
      'Sınırsız ilaç takibi',
      'Gelişmiş hatırlatmalar',
      'Detaylı istatistikler',
      'AI destekli ilaç arama',
      'Bulut senkronizasyonu',
      'Reklamsız deneyim',
      'Prospektüs bilgileri',
      'İlaç etkileşim uyarıları',
    ],
    limits: {
      maxMedicines: -1, // Sınırsız
      aiSearchPerDay: -1, // Sınırsız
      cloudSync: true,
      adFree: true,
      barcodeScanner: true,
      barcodeScanLimit: -1, // Sınırsız
    },
  },
};

// ============ KULLANICI ABONELİĞİ ============

const getUserSubscriptionRef = (userId: string) =>
  doc(db, 'users', userId, 'subscription', 'current');

/**
 * Kullanıcının abonelik durumunu getir
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  try {
    const subRef = getUserSubscriptionRef(userId);
    const snapshot = await getDoc(subRef);

    if (!snapshot.exists()) {
      // Local cache kontrolü
      const cached = await AsyncStorage.getItem(LOCAL_SUBSCRIPTION_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.tier) return parsed;
        } catch (_parseErr) {
          log.debug('Local subscription parse hatasi');
        }
      }
      return {
        tier: 'free',
        isActive: true,
      };
    }

    const data = snapshot.data() as UserSubscription;

    // Abonelik süresi dolmuş mu kontrol et
    if (data.tier === 'premium' && data.endDate) {
      const endDate = new Date(data.endDate);
      if (endDate < new Date()) {
        await downgradeToFree(userId);
        return {
          tier: 'free',
          isActive: true,
        };
      }
    }

    // Başarıyla okunduysa local'e de cache'le
    await AsyncStorage.setItem(LOCAL_SUBSCRIPTION_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    log.error('Abonelik getirme hatasi', error);
    // Offline / Network fallback: Local cache'den oku
    try {
      const cached = await AsyncStorage.getItem(LOCAL_SUBSCRIPTION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.tier) return parsed;
      }
    } catch (_cacheErr) {
      log.debug('Local subscription cache okuma hatasi');
    }
    return {
      tier: 'free',
      isActive: true,
    };
  }
}

/**
 * Kullanıcıyı premium'a yükselt
 */
export async function upgradeToPremium(
  userId: string,
  billingPeriod: 'monthly' | 'yearly',
  transactionId?: string
): Promise<void> {
  try {
    const subRef = getUserSubscriptionRef(userId);
    const now = new Date();

    // Bitiş tarihini hesapla
    const endDate = new Date(now);
    if (billingPeriod === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscription: UserSubscription = {
      tier: 'premium',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      platform: 'android',
      transactionId,
    };

    await setDoc(subRef, subscription);
    await AsyncStorage.setItem(LOCAL_SUBSCRIPTION_KEY, JSON.stringify(subscription));
    log.debug('Premium abonelik aktiflestirildi');
  } catch (error) {
    log.error('Premium yukseltme hatasi', error);
    throw error;
  }
}

/**
 * Kullanıcıyı free'ye düşür
 */
export async function downgradeToFree(userId: string): Promise<void> {
  try {
    const subRef = getUserSubscriptionRef(userId);

    const subscription: UserSubscription = {
      tier: 'free',
      isActive: true,
    };

    await setDoc(subRef, subscription);
    await AsyncStorage.setItem(LOCAL_SUBSCRIPTION_KEY, JSON.stringify(subscription));
    log.debug('Free abonelige dusuruldu');
  } catch (error) {
    log.error('Downgrade hatasi', error);
    throw error;
  }
}

/**
 * Premium aboneliği iptal et
 */
export async function cancelSubscription(userId: string): Promise<void> {
  try {
    const subRef = getUserSubscriptionRef(userId);

    await updateDoc(subRef, {
      isActive: false,
    });

    const cached = await AsyncStorage.getItem(LOCAL_SUBSCRIPTION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.isActive = false;
      await AsyncStorage.setItem(LOCAL_SUBSCRIPTION_KEY, JSON.stringify(parsed));
    }

    log.debug('Abonelik iptal edildi');
  } catch (error) {
    log.error('Iptal hatasi', error);
    throw error;
  }
}

// ============ LİMİT KONTROL ============

/**
 * Kullanıcının ilaç ekleyip ekleyemeyeceğini kontrol et
 */
export function canAddMedicine(
  currentMedicineCount: number,
  subscription: UserSubscription
): { allowed: boolean; reason?: string } {
  const plan = SUBSCRIPTION_PLANS[subscription.tier];

  if (plan.limits.maxMedicines === -1) {
    return { allowed: true };
  }

  if (currentMedicineCount >= plan.limits.maxMedicines) {
    return {
      allowed: false,
      reason: `Ücretsiz planda en fazla ${plan.limits.maxMedicines} ilaç ekleyebilirsiniz. Premium'a geçerek sınırsız ilaç takibi yapabilirsiniz.`,
    };
  }

  return { allowed: true };
}

/**
 * Kullanıcının AI araması yapıp yapamayacağını kontrol et
 */
export function canUseAISearch(
  dailySearchCount: number,
  subscription: UserSubscription
): { allowed: boolean; reason?: string } {
  const plan = SUBSCRIPTION_PLANS[subscription.tier];

  if (plan.limits.aiSearchPerDay === -1) {
    return { allowed: true };
  }

  if (dailySearchCount >= plan.limits.aiSearchPerDay) {
    return {
      allowed: false,
      reason: `Günlük AI arama limitinize (${plan.limits.aiSearchPerDay}) ulaştınız. Premium'a geçerek sınırsız AI araması yapabilirsiniz.`,
    };
  }

  return { allowed: true };
}

/**
 * Kullanıcının barkod tarayıcı kullanıp kullanamayacağını kontrol et
 */
export function canUseBarcodeScanner(
  subscription: UserSubscription,
  currentScanCount: number
): { allowed: boolean; reason?: string; remaining?: number } {
  const plan = SUBSCRIPTION_PLANS[subscription.tier];

  if (!plan.limits.barcodeScanner) {
    return {
      allowed: false,
      reason: 'Barkod tarama özelliği kullanılamıyor.',
    };
  }

  // Sınırsız ise (Premium)
  if (plan.limits.barcodeScanLimit === -1) {
    return { allowed: true, remaining: -1 };
  }

  // Limit kontrolü (Free)
  const remaining = plan.limits.barcodeScanLimit - currentScanCount;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Ücretsiz barkod tarama hakkınız (${plan.limits.barcodeScanLimit}) doldu. Premium'a geçerek sınırsız barkod tarama yapabilirsiniz.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

/**
 * Reklam gösterilmeli mi?
 */
export function shouldShowAds(subscription: UserSubscription): boolean {
  return !SUBSCRIPTION_PLANS[subscription.tier].limits.adFree;
}

/**
 * Kalan abonelik gününü hesapla
 */
export function getRemainingDays(subscription: UserSubscription): number | null {
  if (subscription.tier !== 'premium' || !subscription.endDate) {
    return null;
  }

  const endDate = new Date(subscription.endDate);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// ============ FİYATLANDIRMA ============

/**
 * Yıllık abonelikte ne kadar tasarruf edildiğini hesapla
 */
export function getYearlySavings(): { amount: number; percentage: number } {
  const monthly = SUBSCRIPTION_PLANS.premium.price.monthly;
  const yearly = SUBSCRIPTION_PLANS.premium.price.yearly;
  const monthlyTotal = monthly * 12;

  const savings = monthlyTotal - yearly;
  const percentage = Math.round((savings / monthlyTotal) * 100);

  return { amount: savings, percentage };
}

/**
 * Fiyatı formatla
 */
export function formatPrice(price: number): string {
  return `₺${price.toFixed(2).replace('.', ',')}`;
}
