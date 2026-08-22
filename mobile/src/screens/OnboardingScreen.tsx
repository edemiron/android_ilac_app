/**
 * OnboardingScreen — İlk Kurulum ve Tanıtım Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Slayt akışı, FlatList pager yönetimi ve bildirim izinleri
 * `useOnboardingController` Presenter Hook'una aktarılmıştır.
 */

import React from 'react';
import { StyleSheet, Dimensions, FlatList, ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingControls } from '../components/common/OnboardingControls';
import { OnboardingSlide, type SlideContent } from './OnboardingScreen/components/OnboardingSlide';
import { useOnboardingController } from './OnboardingScreen/hooks/useOnboardingController';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const {
    colors,
    isDark,
    language,
    currentSlide,
    totalSlides,
    isLast,
    listRef,
    slides,
    handleNext,
    handleSkip,
  } = useOnboardingController();

  const tr = language === 'tr';

  const renderSlide = ({ item }: ListRenderItemInfo<SlideContent>) => (
    <OnboardingSlide item={item} colors={colors} isDark={isDark} language={language} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={listRef}
        data={slides}
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

      <OnboardingControls
        total={totalSlides}
        currentIndex={currentSlide}
        isLast={isLast}
        onNext={handleNext}
        onSkip={handleSkip}
        nextLabel={tr ? 'İleri' : 'Next'}
        startLabel={tr ? 'Başla' : 'Get Started'}
        skipLabel={tr ? 'Atla' : 'Skip'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
