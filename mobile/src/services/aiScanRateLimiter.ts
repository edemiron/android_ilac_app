/**
 * aiScanRateLimiter.ts — 100k Kullanıcı İçin Günlük AI Tarama Kota & Rate Limiting Motoru
 *
 * Maliyet ve kötüye kullanım kalkanı:
 * 1. Ücretsiz kullanıcılar için günlük 5 tarama kotası
 * 2. Premium kullanıcılar için sınırsız kota
 * 3. Gece 00:00 yerel saatinde otomatik kota sıfırlama
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AIScanRateLimiter');

export const DEFAULT_FREE_DAILY_SCAN_LIMIT = 5;

const STORAGE_KEYS = {
  QUOTA_DATE: '@ai_scan_quota_date',
  QUOTA_COUNT: '@ai_scan_quota_count',
};

export interface QuotaCheckResult {
  canScan: boolean;
  remainingScans: number;
  maxDailyScans: number;
  isPremium: boolean;
  resetDateStr: string;
}

/**
 * Bugünkü tarihi yerel YYYY-MM-DD olarak döner
 */
function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd', { locale: tr });
}

/**
 * Kullanıcının günlük tarama kotasını kontrol eder
 */
export async function checkScanQuota(isPremium: boolean = false): Promise<QuotaCheckResult> {
  const today = getTodayDateString();

  if (isPremium) {
    return {
      canScan: true,
      remainingScans: 9999,
      maxDailyScans: 9999,
      isPremium: true,
      resetDateStr: today,
    };
  }

  try {
    const savedDate = await AsyncStorage.getItem(STORAGE_KEYS.QUOTA_DATE);
    const savedCountStr = await AsyncStorage.getItem(STORAGE_KEYS.QUOTA_COUNT);

    let currentCount = 0;

    if (savedDate === today && savedCountStr) {
      currentCount = parseInt(savedCountStr, 10) || 0;
    } else {
      // Yeni gün: Sayacı sıfırla
      await AsyncStorage.setItem(STORAGE_KEYS.QUOTA_DATE, today);
      await AsyncStorage.setItem(STORAGE_KEYS.QUOTA_COUNT, '0');
    }

    const remaining = Math.max(0, DEFAULT_FREE_DAILY_SCAN_LIMIT - currentCount);
    const canScan = remaining > 0;

    return {
      canScan,
      remainingScans: remaining,
      maxDailyScans: DEFAULT_FREE_DAILY_SCAN_LIMIT,
      isPremium: false,
      resetDateStr: today,
    };
  } catch (error) {
    log.error('Kota kontrol hatası, varsayılan izin verildi', error);
    return {
      canScan: true,
      remainingScans: 1,
      maxDailyScans: DEFAULT_FREE_DAILY_SCAN_LIMIT,
      isPremium: false,
      resetDateStr: today,
    };
  }
}

/**
 * Başarılı bir tarama sonrasında kotadan 1 düşer
 */
export async function consumeScanQuota(
  isPremium: boolean = false
): Promise<{ remainingScans: number }> {
  if (isPremium) {
    return { remainingScans: 9999 };
  }

  const today = getTodayDateString();

  try {
    const savedDate = await AsyncStorage.getItem(STORAGE_KEYS.QUOTA_DATE);
    const savedCountStr = await AsyncStorage.getItem(STORAGE_KEYS.QUOTA_COUNT);

    let currentCount = 0;
    if (savedDate === today && savedCountStr) {
      currentCount = parseInt(savedCountStr, 10) || 0;
    }

    const newCount = currentCount + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.QUOTA_DATE, today);
    await AsyncStorage.setItem(STORAGE_KEYS.QUOTA_COUNT, newCount.toString());

    const remaining = Math.max(0, DEFAULT_FREE_DAILY_SCAN_LIMIT - newCount);

    log.info('AI tarama kotası kullanıldı', {
      usedToday: newCount,
      remaining,
      date: today,
    });

    return { remainingScans: remaining };
  } catch (error) {
    log.error('Kota harcama hatası', error);
    return { remainingScans: 0 };
  }
}

/**
 * Kotayı sıfırla (Test ve geliştirme amaçlı)
 */
export async function resetScanQuota(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.QUOTA_DATE);
    await AsyncStorage.removeItem(STORAGE_KEYS.QUOTA_COUNT);
  } catch (e) {
    log.debug('Kota sıfırlanamadı', e);
  }
}
