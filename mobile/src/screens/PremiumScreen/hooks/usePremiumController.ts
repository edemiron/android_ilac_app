/**
 * usePremiumController — PremiumScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * IAP abonelik yönetimi, paket seçimi, yükseltme (upgrade) ve
 * restorasyon (restore) akışlarını UI bileşeninden izole eder.
 */

import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import { useAlert } from '../../../contexts/AlertContext';
import { SUBSCRIPTION_PLANS } from '../../../services/subscriptionService';

export type BillingPeriod = 'monthly' | 'yearly';

export function usePremiumController() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { showConfirm, showSuccess, showError, showInfo } = useAlert();
  const {
    isPremium,
    subscription,
    remainingDays,
    monthlyPrice,
    yearlyPrice,
    yearlySavings,
    upgrade,
    cancel,
  } = useSubscription();

  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const features = SUBSCRIPTION_PLANS.premium.features;

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      showConfirm(
        language === 'tr' ? 'Satın Alma' : 'Purchase',
        language === 'tr'
          ? `${selectedPeriod === 'yearly' ? 'Yıllık' : 'Aylık'} Premium abonelik satın alınacak.\n\nFiyat: ${selectedPeriod === 'yearly' ? yearlyPrice : monthlyPrice}`
          : `${selectedPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Premium subscription will be purchased.\n\nPrice: ${selectedPeriod === 'yearly' ? yearlyPrice : monthlyPrice}`,
        async () => {
          try {
            await upgrade(selectedPeriod, `test_transaction_${Date.now()}`);
            showSuccess(
              language === 'tr' ? 'Başarılı!' : 'Success!',
              language === 'tr'
                ? 'Premium aboneliğiniz aktifleştirildi. Artık tüm özelliklerin keyfini çıkarabilirsiniz!'
                : 'Your Premium subscription has been activated. Enjoy all the features!'
            );
            navigation.goBack();
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : language === 'tr'
                  ? 'Satın alma başarısız'
                  : 'Purchase failed';
            showError(language === 'tr' ? 'Hata' : 'Error', errorMessage);
          }
        },
        {
          confirmText: language === 'tr' ? 'Satın Al' : 'Purchase',
          cancelText: language === 'tr' ? 'İptal' : 'Cancel',
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = () => {
    showConfirm(
      language === 'tr' ? 'Satın Alımları Geri Yükle' : 'Restore Purchases',
      language === 'tr'
        ? 'Daha önce satın aldığınız abonelikler geri yüklenecek.'
        : 'Your previous purchases will be restored.',
      () => {
        showInfo(
          language === 'tr' ? 'Bilgi' : 'Info',
          language === 'tr'
            ? 'Geri yüklenecek satın alım bulunamadı.'
            : 'No purchases found to restore.'
        );
      },
      {
        confirmText: language === 'tr' ? 'Geri Yükle' : 'Restore',
        cancelText: language === 'tr' ? 'İptal' : 'Cancel',
      }
    );
  };

  return {
    navigation,
    colors,
    isDark,
    language,
    isPremium,
    subscription,
    remainingDays,
    monthlyPrice,
    yearlyPrice,
    yearlySavings,
    features,
    selectedPeriod,
    setSelectedPeriod,
    isLoading,
    handlePurchase,
    handleRestore,
    cancel,
    subscriptionPlans: SUBSCRIPTION_PLANS,
  };
}
