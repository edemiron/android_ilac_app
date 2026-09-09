/**
 * useOnboardingController — Onboarding & Sağlık Değerlendirme Quiz Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * 3 adımlı Sağlık Quiz'i + 1 Kişisel Tedavi Analizi ve Uyum Raporu
 * koordinasyonunu UI katmanından izole eder.
 */

import { useState, useRef } from 'react';
import { FlatList, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOnboarding, type SlideIndex } from '../../../hooks/useOnboarding';
import type { QuizStepData } from '../components/OnboardingQuizStep';

export const QUIZ_STORAGE_KEY = '@onboarding_quiz_answers';

export const ONBOARDING_QUIZ_STEPS: QuizStepData[] = [
  {
    step: 1,
    totalSteps: 3,
    badgeTr: 'Adım 1 / 3 — Kullanım Amacı',
    badgeEn: 'Step 1 / 3 — Primary Goal',
    titleTr: 'Bu uygulamayı kimin için kullanacaksınız?',
    titleEn: 'Who are you tracking medications for?',
    subtitleTr: 'Size en uygun bildirim ve güvenlik planını hazırlayalım.',
    subtitleEn: 'Let us prepare the most accurate reminder and safety plan for you.',
    options: [
      {
        id: 'myself',
        icon: '👤',
        titleTr: 'Kendim için',
        titleEn: 'For Myself',
        descTr: 'Kendi günlük ilaç, vitamin ve tedavi rutinimi yönetmek istiyorum.',
        descEn: 'I want to manage my own daily medication, vitamin, and health routine.',
      },
      {
        id: 'parents',
        icon: '👵',
        titleTr: 'Annem / Babam (Yaşlı Aile Büyüğü)',
        titleEn: 'My Parents / Elderly Family',
        descTr: 'Uzakta veya yanımda olan ebeveynimin ilaçlarını güvenle takip etmek istiyorum.',
        descEn: 'I want to ensure my parents take their critical medications on time.',
      },
      {
        id: 'family',
        icon: '👨‍👩‍👧',
        titleTr: 'Eşim veya Çocuğum için',
        titleEn: 'For Spouse or Child',
        descTr: 'Ailemin ortak sağlık ve reçete takvimini düzenlemek istiyorum.',
        descEn: 'I want to organize our family healthcare schedule.',
      },
      {
        id: 'patient',
        icon: '🩺',
        titleTr: 'Hastam / Bakım Verdiğim Kişi',
        titleEn: 'Patient / Under My Care',
        descTr: 'Düzenli bakım sağladığım bir hastanın kritik dozlarını yönetiyorum.',
        descEn: 'I am a caregiver managing multiple critical prescriptions.',
      },
    ],
  },
  {
    step: 2,
    totalSteps: 3,
    badgeTr: 'Adım 2 / 3 — İlaç Yükü',
    badgeEn: 'Step 2 / 3 — Medication Load',
    titleTr: 'Günde kaç farklı ilaç veya takviye alınıyor?',
    titleEn: 'How many different medicines/vitamins per day?',
    subtitleTr: 'Kritik etkileşim ve takvim karmaşasını engellemek için önemlidir.',
    subtitleEn: 'Essential to prevent critical drug interactions and scheduling conflicts.',
    options: [
      {
        id: 'simple',
        icon: '💊',
        titleTr: '1 - 2 İlaç / Takviye (Temel Takip)',
        titleEn: '1 - 2 Medicines / Supplements',
        descTr: 'Günde 1 veya 2 kez basit zamanlama ve düzenli hatırlatma.',
        descEn: 'Simple 1 or 2 times daily reminders.',
      },
      {
        id: 'multi',
        icon: '💊💊',
        titleTr: '3 - 5 İlaç (Orta Düzey Tedavi)',
        titleEn: '3 - 5 Medicines (Regular Therapy)',
        descTr: 'Sabah, öğle, akşam farklı saatlerde aç/tok kuralları olan ilaçlar.',
        descEn: 'Multiple daily prescriptions with before/after meal rules.',
      },
      {
        id: 'heavy',
        icon: '💊💊💊',
        titleTr: '6+ İlaç (Yoğun / Kronik Tedavi)',
        titleEn: '6+ Medicines (Intensive Care)',
        descTr: 'Çoklu reçete, tansiyon, kalp, şeker gibi sıkı takip gerektiren durumlar.',
        descEn: 'Complex chronic conditions requiring strict schedule adherence.',
      },
    ],
  },
  {
    step: 3,
    totalSteps: 3,
    badgeTr: 'Adım 3 / 3 — Öncelikli İhtiyaç',
    badgeEn: 'Step 3 / 3 — Primary Concern',
    titleTr: 'En çok zorlandığınız veya endişe ettiğiniz durum nedir?',
    titleEn: 'What is your biggest concern or struggle?',
    subtitleTr: 'Sağlık asistanınızı bu sorunu sıfırlayacak şekilde yapılandıralım.',
    subtitleEn: 'We will configure your safety assistant to eliminate this exact issue.',
    options: [
      {
        id: 'missed',
        icon: '⏰',
        titleTr: 'İlaç saatini kaçırmak veya unutmak',
        titleEn: 'Missing or forgetting doses',
        descTr: 'Günlük yoğunlukta saatlerin atlanması ve tedavinin aksaması.',
        descEn: 'Busy schedule leading to skipped or delayed medication hours.',
      },
      {
        id: 'double_dose',
        icon: '❓',
        titleTr: 'İlacı içip içmediğimden emin olamamak',
        titleEn: 'Unsure if medicine was taken',
        descTr: 'Aynı ilacı yanlışlıkla iki kez içme korkusu ve kafa karışıklığı.',
        descEn: 'Fear of accidental double-dosing and uncertainty.',
      },
      {
        id: 'stock',
        icon: '📦',
        titleTr: 'İlacın bitmesi / Eczaneyi unutmak',
        titleEn: 'Running out of pills / Refills',
        descTr: 'Kutuda ilaç kalmadığını son anda fark edip dozu kaçırmak.',
        descEn: 'Realizing the box is empty at the last minute.',
      },
      {
        id: 'caregiver_worry',
        icon: '👨‍👩‍👧‍👦',
        titleTr: 'Yakınımın ilacını içip içmediğini bilememek',
        titleEn: 'Worrying if loved one took meds',
        descTr: 'Uzakta olduğum için sürekli aramak ve merak içinde kalmak.',
        descEn: 'Constant anxiety and calling parents repeatedly.',
      },
    ],
  },
];

