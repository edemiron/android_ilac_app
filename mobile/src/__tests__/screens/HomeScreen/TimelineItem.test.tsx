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

import { TimelineItem } from '../../../screens/HomeScreen/components/TimelineItem';
import type { TodayReminder } from '../../../screens/HomeScreen/types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

const mockReminder: TodayReminder = {
  medicine: {
    id: 'med-nexium',
    name: 'NEXIUM 40 MG TABLET',
    dosage: '1 tablet',
    instructions: 'empty_stomach',
    color: '#8B5CF6',
    startDate: '2026-08-31', // Medicine.startDate zorunlu
    isActive: true,
    frequency: 1, // Medicine.frequency gunde kac kez = SAYI ('daily' degil)
    createdAt: '2026-08-31T10:00:00Z',
    updatedAt: '2026-08-31T10:00:00Z',
  },
  reminderTime: {
    id: 'rt-nexium-1',
    medicineId: 'med-nexium',
    time: '23:59',
    isEnabled: true,
  },
  log: undefined,
};

describe('TimelineItem — Early Dose Confirmation & Styling', () => {
  const testColors = mockColors as unknown as ThemeColors;

  it('renders "Erken Al" and requires confirmation for future doses', () => {
    const onTakeNow = jest.fn();

    const { getByText } = render(
      <TimelineItem
        reminder={mockReminder}
        colors={testColors}
        language="tr"
        onTakeNow={onTakeNow}
      />
    );

    expect(getByText('Erken Al')).toBeTruthy();

    fireEvent.press(getByText('Erken Al'));
    expect(getByText('⚠️ Erken İlaç Alım Uyarısı')).toBeTruthy();
    expect(onTakeNow).not.toHaveBeenCalled();

    fireEvent.press(getByText('Evet, Erken Aldım'));
    expect(onTakeNow).toHaveBeenCalledTimes(1);
  });
});
