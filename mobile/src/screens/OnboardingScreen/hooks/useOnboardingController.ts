/**
 * useOnboardingController — OnboardingScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * 4 adımlı karşılama slaytları, Android 13+ bildirim izni isteme ve tamamlama
 * state koordinasyonunu UI katmanından izole eder.
 */

import { useRef } from 'react';
import { FlatList, Platform, PermissionsAndroid } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOnboarding, type SlideIndex } from '../../../hooks/useOnboarding';
import type { SlideContent } from '../components/OnboardingSlide';

export const ONBOARDING_SLIDES: SlideContent[] = [
  {
    emoji: '💊',
    titleTr: 'İlaç Takibine Hoş Geldin',
    titleEn: 'Welcome to Medicine Tracking',
    messageTr: 'İlaçlarını zamanında al, sağlığını takip et. Senin için en kolay yolu sunuyoruz.',
    messageEn: 'Take your medicine on time, track your health. We offer you the easiest way.',
  },
  {
    emoji: '⏰',
    titleTr: 'Akıllı Hatırlatıcılar',
    titleEn: 'Smart Reminders',
    messageTr: 'Her ilaç için özel zaman, ses ve titreşim ayarla. Asla bir dozu kaçırma.',
    messageEn: 'Set custom time, sound, and vibration for each medicine. Never miss a dose.',
  },
  {
    emoji: '📊',
    titleTr: 'Adherence & İstatistik',
    titleEn: 'Adherence & Statistics',
    messageTr: 'Uyum oranını, gün serini ve detaylı raporları takip et. Sağlık hedeflerine ulaş.',
    messageEn:
      'Track your adherence rate, day streak, and detailed reports. Reach your health goals.',
  },
  {
    emoji: '👨‍⚕️',
    titleTr: 'Bakıcı & Güvenlik',
    titleEn: 'Caregiver & Security',
    messageTr: 'Aile bireylerini bakıcı olarak ekle. Bildirimler ve verilerin güvende.',
    messageEn: 'Add family members as caregivers. Notifications and data are secure.',
  },
];

export function useOnboardingController() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { currentSlide, totalSlides, goTo, complete } = useOnboarding();
  const listRef = useRef<FlatList<SlideContent>>(null);

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS' as Parameters<
            typeof PermissionsAndroid.request
          >[0]
        );
      } catch (_err) {
        // ignore
      }
    }
  };

  const handleNext = async () => {
    if (currentSlide < totalSlides - 1) {
      const nextIdx = (currentSlide + 1) as SlideIndex;
      goTo(nextIdx);
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
    } else {
      // Son slide — izin iste + tamamla
      await requestNotificationPermission();
      await complete();
    }
  };

  const handleSkip = () => {
    complete();
  };

  const isLast = currentSlide === totalSlides - 1;

  return {
    colors,
    isDark,
    language,
    currentSlide,
    totalSlides,
    isLast,
    listRef,
    slides: ONBOARDING_SLIDES,
    handleNext,
    handleSkip,
  };
}
