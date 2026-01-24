import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '@react-navigation/native';

// AdMob Banner Ad Unit ID
const BANNER_AD_UNIT_ID = Platform.select({
  android: 'ca-app-pub-3909827768413000/6113318790',
  ios: 'ca-app-pub-3909827768413000/6113318790', // iOS için de aynı veya farklı ID kullanılabilir
}) || '';

// AdMob SDK'yı dinamik olarak yükle
let BannerAd: any = null;
let BannerAdSize: any = null;
let useForeground: any = null;

try {
  const GoogleMobileAds = require('react-native-google-mobile-ads');
  BannerAd = GoogleMobileAds.BannerAd;
  BannerAdSize = GoogleMobileAds.BannerAdSize;
  useForeground = GoogleMobileAds.useForeground;
} catch (e) {
  console.log('Google Mobile Ads SDK yüklenemedi');
}

interface AdBannerProps {
  style?: any;
}

export default function AdBanner({ style }: AdBannerProps) {
  const { shouldShowAds, isPremium } = useSubscription();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const navigation = useNavigation<any>();
  const [adError, setAdError] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  // Premium kullanıcılara reklam gösterme
  if (isPremium || !shouldShowAds()) {
    return null;
  }

  // AdMob yüklenemediyse veya hata olduysa placeholder göster
  if (!BannerAd || adError) {
    return (
      <TouchableOpacity 
        style={[styles.placeholderContainer, { backgroundColor: colors.card, borderColor: colors.divider }, style]}
        onPress={() => navigation.navigate('Premium')}
        activeOpacity={0.8}
      >
        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderIcon}>⭐</Text>
          <View style={styles.placeholderTextContainer}>
            <Text style={[styles.placeholderTitle, { color: colors.text }]}>
              {language === 'tr' ? 'Reklamsız Kullanın' : 'Go Ad-Free'}
            </Text>
            <Text style={[styles.placeholderSubtitle, { color: colors.textSecondary }]}>
              {language === 'tr' ? "Premium'a geçin" : 'Upgrade to Premium'}
            </Text>
          </View>
          <Text style={[styles.placeholderArrow, { color: colors.primary }]}>→</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('Banner reklam yüklendi');
          setAdLoaded(true);
          setAdError(false);
        }}
        onAdFailedToLoad={(error: any) => {
          console.log('Banner reklam yüklenemedi:', error);
          setAdError(true);
        }}
      />
    </View>
  );
}

// Sayfa altı için sabit banner
export function BottomAdBanner() {
  const { shouldShowAds, isPremium } = useSubscription();
  const { colors } = useTheme();

  if (isPremium || !shouldShowAds()) {
    return null;
  }

  return (
    <View style={[styles.bottomContainer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
      <AdBanner />
    </View>
  );
}

// Inline banner (liste aralarında kullanım için)
export function InlineAdBanner() {
  const { shouldShowAds, isPremium } = useSubscription();
  const { colors } = useTheme();

  if (isPremium || !shouldShowAds()) {
    return null;
  }

  return (
    <View style={styles.inlineContainer}>
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
  },
  inlineContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  // Placeholder styles
  placeholderContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  placeholderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  placeholderTextContainer: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  placeholderArrow: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
