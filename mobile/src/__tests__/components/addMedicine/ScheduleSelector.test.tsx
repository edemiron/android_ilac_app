import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScheduleSelector } from '../../../components/addMedicine/ScheduleSelector';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

import { ThemeColors } from '../../../contexts/ThemeContext';

describe('ScheduleSelector', () => {
  const mockColors = {
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    primary: '#4ecdc4',
    inputBackground: '#f8fafc',
  } as unknown as ThemeColors;

  it('renders all schedule types', () => {
    const onScheduleTypeChange = jest.fn();

    const { getByText } = render(
      <ScheduleSelector
        scheduleType="daily"
        specificDays={[1, 3, 5]}
        intervalDays={2}
        cycleDaysOn={21}
        cycleDaysOff={7}
        endDate={null}
        onScheduleTypeChange={onScheduleTypeChange}
        onSpecificDaysChange={jest.fn()}
        onIntervalDaysChange={jest.fn()}
        onCycleChange={jest.fn()}
        onEndDateChange={jest.fn()}
        colors={mockColors}
      />
    );

    expect(getByText('Her Gün')).toBeTruthy();
    expect(getByText('Belirli Günler')).toBeTruthy();
    expect(getByText('Aralıklı')).toBeTruthy();
    expect(getByText('Döngü (Kür)')).toBeTruthy();
  });

  it('triggers onScheduleTypeChange when tab is clicked', () => {
    const onScheduleTypeChange = jest.fn();

    const { getByText } = render(
      <ScheduleSelector
        scheduleType="daily"
        specificDays={[1, 3, 5]}
        intervalDays={2}
        cycleDaysOn={21}
        cycleDaysOff={7}
        endDate={null}
        onScheduleTypeChange={onScheduleTypeChange}
        onSpecificDaysChange={jest.fn()}
        onIntervalDaysChange={jest.fn()}
        onCycleChange={jest.fn()}
        onEndDateChange={jest.fn()}
        colors={mockColors}
      />
    );

    fireEvent.press(getByText('Belirli Günler'));
    expect(onScheduleTypeChange).toHaveBeenCalledWith('specific_days');
  });

  it('shows days of week selector when specific_days is selected', () => {
    const onSpecificDaysChange = jest.fn();

    const { getByText } = render(
      <ScheduleSelector
        scheduleType="specific_days"
        specificDays={[1, 3, 5]}
        intervalDays={2}
        cycleDaysOn={21}
        cycleDaysOff={7}
        endDate={null}
        onScheduleTypeChange={jest.fn()}
        onSpecificDaysChange={onSpecificDaysChange}
        onIntervalDaysChange={jest.fn()}
        onCycleChange={jest.fn()}
        onEndDateChange={jest.fn()}
        colors={mockColors}
      />
    );

    expect(getByText('Pzt')).toBeTruthy();
    expect(getByText('Sal')).toBeTruthy();

    fireEvent.press(getByText('Sal'));
    expect(onSpecificDaysChange).toHaveBeenCalledWith([1, 3, 5, 2]);
  });
});
