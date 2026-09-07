import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
  },
  Modal: 'Modal',
  Pressable: 'Pressable',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'android' },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

const mockColors = {
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  error: '#B91C1C',
  primary: '#0D9488',
  border: '#E2E8F0',
  background: '#F8FAFC',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: mockColors,
    isDark: false,
  }),
}));

jest.mock('../../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    success: jest.fn(),
    selection: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  }),
}));

import { CurrentDoseCard } from '../../../screens/HomeScreen/components/CurrentDoseCard';
import type { TodayReminder } from '../../../screens/HomeScreen/types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

const mockReminder: TodayReminder = {
  medicine: {
    id: 'med-parol',
    name: 'PAROL PLUS 30 TABLET',
    dosage: '1 tablet',
    instructions: 'after_meal',
    color: '#3B82F6',
    startDate: '2026-08-31', // Medicine.startDate zorunlu
    isActive: true,
    frequency: 1, // Medicine.frequency gunde kac kez = SAYI ('daily' degil)
    createdAt: '2026-08-31T10:00:00Z',
    updatedAt: '2026-08-31T10:00:00Z',
  },
  reminderTime: {
    id: 'rt-parol-1',
    medicineId: 'med-parol',
    time: '23:59',
    isEnabled: true,
  },
  log: undefined,
};

describe('CurrentDoseCard — Early Dose Clinical Safety', () => {
  const testColors = mockColors as unknown as ThemeColors;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 6, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders "Erken Al" and hides snooze when dose is > 45 mins in the future', () => {
    const onTake = jest.fn();
    const onSnooze = jest.fn();
    const onSkip = jest.fn();

    const { getByText, queryByText } = render(
      <CurrentDoseCard
        reminder={mockReminder}
        colors={testColors}
        isDark={false}
        language="tr"
        onTake={onTake}
        onSnooze={onSnooze}
        onSkip={onSkip}
      />
    );

    // Should display "Erken Al"
    expect(getByText('Erken Al')).toBeTruthy();
    // Snooze should be hidden
    expect(queryByText('Ertele')).toBeNull();
    // Skip should be present
    expect(getByText('Atla')).toBeTruthy();
  });

  it('shows confirmation dialog when "Erken Al" is tapped', () => {
    const onTake = jest.fn();

    const { getByText } = render(
      <CurrentDoseCard
        reminder={mockReminder}
        colors={testColors}
        isDark={true}
        language="tr"
        onTake={onTake}
      />
    );

    fireEvent.press(getByText('Erken Al'));

    // Confirmation dialog should appear with clinical warning
    expect(getByText('⚠️ Erken İlaç Alım Uyarısı')).toBeTruthy();
    expect(getByText('Evet, Erken Aldım')).toBeTruthy();
    expect(getByText('Vazgeç')).toBeTruthy();

    // onTake should not be called yet
    expect(onTake).not.toHaveBeenCalled();

    // Confirm early take
    fireEvent.press(getByText('Evet, Erken Aldım'));
    expect(onTake).toHaveBeenCalledTimes(1);
  });

  it('renders "Şimdi Al" and visible snooze when dose is due now or overdue', () => {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const dueReminder: TodayReminder = {
      ...mockReminder,
      reminderTime: {
        ...mockReminder.reminderTime,
        time: currentHHMM,
      },
    };

    const onTake = jest.fn();
    const onSnooze = jest.fn();

    const { getByText } = render(
      <CurrentDoseCard
        reminder={dueReminder}
        colors={testColors}
        isDark={false}
        language="tr"
        onTake={onTake}
        onSnooze={onSnooze}
      />
    );

    expect(getByText('Şimdi Al')).toBeTruthy();
    expect(getByText('Ertele')).toBeTruthy();

    // Direct take without confirmation modal
    fireEvent.press(getByText('Şimdi Al'));
    expect(onTake).toHaveBeenCalledTimes(1);
  });
});
