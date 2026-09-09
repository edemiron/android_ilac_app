/**
 * OnboardingQuiz.test.tsx — Sağlık Değerlendirme Quiz ve Analiz Ekranı Testleri
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  useWindowDimensions: () => ({ width: 375, height: 812 }),
  Platform: {
    OS: 'android',
    select: (objs: any) => objs.android || objs.default,
  },
}));

import { OnboardingQuizStep } from '../../screens/OnboardingScreen/components/OnboardingQuizStep';
import { OnboardingAnalysisResult } from '../../screens/OnboardingScreen/components/OnboardingAnalysisResult';
import { ONBOARDING_QUIZ_STEPS } from '../../screens/OnboardingScreen/hooks/useOnboardingController';
import { createThemeMock } from '../helpers/themeMock';

describe('Onboarding Health Quiz Components', () => {
  const colors = createThemeMock();

  it('renders Step 1 quiz correctly and handles option selection', () => {
    const step1Data = ONBOARDING_QUIZ_STEPS[0];
    const onSelectOption = jest.fn();

    const { getByText } = render(
      <OnboardingQuizStep
        data={step1Data}
        selectedOptionId="myself"
        onSelectOption={onSelectOption}
        colors={colors}
        isDark={false}
        language="tr"
      />
    );

    expect(getByText('Bu uygulamayı kimin için kullanacaksınız?')).toBeTruthy();
    expect(getByText('Kendim için')).toBeTruthy();
    expect(getByText('Annem / Babam (Yaşlı Aile Büyüğü)')).toBeTruthy();

    fireEvent.press(getByText('Annem / Babam (Yaşlı Aile Büyüğü)'));
    expect(onSelectOption).toHaveBeenCalledWith('parents');
  });

  it('renders Step 2 medication load options in English', () => {
    const step2Data = ONBOARDING_QUIZ_STEPS[1];
    const onSelectOption = jest.fn();

    const { getByText } = render(
      <OnboardingQuizStep
        data={step2Data}
        selectedOptionId="multi"
        onSelectOption={onSelectOption}
        colors={colors}
        isDark={false}
        language="en"
      />
    );

    expect(getByText('How many different medicines/vitamins per day?')).toBeTruthy();
    expect(getByText('3 - 5 Medicines (Regular Therapy)')).toBeTruthy();
  });

  it('renders OnboardingAnalysisResult with adherence score and personalized protection shields', () => {
    const { getByText } = render(
      <OnboardingAnalysisResult
        answers={{
          target: 'parents',
          medCount: 'heavy',
          concern: 'caregiver_worry',
        }}
        colors={colors}
        isDark={false}
        language="tr"
      />
    );

    expect(getByText('Tedavi Uyum Başarınız:')).toBeTruthy();
    expect(getByText('%98.4')).toBeTruthy();
    expect(getByText('Arka Planda Susmayan Fail-Safe Alarm')).toBeTruthy();
    expect(getByText('Çift Yönlü Bakıcı ve Aile Ağı')).toBeTruthy();
    expect(getByText('Klinik İlaç & Besin Etkileşim Koruması')).toBeTruthy();
  });
});
