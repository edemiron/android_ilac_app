/**
 * OnboardingScreen — Sprint 60.
 *
 * 4-slide onboarding akışı:
 *  0. Welcome (Hoşgeldin)
 *  1. Hatırlatıcılar (Reminders)
 *  2. Adherence & İstatistik
 *  3. Bakıcı & Güvenlik (Permissions)
 *
 * FlatList tabanlı yatay pager + dot indicator + skip/ilerle/başla butonları.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnboarding, SlideIndex } from '../hooks/useOnboarding';
import { PillboxIllustration } from '../components/common/PillboxIllustration';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideContent {
  emoji: string;
  titleTr: string;
  titleEn: string;
  messageTr: string;
  messageEn: string;
}

const SLIDES: SlideContent[] = [
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

function Slide({ item }: { item: SlideContent }) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const tr = language === 'tr';

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.illustrationWrap}>
        {item.emoji === '💊' ? (
          <PillboxIllustration size={180} />
        ) : (
          <View
            style={[
              styles.emojiWrap,
              { backgroundColor: isDark ? colors.primaryContainer : '#CCFBF1' },
            ]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{tr ? item.titleTr : item.titleEn}</Text>

      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {tr ? item.messageTr : item.messageEn}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { currentSlide, totalSlides, goTo, complete } = useOnboarding();
  const tr = language === 'tr';
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

  const renderSlide = ({ item }: ListRenderItemInfo<SlideContent>) => <Slide item={item} />;

  const isLast = currentSlide === totalSlides - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.skipRow}>
        {!isLast && (
          <TouchableOpacity
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel={tr ? 'Atla' : 'Skip'}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {tr ? 'Atla' : 'Skip'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => `slide-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentSlide ? colors.primary : colors.outlineVariant,
                width: i === currentSlide ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? (tr ? 'Başla' : 'Get Started') : tr ? 'İleri' : 'Next'}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? (tr ? 'Başla' : 'Get Started') : tr ? 'İleri' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 44,
  },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 16, fontWeight: '600' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationWrap: {
    marginBottom: 40,
  },
  emojiWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 88 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 360,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  actions: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  nextBtn: {
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
