import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('../../utils/speech', () => ({
  speakMedicineReminder: jest.fn().mockResolvedValue(undefined),
  stopSpeaking: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#0D9488',
      secondary: '#F43F5E',
      background: '#F8FAFC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textSecondary: '#64748B',
      surfaceContainer: '#F1F5F9',
    },
    isDark: false,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (k: string) => k,
  }),
}));

import { SeniorHomeView } from '../../screens/HomeScreen/components/SeniorHomeView';
import type { TodayReminder } from '../../screens/HomeScreen/types';
import { speakMedicineReminder } from '../../utils/speech';

const mockReminder: TodayReminder = {
  medicine: {
    id: 'med-1',
    name: 'Aspirin',
    dosage: '500mg',
    frequency: 1,
    instructions: 'after_meal',
    color: '#0D9488',
    startDate: '2026-01-01',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    requireBarcodeOnTake: false,
    barcode: '',
  },
  reminderTime: {
    id: 'rt-1',
    medicineId: 'med-1',
    time: '08:00',
    isEnabled: true,
  },
};

describe('SeniorHomeView (Kolay Mod)', () => {
  it('renders active medicine with large text and time', () => {
    const onTakeMock = jest.fn().mockResolvedValue(undefined);
    const onSnoozeMock = jest.fn().mockResolvedValue(undefined);
    const onSkipMock = jest.fn();
    const onToggleModeMock = jest.fn();

    const { getByText } = render(
      <SeniorHomeView
        displayName="Ahmet Amca"
        todayReminders={[mockReminder]}
        onTakeMedicine={onTakeMock}
        onSnoozeMedicine={onSnoozeMock}
        onSkipMedicine={onSkipMock}
        onToggleSeniorMode={onToggleModeMock}
      />
    );

    expect(getByText('Aspirin')).toBeTruthy();
    expect(getByText('08:00')).toBeTruthy();
    expect(getByText('İLACI ALDIM')).toBeTruthy();
    expect(getByText('15 Dk Ertele')).toBeTruthy();
  });

  it('handles take and snooze button presses', async () => {
    const onTakeMock = jest.fn().mockResolvedValue(undefined);
    const onSnoozeMock = jest.fn().mockResolvedValue(undefined);
    const onSkipMock = jest.fn();
    const onToggleModeMock = jest.fn();

    const { getByText } = render(
      <SeniorHomeView
        displayName="Ahmet Amca"
        todayReminders={[mockReminder]}
        onTakeMedicine={onTakeMock}
        onSnoozeMedicine={onSnoozeMock}
        onSkipMedicine={onSkipMock}
        onToggleSeniorMode={onToggleModeMock}
      />
    );

    fireEvent.press(getByText('İLACI ALDIM'));
    expect(onTakeMock).toHaveBeenCalledWith('rt-1', 'med-1');

    fireEvent.press(getByText('15 Dk Ertele'));
    expect(onSnoozeMock).toHaveBeenCalledWith('rt-1', 'med-1');
  });

  it('triggers speech when Sesli Dinle is tapped', async () => {
    const { getByText } = render(
      <SeniorHomeView
        displayName="Ahmet Amca"
        todayReminders={[mockReminder]}
        onTakeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSnoozeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSkipMedicine={jest.fn()}
        onToggleSeniorMode={jest.fn()}
      />
    );

    fireEvent.press(getByText('Sesli Dinle'));
    expect(speakMedicineReminder).toHaveBeenCalledWith('Aspirin', '500mg', 'after_meal', 'tr');
  });

  it('renders all-done celebratory card when no pending reminders exist', () => {
    const { getByText } = render(
      <SeniorHomeView
        displayName="Ahmet Amca"
        todayReminders={[
          {
            ...mockReminder,
            log: {
              id: 'log-1',
              medicineId: 'med-1',
              reminderTimeId: 'rt-1',
              scheduledTime: '2026-08-21T08:00:00',
              status: 'taken',
            },
          },
        ]}
        onTakeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSnoozeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSkipMedicine={jest.fn()}
        onToggleSeniorMode={jest.fn()}
      />
    );

    expect(getByText('Tebrikler! Bekleyen İlacınız Yok')).toBeTruthy();
  });

  it('triggers mode toggle when Standart Mod pill is pressed', () => {
    const onToggleModeMock = jest.fn();
    const { getByText } = render(
      <SeniorHomeView
        displayName="Ahmet Amca"
        todayReminders={[mockReminder]}
        onTakeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSnoozeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSkipMedicine={jest.fn()}
        onToggleSeniorMode={onToggleModeMock}
      />
    );

    fireEvent.press(getByText('Standart Mod'));
    expect(onToggleModeMock).toHaveBeenCalledTimes(1);
  });

  it('renders low stock alert and handles onNavigateToPharmacy press', () => {
    const onPharmacyPressMock = jest.fn();
    const { getByText } = render(
      <SeniorHomeView
        displayName="Ahmet Amca"
        todayReminders={[mockReminder]}
        lowStockMedicines={[{ ...mockReminder.medicine, stockCount: 2, stockUnit: 'tablet' }]}
        onTakeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSnoozeMedicine={jest.fn().mockResolvedValue(undefined)}
        onSkipMedicine={jest.fn()}
        onToggleSeniorMode={jest.fn()}
        onNavigateToPharmacy={onPharmacyPressMock}
      />
    );

    expect(getByText('İlaç Stoğunuz Azaldı!')).toBeTruthy();
    expect(getByText('Aspirin (2 tablet)')).toBeTruthy();

    fireEvent.press(getByText('Nöbetçi Eczaneleri Bul'));
    expect(onPharmacyPressMock).toHaveBeenCalledTimes(1);
  });
});
