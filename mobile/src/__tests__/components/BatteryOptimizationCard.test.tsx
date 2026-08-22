import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BatteryOptimizationCard } from '../../components/common/BatteryOptimizationCard';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Platform: { OS: 'android' },
  NativeModules: {
    PlatformConstants: {
      Manufacturer: 'Xiaomi',
      Brand: 'Redmi',
    },
  },
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { primary: '#4ECDC4' },
    isDark: false,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

const mockShowAlert = jest.fn();
jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
  }),
}));

describe('BatteryOptimizationCard', () => {
  it('renders OEM warning title for Xiaomi device', () => {
    const { getByText } = render(<BatteryOptimizationCard />);

    expect(getByText('Alarmların Kesintisiz Çalması İçin')).toBeTruthy();
    expect(
      getByText('XIAOMI cihazınız alarmları uyutabilir. Pil kısıtlamasını kapatın.')
    ).toBeTruthy();
  });

  it('triggers full guide alert when guide button is pressed', () => {
    const { getByText } = render(<BatteryOptimizationCard />);

    fireEvent.press(getByText('Rehberi Gör & Ayarla'));
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Kesintisiz Alarm Rehberi',
      })
    );
  });
});
