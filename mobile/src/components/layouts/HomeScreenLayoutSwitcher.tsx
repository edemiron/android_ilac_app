/**
 * HomeScreenLayoutSwitcher — Sprint 58.
 *
 * useUserProfile hook'undan layout tercihini okur, uygun layout component'ini render eder.
 */

import React from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { HomeScreenLayoutA } from './HomeScreenLayoutA';
import { HomeScreenLayoutB } from './HomeScreenLayoutB';
import type { TodayReminder } from '../../screens/HomeScreen/types';

interface SwitcherProps {
  reminder?: TodayReminder;
  reminders?: TodayReminder[];
  adherence?: number;
  streak?: number;
  onTake?: () => void;
  onSnooze?: (minutes: number) => void;
  onSkip?: () => void;
  onAddPress?: () => void;
}

export function HomeScreenLayoutSwitcher({
  reminder,
  reminders = [],
  adherence = 0,
  streak = 0,
  onTake,
  onSnooze,
  onSkip,
  onAddPress,
}: SwitcherProps) {
  const { profile, isLoading } = useUserProfile();

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
        onTake={onTake}
        onSnooze={onSnooze}
        onSkip={onSkip}
      />
    );
  }

  return <HomeScreenLayoutA reminder={reminder} reminders={reminders} onAddPress={onAddPress} />;
}
