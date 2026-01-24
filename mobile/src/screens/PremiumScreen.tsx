import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS } from '../services/subscriptionService';

type BillingPeriod = 'monthly' | 'yearly';

export default function PremiumScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
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
      // Gerçek uygulamada burada in-app purchase işlemi yapılacak
      // Şimdilik direkt Firebase'e kaydediyoruz (test amaçlı)
      
      Alert.alert(
        language === 'tr' ? 'Satın Alma' : 'Purchase',
        language === 'tr' 
          ? `${selectedPeriod === 'yearly' ? 'Yıllık' : 'Aylık'} Premium abonelik satın alınacak.\n\nFiyat: ${selectedPeriod === 'yearly' ? yearlyPrice : monthlyPrice}`
          : `${selectedPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Premium subscription will be purchased.\n\nPrice: ${selectedPeriod === 'yearly' ? yearlyPrice : monthlyPrice}`,
        [
          {
            text: language === 'tr' ? 'İptal' : 'Cancel',
            style: 'cancel',
          },
          {
            text: language === 'tr' ? 'Satın Al' : 'Purchase',
            onPress: async () => {
              try {
                await upgrade(selectedPeriod, `test_transaction_${Date.now()}`);
                Alert.alert(
                  language === 'tr' ? 'Başarılı!' : 'Success!',
                  language === 'tr' 
                    ? 'Premium aboneliğiniz aktifleştirildi. Artık tüm özelliklerin keyfini çıkarabilirsiniz!'
                    : 'Your Premium subscription has been activated. Enjoy all the features!',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } catch (error: any) {
                Alert.alert(
                  language === 'tr' ? 'Hata' : 'Error',
                  error.message || (language === 'tr' ? 'Satın alma başarısız' : 'Purchase failed')
                );
              }
            },
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      language === 'tr' ? 'Satın Alımları Geri Yükle' : 'Restore Purchases',
      language === 'tr' 
        ? 'Daha önce satın aldığınız abonelikler geri yüklenecek.'
        : 'Your previous purchases will be restored.',
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        { 
          text: language === 'tr' ? 'Geri Yükle' : 'Restore',
          onPress: () => {
            // Gerçek uygulamada restore işlemi yapılacak
            Alert.alert(
              language === 'tr' ? 'Bilgi' : 'Info',
              language === 'tr' 
                ? 'Geri yüklenecek satın alım bulunamadı.'
                : 'No purchases found to restore.'
            );
          },
        },
      ]
    );
  };

  const styles = createStyles(colors, isDark);

  // Zaten premium ise farklı ekran göster
  if (isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.premiumActiveContainer}>
            <Text style={styles.premiumBadge}>PREMIUM</Text>
            <Text style={[styles.premiumActiveTitle, { color: colors.text }]}>
              {language === 'tr' ? 'Premium Üyesiniz!' : "You're Premium!"}
            </Text>
            <Text style={[styles.premiumActiveSubtitle, { color: colors.textSecondary }]}>
              {language === 'tr' 
                ? 'Tüm özelliklerin keyfini çıkarın'
                : 'Enjoy all premium features'}
            </Text>
            
            {remainingDays !== null && (
              <View style={[styles.remainingDaysCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.remainingDaysLabel, { color: colors.textSecondary }]}>
                  {language === 'tr' ? 'Kalan Süre' : 'Remaining'}
                </Text>
                <Text style={[styles.remainingDaysValue, { color: colors.primary }]}>
                  {remainingDays} {language === 'tr' ? 'gün' : 'days'}
                </Text>
              </View>
            )}

            <View style={styles.featuresContainer}>
              <Text style={[styles.featuresTitle, { color: colors.text }]}>
                {language === 'tr' ? 'Premium Özellikleriniz' : 'Your Premium Features'}
              </Text>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.crownIcon}>👑</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Premium
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {language === 'tr' 
              ? 'Sınırsız ilaç takibi ve daha fazlası'
              : 'Unlimited medicine tracking and more'}
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>
            {language === 'tr' ? 'Premium Özellikleri' : 'Premium Features'}
          </Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingContainer}>
          {/* Yearly Option */}
          <TouchableOpacity
            style={[
              styles.pricingOption,
              { 
                backgroundColor: colors.card,
                borderColor: selectedPeriod === 'yearly' ? colors.primary : colors.inputBorder,
                borderWidth: selectedPeriod === 'yearly' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedPeriod('yearly')}
          >
            <View style={[styles.savingsBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.savingsBadgeText}>
                %{yearlySavings.percentage} {language === 'tr' ? 'TASARRUF' : 'SAVE'}
              </Text>
            </View>
            <View style={styles.pricingContent}>
              <Text style={[styles.pricingLabel, { color: colors.text }]}>
                {language === 'tr' ? 'Yıllık' : 'Yearly'}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.primary }]}>
                  {yearlyPrice}
                </Text>
                <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                  /{language === 'tr' ? 'yıl' : 'year'}
                </Text>
              </View>
              <Text style={[styles.pricePerMonth, { color: colors.textMuted }]}>
                ≈ ₺{(SUBSCRIPTION_PLANS.premium.price.yearly / 12).toFixed(2).replace('.', ',')} / {language === 'tr' ? 'ay' : 'mo'}
              </Text>
            </View>
            {selectedPeriod === 'yearly' && (
              <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                <Text style={styles.selectedIndicatorText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Monthly Option */}
          <TouchableOpacity
            style={[
              styles.pricingOption,
              { 
                backgroundColor: colors.card,
                borderColor: selectedPeriod === 'monthly' ? colors.primary : colors.inputBorder,
                borderWidth: selectedPeriod === 'monthly' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedPeriod('monthly')}
          >
            <View style={styles.pricingContent}>
              <Text style={[styles.pricingLabel, { color: colors.text }]}>
                {language === 'tr' ? 'Aylık' : 'Monthly'}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.primary }]}>
                  {monthlyPrice}
                </Text>
                <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                  /{language === 'tr' ? 'ay' : 'month'}
                </Text>
              </View>
            </View>
            {selectedPeriod === 'monthly' && (
              <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                <Text style={styles.selectedIndicatorText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, { backgroundColor: colors.primary }]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {language === 'tr' ? 'Premium\'a Geç' : 'Go Premium'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={[styles.restoreButtonText, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Satın Alımları Geri Yükle' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.terms, { color: colors.textMuted }]}>
          {language === 'tr' 
            ? 'Abonelik otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.'
            : 'Subscription auto-renews. You can cancel anytime.'}
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  crownIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Features
  featuresCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  featuresContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheck: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  // Pricing
  pricingContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  pricingOption: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  pricingContent: {
    paddingRight: 40,
  },
  pricingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  pricePeriod: {
    fontSize: 14,
    marginLeft: 4,
  },
  pricePerMonth: {
    fontSize: 12,
    marginTop: 4,
  },
  savingsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectedIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Buttons
  purchaseButton: {
    marginHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
  },
  terms: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
    lineHeight: 16,
  },
  // Premium Active
  premiumActiveContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    overflow: 'hidden',
  },
  premiumActiveTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
  },
  premiumActiveSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  remainingDaysCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  remainingDaysLabel: {
    fontSize: 14,
  },
  remainingDaysValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
