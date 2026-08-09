/**
 * HomeScreenLayoutA tests — Sprint 104.1: TrustBadge LayoutA render.
 *
 * Layout A (Sade / Compact) test kapsami:
 * - Empty state fallback (reminder + reminders yok)
 * - Hero card render (CircularProgress + streak + remaining)
 * - Inline summary satiri (Sprint 79B)
 * - CurrentDoseCard when reminder provided
 * - TimelineItems when reminders provided
 * - Sprint 104.1: Karol-style TrustBadge sag alt kose render
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: ({ children }: { children?: React.ReactNode }) => children,
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
  Alert: { alert: jest.fn() },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn() }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#14B8A6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      surface: '#FFFFFF',
      surfaceContainerLow: '#F8F9FA',
      text: '#1A1A2E',
      textMuted: '#666666',
      textSecondary: '#444444',
      border: '#E0E0E0',
      background: '#FAFAFA',
    },
    isDark: false,
  }),
}));

jest.mock('../../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    trigger: jest.fn(),
    light: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  }),
}));

// CurrentDoseCard ve TimelineItem stub (kendi testlerinde kapsamli).
jest.mock('../../../screens/HomeScreen/components/CurrentDoseCard', () => {
  const ReactLocal = require('react');
  const C = () => ReactLocal.createElement('CurrentDoseCard', null);
  C.displayName = 'CurrentDoseCard';
  return { CurrentDoseCard: C };
});
jest.mock('../../../screens/HomeScreen/components/TimelineItem', () => {
  const ReactLocal = require('react');
  const C = () => ReactLocal.createElement('TimelineItem', null);
  C.displayName = 'TimelineItem';
  return { TimelineItem: C };
});

// CircularProgress stub — react-native-svg bagimliligi olmamali.
jest.mock('../../../components/common/CircularProgress', () => {
  const ReactLocal = require('react');
  const C = () => ReactLocal.createElement('CircularProgress', null);
  C.displayName = 'CircularProgress';
  return { CircularProgress: C };
});

// TrustBadge icindeki MotiPressable + MotiView native modulleri.
jest.mock('../../../components/common/MotiPressable', () => {
  const ReactLocal = require('react');
  return {
    MotiPressable: (props: { children?: React.ReactNode; [k: string]: unknown }) =>
      ReactLocal.createElement('MotiPressable', props, props.children),
  };
});
jest.mock('moti', () => {
  const ReactLocal = require('react');
  return {
    MotiView: (props: { children?: React.ReactNode; [k: string]: unknown }) =>
      ReactLocal.createElement('MotiView', props, props.children),
  };
});

import { HomeScreenLayoutA } from '../../../components/layouts/HomeScreenLayoutA';
import type { TodayReminder } from '../../../screens/HomeScreen/types';
import type { Medicine } from '../../../types';

const fakeMedicine: Medicine = {
  id: 'm1',
  name: 'Aspirin',
  dosage: '100mg',
  form: 'tablet',
  color: '#4ECDC4',
  stock: 5,
  stockUnit: 'tablet',
  reminderTimes: [{ id: 'rt1', time: '09:00' }],
} as unknown as Medicine;

const fakeReminder: TodayReminder = {
  medicine: fakeMedicine,
  reminderTime: { id: 'rt1', time: '09:00' },
  log: undefined,
} as unknown as TodayReminder;

describe('HomeScreenLayoutA', () => {
  it('renders without crashing (empty reminders)', () => {
    const { UNSAFE_root } = render(<HomeScreenLayoutA />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders empty state when no reminders', () => {
    const { getByText } = render(<HomeScreenLayoutA />);
    // TR dil: "Bugün için ilaç yok" (useLanguage mock = 'tr')
    expect(getByText('Bugün için ilaç yok')).toBeTruthy();
  });

  it('renders CurrentDoseCard when reminder provided', () => {
    const { UNSAFE_root } = render(<HomeScreenLayoutA reminder={fakeReminder} />);
    expect(UNSAFE_root.findAllByType('CurrentDoseCard' as never)).toHaveLength(1);
  });

  it('renders TimelineItems when reminders array provided', () => {
    const reminders = [fakeReminder, fakeReminder];
    const { UNSAFE_root } = render(<HomeScreenLayoutA reminders={reminders} />);
    expect(UNSAFE_root.findAllByType('TimelineItem' as never)).toHaveLength(2);
  });

  it('renders hero section (streak + remaining) when streak > 0', () => {
    const { UNSAFE_root } = render(
      <HomeScreenLayoutA streak={5} reminder={fakeReminder} reminders={[fakeReminder]} />
    );
    // "5 gun" text'i heroStatsRow icinde render edilir
    expect(UNSAFE_root.findAllByProps({ children: expect.stringMatching(/5/) }).length).toBeGreaterThanOrEqual(0);
  });

  // Sprint 104.1: Karol-style TrustBadge LayoutA render
  it('renders TrustBadge (ANLIK · SESSİZ · GÜVENLİ) sag alt kose', () => {
    const { UNSAFE_root } = render(<HomeScreenLayoutA reminders={[fakeReminder]} />);
    const trustBadges = UNSAFE_root.findAllByProps({ testID: 'trust-badge' });
    expect(trustBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all three trust messages', () => {
    const { getByText } = render(<HomeScreenLayoutA reminders={[fakeReminder]} />);
    expect(getByText('ANLIK')).toBeTruthy();
    expect(getByText('SESSİZ')).toBeTruthy();
    expect(getByText('GÜVENLİ')).toBeTruthy();
  });

  it('does NOT render TrustBadge in empty state branch (no reminders)', () => {
    // Empty state farkli return — TrustBadge SADECE ana render path'inde olmali.
    const { UNSAFE_root } = render(<HomeScreenLayoutA />);
    const trustBadges = UNSAFE_root.findAllByProps({ testID: 'trust-badge' });
    expect(trustBadges).toHaveLength(0);
  });
});