export function useOnboardingController() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { currentSlide, totalSlides, goTo, complete } = useOnboarding();
  const listRef = useRef<FlatList<unknown>>(null);

  const [answers, setAnswers] = useState<{
    target: string | null;
    medCount: string | null;
    concern: string | null;
  }>({
    target: 'myself',
    medCount: 'multi',
    concern: 'missed',
  });

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

  const handleSelectOption = (optionId: string) => {
    if (currentSlide === 0) {
      setAnswers(prev => ({ ...prev, target: optionId }));
    } else if (currentSlide === 1) {
      setAnswers(prev => ({ ...prev, medCount: optionId }));
    } else if (currentSlide === 2) {
      setAnswers(prev => ({ ...prev, concern: optionId }));
    }
  };

  const getSelectedOptionId = () => {
    if (currentSlide === 0) return answers.target;
    if (currentSlide === 1) return answers.medCount;
    if (currentSlide === 2) return answers.concern;
    return null;
  };

  const handleNext = async () => {
    if (currentSlide < totalSlides - 1) {
      const nextIdx = (currentSlide + 1) as SlideIndex;
      goTo(nextIdx);
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
    } else {
      // Son analiz adımı — Yanıtları AsyncStorage'a kaydet + İzin iste + Tamamla
      try {
        await AsyncStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(answers));
      } catch (_err) {
        // ignore
      }
      await requestNotificationPermission();
      await complete();
    }
  };

  const handleSkip = async () => {
    await complete();
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
    quizSteps: ONBOARDING_QUIZ_STEPS,
    answers,
    selectedOptionId: getSelectedOptionId(),
    handleSelectOption,
    handleNext,
    handleSkip,
  };
}
