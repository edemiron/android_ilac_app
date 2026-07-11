/**
 * HomeScreenLayoutSwitcher — Sprint 58.5 + 62.
 *
 * useUserProfile hook'undan layout tercihini okur, uygun layout component'ini render eder.
 * Layout B (Detaylı) 7 MD3 kartı, Layout A (Sade) minimal görünüm.
 * Sprint 62: Layout A↔B geçişinde LayoutAnimation (RN built-in) ile crossfade.
 */

import React, { useEffect, useRef } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { useUserProfile } from '../../hooks/useUserProfile';
import { HomeScreenLayoutA } from './HomeScreenLayoutA';
import { HomeScreenLayoutB } from './HomeScreenLayoutB';
import type { TodayReminder } from '../../screens/HomeScreen/types';
import type { Medicine } from '../../types';
import type { MiniChartDatum } from '../common/MiniChart';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LAYOUT_ANIMATION_CONFIG = {
  duration: 300,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
    duration: 300,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.7,
    duration: 300,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
    duration: 200,
  },
};

interface SwitcherProps {
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  adherence?: number;
  streak?: number;
  completedCount?: number;
  totalCount?: number;
  remainingCount?: number;
  lowStockMedicines?: Medicine[];
  miniChartData?: MiniChartDatum[];
  isPremium?: boolean;
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
  onAddPress?: () => void;
  onLowStockPress?: () => void;
}

export function HomeScreenLayoutSwitcher({
  reminder,
  reminders = [],
  adherence = 0,
  streak = 0,
  completedCount = 0,
  totalCount = 0,
  remainingCount = 0,
  lowStockMedicines = [],
  miniChartData = [],
  isPremium = false,
  onTake,
  onSnooze,
  onSkip,
  onAddPress,
  onLowStockPress,
}: SwitcherProps) {
  const { profile, isLoading } = useUserProfile();
  const previousLayoutRef = useRef<string | null>(null);

  // Sprint 62: Layout değişiminde animasyon (ilk mount hariç)
  useEffect(() => {
    if (previousLayoutRef.current !== null && previousLayoutRef.current !== profile.layout) {
      LayoutAnimation.configureNext(LAYOUT_ANIMATION_CONFIG);
    }
    previousLayoutRef.current = profile.layout;
  }, [profile.layout]);

  if (isLoading) {
    return <HomeScreenLayoutA reminder={reminder} reminders={reminders} onAddPress={onAddPress} />;
  }

  if (profile.layout === 'B') {
    return (
      <HomeScreenLayoutB
        reminder={reminder}
        reminders={reminders}
        adherence={adherence}
        streak={streak}
        completedCount={completedCount}
        totalCount={totalCount}
        remainingCount={remainingCount}
        lowStockMedicines={lowStockMedicines}
        miniChartData={miniChartData}
        isPremium={isPremium}
        onTake={onTake}
        onSnooze={onSnooze}
        onSkip={onSkip}
        onAddPress={onAddPress}
        onLowStockPress={onLowStockPress}
      />
    );
  }

  return <HomeScreenLayoutA reminder={reminder} reminders={reminders} onAddPress={onAddPress} />;
}
