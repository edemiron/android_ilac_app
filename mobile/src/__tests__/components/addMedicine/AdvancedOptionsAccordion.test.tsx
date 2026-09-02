import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Platform: { OS: 'android' },
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
  LayoutAnimation: {
    configureNext: jest.fn(),
    Presets: { easeInEaseOut: {} },
  },
  UIManager: {
    setLayoutAnimationEnabledExperimental: jest.fn(),
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('../../../components/addMedicine', () => {
  const React = require('react');
  return {
    ScheduleSelector: () => React.createElement('Text', null, 'ScheduleSelector'),
    ImagePickerSection: () => React.createElement('Text', null, 'ImagePickerSection'),
    ColorPicker: () => React.createElement('Text', null, 'ColorPicker'),
    AdvancedSettingsSection: () => React.createElement('Text', null, 'AdvancedSettingsSection'),
    StockSection: () => React.createElement('Text', null, 'StockSection'),
    ExpirySection: () => React.createElement('Text', null, 'ExpirySection'),
  };
});

import { AdvancedOptionsAccordion } from '../../../screens/AddMedicineScreen/components/AdvancedOptionsAccordion';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { AddMedicineFormState } from '../../../types/addMedicine.types';

const mockColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#6c757d',
  primary: '#10b981',
  border: '#e9ecef',
  card: '#ffffff',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
  primaryLight: '#d1fae5',
} as unknown as ThemeColors;

const mockFormState: AddMedicineFormState = {
  name: 'Parol',
  dosage: '1 Tablet',
  dosageAmount: '1',
  medicineForm: 'tablet',
  frequency: 2,
  scheduleType: 'daily',
  specificDays: [],
  intervalDays: 2,
  cycleDaysOn: 21,
  cycleDaysOff: 7,
  endDate: null,
  instruction: 'after_meal',
  imageUri: undefined,
  selectedColor: '#10b981',
  category: undefined,
  vibrationPattern: 'default',
  requireBarcodeOnTake: false,
  stockEnabled: false,
  stockCount: 10,
  stockThreshold: 5,
  stockUnit: 'tablet',
  expiryDate: null,
  expiryReminderDays: 30,
  customTimes: ['09:00', '21:00'],
  useCustomTimes: false,
};

describe('AdvancedOptionsAccordion', () => {
  it('renders closed by default and toggles on click', () => {
    const { getByText, queryByText } = render(
      <AdvancedOptionsAccordion
        formState={mockFormState}
        isEditing={false}
        scheduleType="daily"
        specificDays={[]}
        intervalDays={2}
        cycleDaysOn={21}
        cycleDaysOff={7}
        endDate={null}
        onScheduleTypeChange={jest.fn()}
        onSpecificDaysChange={jest.fn()}
        onIntervalDaysChange={jest.fn()}
        onCycleChange={jest.fn()}
        onEndDateChange={jest.fn()}
        imageUri={undefined}
        onImageChange={jest.fn()}
        selectedColor="#10b981"
        onColorChange={jest.fn()}
        category={undefined}
        onCategoryChange={jest.fn()}
        onVibrationPatternChange={jest.fn()}
        stockEnabled={false}
        stockCount={10}
        stockThreshold={5}
        stockUnit="tablet"
        onStockEnabledChange={jest.fn()}
        onStockCountChange={jest.fn()}
        onStockThresholdChange={jest.fn()}
        onStockUnitChange={jest.fn()}
        expiryDate={null}
        expiryReminderDays={30}
        onExpiryDateChange={jest.fn()}
        onExpiryReminderDaysChange={jest.fn()}
        colors={mockColors}
        language="tr"
        labelExpiry="Son Kullanma Tarihi"
      />
    );

    expect(getByText('Gelişmiş Seçenekler (İsteğe Bağlı)')).toBeTruthy();
    expect(queryByText('StockSection')).toBeNull();

    // Toggle open
    fireEvent.press(getByText('Gelişmiş Seçenekler (İsteğe Bağlı)'));
    expect(getByText('StockSection')).toBeTruthy();
  });

  it('displays active badge when advanced options are present', () => {
    const { getByText } = render(
      <AdvancedOptionsAccordion
        formState={{ ...mockFormState, vibrationPattern: 'urgent' }}
        isEditing={false}
        scheduleType="daily"
        specificDays={[]}
        intervalDays={2}
        cycleDaysOn={21}
        cycleDaysOff={7}
        endDate={null}
        onScheduleTypeChange={jest.fn()}
        onSpecificDaysChange={jest.fn()}
        onIntervalDaysChange={jest.fn()}
        onCycleChange={jest.fn()}
        onEndDateChange={jest.fn()}
        imageUri="file:///test.jpg"
        onImageChange={jest.fn()}
        selectedColor="#10b981"
        onColorChange={jest.fn()}
        category="painkiller"
        onCategoryChange={jest.fn()}
        onVibrationPatternChange={jest.fn()}
        stockEnabled={true}
        stockCount={10}
        stockThreshold={5}
        stockUnit="tablet"
        onStockEnabledChange={jest.fn()}
        onStockCountChange={jest.fn()}
        onStockThresholdChange={jest.fn()}
        onStockUnitChange={jest.fn()}
        expiryDate={null}
        expiryReminderDays={30}
        onExpiryDateChange={jest.fn()}
        onExpiryReminderDaysChange={jest.fn()}
        colors={mockColors}
        language="tr"
        labelExpiry="Son Kullanma Tarihi"
      />
    );

    // imageUri + category + vibrationPattern + stockEnabled = 4 aktif
    expect(getByText('4 Aktif')).toBeTruthy();
  });
});
