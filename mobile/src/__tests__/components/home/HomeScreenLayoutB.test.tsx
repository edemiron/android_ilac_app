/**
 * HomeScreenLayoutB tests — Sprint 99: Layout B paralel modernizasyonu.
 *
 * Layout A ile ayni gradient Header + 2x2 StatsGrid + SectionHeader paylasimli.
 * Test edilen davranislar:
 * - <Header> gradient component'i greet + progress + streak ile render edilir
 * - <StatsGrid> 2x2 grid Bugün/Alınan/Bekleyen/Stok Uyarısı ile render edilir
 * - Şu An + Bugün section title'lari <SectionHeader> kullanir
 * - onSeeAllMedicines verildiğinde "Tümü" linki gorunur
 * - reminders.length === 0 iken EmptyState fallback gosterilir
 * - lowStockMedicines verildiğinde LowStockCard render edilir
 * - miniChartData verildiğinde MiniChart render edilir
 * - Streak Gradient kartı kaldirildi (Header zaten streak chip tasiyor)
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

// StatsGrid @react-navigation/native kullaniyor (Stok Uyarisi navigation.navigate).
// LayoutB'den import edildigi icin mock'la.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn() }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4ECDC4',
      gradientStart: '#A78BFA',
      gradientEnd: '#5EE6FF',
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

// LowStockCard, MiniChart, EmptyState, InlineAdBanner'i stub'la.
// Bunlar zaten kendi testlerinde kapsamli test ediliyor; LayoutB sadece prop geçiriyor.
// findAllByType('ComponentName') calissin diye host element gibi davranan component'ler yaz.
jest.mock('../../../components/common', () => {
  const ReactLocal = require('react');
  const stub = (name: string) => {
    const C = () => ReactLocal.createElement(name, null);
    C.displayName = name;
    return C;
  };
  return {
    InlineAdBanner: stub('InlineAdBanner'),
    LowStockCard: stub('LowStockCard'),
    MiniChart: stub('MiniChart'),
    EmptyState: stub('EmptyState'),
  };
});

jest.mock('../../../components/common/MotiPressable', () => {
  const ReactLocal = require('react');
  return {
    MotiPressable: (props: { children?: React.ReactNode; [k: string]: unknown }) =>
      ReactLocal.createElement('MotiPressable', props, props.children),
  };
});

// CurrentDoseCard ve TimelineItem'i stub'la — LayoutB prop-forwarding davranisi yeterli.
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

import { HomeScreenLayoutB } from '../../../components/layouts/HomeScreenLayoutB';
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

const baseProps = {
  greeting: 'Merhaba, Ahmet',
  dynamicDate: 'Bugün',
  totalCount: 5,
  completedCount: 2,
  remainingCount: 3,
  lowStockCount: 0,
  streak: 0,
};

describe('HomeScreenLayoutB', () => {
  it('renders without crashing', () => {
    const { UNSAFE_root } = render(<HomeScreenLayoutB {...baseProps} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders Header with greeting and dynamic date', () => {
    const { getByText, queryAllByText } = render(<HomeScreenLayoutB {...baseProps} />);
    expect(getByText('Merhaba, Ahmet')).toBeTruthy();
    // "Bugün" hem Header (dynamicDate) hem StatsGrid (cell label) içinde geçer
    expect(queryAllByText(/Bugün/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders 2x2 StatsGrid with all four metric labels', () => {
    const { queryAllByText } = render(<HomeScreenLayoutB {...baseProps} />);
    // "Bugün" en az 1 (StatsGrid cell label) — Header dynamicDate ile cakisiyor olabilir
    expect(queryAllByText('Bugün').length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText('Alınan').length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText('Bekleyen').length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText('Stok Uyarısı').length).toBeGreaterThanOrEqual(1);
  });

  it('renders LowStockCard when lowStockMedicines is non-empty', () => {
    const { UNSAFE_root } = render(
      <HomeScreenLayoutB {...baseProps} lowStockMedicines={[fakeMedicine]} />
    );
    expect(UNSAFE_root.findAllByType('LowStockCard')).toHaveLength(1);
  });

  it('does not render LowStockCard when lowStockMedicines is empty', () => {
    const { UNSAFE_root } = render(
      <HomeScreenLayoutB {...baseProps} lowStockMedicines={[]} />
    );
    expect(UNSAFE_root.findAllByType('LowStockCard')).toHaveLength(0);
  });

  it('renders MiniChart when miniChartData is non-empty', () => {
    const { UNSAFE_root } = render(
      <HomeScreenLayoutB
        {...baseProps}
        miniChartData={[
          { dayLabel: 'Pzt', percentage: 80 },
          { dayLabel: 'Sal', percentage: 90 },
        ]}
      />
    );
    expect(UNSAFE_root.findAllByType('MiniChart')).toHaveLength(1);
  });

  it('does not render MiniChart when miniChartData is empty', () => {
    const { UNSAFE_root } = render(
      <HomeScreenLayoutB {...baseProps} miniChartData={[]} />
    );
    expect(UNSAFE_root.findAllByType('MiniChart')).toHaveLength(0);
  });

  it('renders CurrentDoseCard when reminder is provided', () => {
    const { UNSAFE_root } = render(
      <HomeScreenLayoutB {...baseProps} reminder={fakeReminder} />
    );
    expect(UNSAFE_root.findAllByType('CurrentDoseCard')).toHaveLength(1);
  });

  it('renders TimelineItems when reminders are provided', () => {
    const reminders = [fakeReminder, fakeReminder, fakeReminder];
    const { UNSAFE_root } = render(
      <HomeScreenLayoutB {...baseProps} reminders={reminders} />
    );
    expect(UNSAFE_root.findAllByType('TimelineItem')).toHaveLength(3);
  });

  it('renders EmptyState when reminders array is empty', () => {
    const { UNSAFE_root } = render(
      <HomeScreenLayoutB {...baseProps} reminders={[]} />
    );
    expect(UNSAFE_root.findAllByType('EmptyState')).toHaveLength(1);
  });

  it('renders "Tümü >" link when onSeeAllMedicines is provided', () => {
    const onSeeAll = jest.fn();
    const { getByText } = render(
      <HomeScreenLayoutB
        {...baseProps}
        reminders={[fakeReminder]}
        onSeeAllMedicines={onSeeAll}
      />
    );
    expect(getByText(/Tümü/)).toBeTruthy();
  });

  it('does not render "Tümü >" link when onSeeAllMedicines is omitted', () => {
    const { queryByText } = render(
      <HomeScreenLayoutB {...baseProps} reminders={[fakeReminder]} />
    );
    expect(queryByText(/Tümü/)).toBeNull();
  });

  it('forwards lowStockCount to StatsGrid (unique value)', () => {
    // baseProps totalCount=5/remainingCount=3; lowStockCount=8 unique olur
    const { queryAllByText, getByText } = render(
      <HomeScreenLayoutB {...baseProps} lowStockCount={8} />
    );
    // 8 değeri sadece Stok Uyarısı hücresinde görünür (diğer hücrelerde yok)
    expect(queryAllByText('8')).toHaveLength(1);
    expect(getByText('Stok Uyarısı')).toBeTruthy();
  });

  it('falls back to lowStockMedicines.length when lowStockCount is omitted (unique value)', () => {
    const medicines = [fakeMedicine, fakeMedicine, fakeMedicine, fakeMedicine];
    const { queryAllByText } = render(
      <HomeScreenLayoutB
        {...baseProps}
        lowStockCount={undefined as unknown as number}
        lowStockMedicines={medicines}
      />
    );
    // 4 değeri sadece Stok Uyarısı hücresinde (diğer hücrelerde yok)
    expect(queryAllByText('4')).toHaveLength(1);
  });

  it('passes completedCount/totalCount to Header for progress calculation', () => {
    const { getByText } = render(
      <HomeScreenLayoutB
        {...baseProps}
        totalCount={4}
        completedCount={1}
      />
    );
    // 1/4 = 25%
    expect(getByText('25% uyum')).toBeTruthy();
  });

  // Sprint 104.1: Karol-style floating trust badge her iki layout'ta da görünür
  it('renders TrustBadge (ANLIK · SESSİZ · GÜVENLİ) sağ alt köşede', () => {
    const { UNSAFE_root } = render(<HomeScreenLayoutB {...baseProps} />);
    const trustBadges = UNSAFE_root.findAllByProps({ testID: 'trust-badge' });
    expect(trustBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('TrustBadge tüm üç trust mesajını render eder', () => {
    const { getByText } = render(<HomeScreenLayoutB {...baseProps} />);
    expect(getByText('ANLIK')).toBeTruthy();
    expect(getByText('SESSİZ')).toBeTruthy();
    expect(getByText('GÜVENLİ')).toBeTruthy();
  });
});
