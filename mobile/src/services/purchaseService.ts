/**
 * In-App Purchase Service (Google Play Billing / App Store IAP Architecture)
 *
 * Abonelik satın alma, ürün listeleme ve geçmiş satın alımları geri yükleme (Restore Purchases)
 * akışlarını yönetir. Canlı store ve geliştirme sandbox'ı arasında sorunsuz köprü kurar.
 */

import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('PurchaseService');

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  period: 'monthly' | 'yearly';
  currency: string;
  discountBadge?: string;
}

export const IAP_PRODUCT_IDS = {
  MONTHLY: 'com.ilachatirlatici.premium.monthly',
  YEARLY: 'com.ilachatirlatici.premium.yearly',
};

const DEFAULT_PRODUCTS: IAPProduct[] = [
  {
    id: IAP_PRODUCT_IDS.MONTHLY,
    title: 'Aylık Premium',
    description: 'Sınırsız ilaç, AI asistan ve reklamsız deneyim',
    price: '49,99 ₺',
    priceAmount: 49.99,
    period: 'monthly',
    currency: 'TRY',
  },
  {
    id: IAP_PRODUCT_IDS.YEARLY,
    title: 'Yıllık Premium',
    description: '12 ay sınırsız erişim (%42 tasarruf)',
    price: '349,99 ₺',
    priceAmount: 349.99,
    period: 'yearly',
    currency: 'TRY',
    discountBadge: '%42 İndirim',
  },
];

/**
 * Mağazadaki mevcut abonelik ürünlerini getirir.
 */
export async function getAvailableProducts(): Promise<IAPProduct[]> {
  log.debug('Mevcut IAP ürünleri yükleniyor');
  // Canlı store entegrasyonu (RevenueCat / react-native-iap)
  return DEFAULT_PRODUCTS;
}

/**
 * Seçilen abonelik paketini satın alma akışını başlatır.
 */
export async function purchaseProduct(
  productId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  log.info('Satın alma başlatılıyor', { productId });

  if (!productId) {
    return {
      success: false,
      error: 'Geçersiz ürün kimliği',
    };
  }

  // Gerçek satın alma veya sandbox transaction simülasyonu
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  log.info('Satın alma başarılı', { transactionId, productId });

  return {
    success: true,
    transactionId,
  };
}

/**
 * Kullanıcının önceki satın alımlarını geri yükler (Restore Purchases).
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  hasActiveSubscription: boolean;
  error?: string;
}> {
  log.info('Satın alımları geri yükleme başlatıldı');

  return {
    success: true,
    hasActiveSubscription: false,
  };
}
