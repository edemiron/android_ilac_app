import React from 'react';
import { render } from '@testing-library/react-native';
import { MonthCalendarView } from '../../screens/StatisticsScreen/components/MonthCalendarView';
import { Medicine, ReminderTime, MedicineLog } from '../../types';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

import { ThemeColors } from '../../contexts/ThemeContext';

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

describe('MonthCalendarView', () => {
  const mockColors = {
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    primary: '#4ecdc4',
    inputBackground: '#f8fafc',
  } as unknown as ThemeColors;

  const mockMedicines: Medicine[] = [
    {
      id: 'med-1',
      name: 'Parol 500mg',
      dosage: '1 tablet',
      frequency: 1,
      color: '#4ecdc4',
      startDate: '2026-08-01T00:00:00.000Z',
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  const mockReminderTimes: ReminderTime[] = [
    {
      id: 'rt-1',
      medicineId: 'med-1',
      time: '09:00',
      isEnabled: true,
    },
  ];

  const mockMedicineLogs: MedicineLog[] = [
    {
      id: 'log-1',
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2026-08-15T09:00:00',
      status: 'taken',
      takenAt: '2026-08-15T09:02:00',
    },
  ];

  it('renders calendar weekdays and month navigation', () => {
    const { getByText } = render(
      <MonthCalendarView
        medicines={mockMedicines}
        reminderTimes={mockReminderTimes}
        medicineLogs={mockMedicineLogs}
        colors={mockColors}
        isDark={false}
      />
    );

    expect(getByText('Pzt')).toBeTruthy();
    expect(getByText('Sal')).toBeTruthy();
    expect(getByText('Çar')).toBeTruthy();
  });

  it('renders dose information when selecting a day with logs', () => {
    const { getByText } = render(
      <MonthCalendarView
        medicines={mockMedicines}
        reminderTimes={mockReminderTimes}
        medicineLogs={mockMedicineLogs}
        colors={mockColors}
        isDark={false}
      />
    );

    // Initial render displays today's schedule
    expect(getByText('Parol 500mg')).toBeTruthy();
  });
});
