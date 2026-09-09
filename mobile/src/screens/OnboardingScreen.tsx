/**
 * OnboardingScreen — Sağlık Değerlendirme & Kişisel Tedavi Planı Quiz Funnel
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * 3 Adımlı İhtiyaç Belirleme Anketi + 1 Kişiselleştirilmiş Tedavi Uyum Raporu
 * koordinasyonu `useOnboardingController` Presenter Hook'u ile yönetilir.
 */

import React from 'react';
import { View, StyleSheet, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingControls } from '../components/common/OnboardingControls';
import { OnboardingQuizStep } from './OnboardingScreen/components/OnboardingQuizStep';
import { OnboardingAnalysisResult } from './OnboardingScreen/components/OnboardingAnalysisResult';
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
    quizSteps,
    answers,
    selectedOptionId,
    handleSelectOption,
    handleNext,
    handleSkip,
  } = useOnboardingController();

  const tr = language === 'tr';

  // FlatList 4 eleman: 3 soru + 1 analiz sonucu
  const data = [
    { type: 'quiz', stepData: quizSteps[0] },
    { type: 'quiz', stepData: quizSteps[1] },
    { type: 'quiz', stepData: quizSteps[2] },
    { type: 'result', answers },
  ];

  const renderItem = ({ item, index }: { item: (typeof data)[0]; index: number }) => {
    if (item.type === 'quiz' && item.stepData) {
      return (
        <OnboardingQuizStep
          data={item.stepData}
          selectedOptionId={index === currentSlide ? selectedOptionId : null}
          onSelectOption={handleSelectOption}
          colors={colors}
          isDark={isDark}
          language={language}
        />
      );
    }

    return (
      <OnboardingAnalysisResult
        answers={answers}
        colors={colors}
        isDark={isDark}
        language={language}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Üst İlerleme Çubuğu (Progress Bar) */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary,
              width: `${((currentSlide + 1) / totalSlides) * 100}%`,
            },
          ]}
        />
      </View>

      <FlatList
        ref={listRef as unknown as React.RefObject<FlatList>}
        data={data}
        renderItem={renderItem}
        keyExtractor={(_, i) => `onboarding-step-${i}`}
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
        nextLabel={tr ? 'Devam Et →' : 'Continue →'}
        startLabel={tr ? 'Kişisel Planımı Başlat 🚀' : 'Start My Plan 🚀'}
        skipLabel={tr ? 'Atla' : 'Skip'}
        showSkip={!isLast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
